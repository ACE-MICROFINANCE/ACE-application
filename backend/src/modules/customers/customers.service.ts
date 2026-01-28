import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';
import { BranchGroupMapService } from './branch-group-map.service'; // CHANGED: map group for staff dropdown
import { TempPasswordCryptoService } from '../../common/services/temp-password-crypto.service'; // CHANGED: temp password crypto
import { BijliCustomerSyncService } from './bijli-customer-sync.service'; // CHANGED: auto-sync BIJI on create account

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchGroupMapService: BranchGroupMapService, // CHANGED: branch group mapping
    private readonly tempPasswordCryptoService: TempPasswordCryptoService, // CHANGED: temp password crypto
    private readonly bijliCustomerSyncService: BijliCustomerSyncService, // CHANGED: auto-sync BIJI on create account
  ) {}

  private mapProfile(customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>) {
    return {
      id: Number(customer.id),
      actorKind: 'CUSTOMER', // CHANGED: return actorKind for /me response
      memberNo: customer.memberNo,
      fullName: customer.fullName,
      gender: customer.gender,
      idCardNumber: customer.idCardNumber,
      phoneNumber: customer.phoneNumber,
      locationType: customer.locationType,
      villageName: customer.villageName,
      groupCode: customer.groupCode,
      groupName: customer.groupName,
      branchCode: customer.branchCode ?? null, // CHANGED: include branchCode in profile
      branchName: customer.branchName ?? null, // CHANGED: include branchName in profile
      membershipStartDate: customer.membershipStartDate,
      mustChangePassword: customer.credential?.mustChangePassword ?? true,
      isActive: customer.credential?.isActive ?? true, // CHANGED: include login status for profile
      accessibilityEnabled: customer.accessibilityEnabled, // CHANGED: include accessibility flag
    };
  }

  private mapStaffProfile(staff: {
    id: bigint;
    email: string;
    role: string;
    branchCode?: string | null;
    fullName?: string | null;
    isActive: boolean;
  }) {
    return {
      id: Number(staff.id),
      actorKind: 'STAFF', // CHANGED: staff profile for /me
      email: staff.email,
      fullName: staff.fullName ?? null,
      role: staff.role,
      branchCode: staff.branchCode ?? null,
      isActive: staff.isActive,
    };
  }

  async getProfile(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { credential: true },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng.'); // CHANGED: Vietnamese message
    }

    const activeLoan = await this.prisma.loan.findFirst({
      where: { customerId: id, status: 'ACTIVE' },
      orderBy: [{ disbursementDate: 'desc' }],
      select: { loanCycle: true },
    }); // CHANGED: lấy vòng quay khoản vay ACTIVE mới nhất

    return {
      ...this.mapProfile(customer),
      loanCycle: activeLoan?.loanCycle ?? null, // CHANGED: trả về loanCycle để FE hiển thị
    };
  }

  async getActorProfile(user: {
    userId: string;
    actorKind?: 'CUSTOMER' | 'STAFF';
  }) {
    if (user.actorKind === 'STAFF') {
      const staffId = BigInt(user.userId);
      const staff = await this.prisma.staffUser.findUnique({
        where: { id: staffId },
        select: {
          id: true,
          email: true,
          role: true,
          branchCode: true,
          fullName: true,
          isActive: true,
        },
      }); // CHANGED: load staff profile for /me

      if (!staff) {
        throw new NotFoundException('Không tìm thấy nhân viên.'); // CHANGED: Vietnamese message
      }

      return this.mapStaffProfile(staff); // CHANGED: return staff profile
    }

    return this.getProfile(user.userId); // CHANGED: default customer profile
  }

  async createCustomer(
    data: Prisma.CustomerCreateInput,
    passwordHash: string,
    mustChangePassword = true,
  ) {
    try {
      const customer = await this.prisma.customer.create({
        data: {
          ...data,
          credential: {
            create: {
              passwordHash,
              mustChangePassword,
            },
          },
        },
        include: { credential: true },
      });
      return this.mapProfile(customer);
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tài khoản khách hàng đã tồn tại.'); // CHANGED: Vietnamese message
      }
      throw error;
    }
  }

  async createCustomerStub(memberNo: string, branchCode?: string | null) {
    const customer = await this.prisma.customer.upsert({
      where: { memberNo },
      update: {
        branchCode: branchCode ?? undefined, // CHANGED: assign branchCode when provided
      },
      create: {
        memberNo,
        branchCode: branchCode ?? undefined, // CHANGED: assign branchCode on stub create
        isActive: true,
      },
      include: { credential: true },
    });

    // CHANGED: /customers/stub is for profile sync only; do not create login credentials

    const refreshed = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      include: { credential: true },
    });

    if (!refreshed) {
      throw new NotFoundException('Không tìm thấy khách hàng.'); // CHANGED: Vietnamese message
    }

    return this.mapProfile(refreshed);
  }

  async getGroupsForBranch(branchCode: string | null | undefined) {
    if (!branchCode) {
      throw new BadRequestException('Mã chi nhánh là bắt buộc.'); // CHANGED: Vietnamese message
    }
    return this.branchGroupMapService.listGroupsByBranchCode(branchCode); // CHANGED: map groups by branch
  }

  // CHANGED: helper validate branch access for staff
  private ensureBranchAccess(
    customer: { branchCode?: string | null },
    staff: { role?: string; branchCode?: string | null },
  ) {
    if (staff.role === 'BM' && staff.branchCode) {
      if (customer.branchCode !== staff.branchCode) {
        throw new ForbiddenException('Bạn không có quyền thao tác khách hàng ngoài chi nhánh.');
      }
    }
  }

  // CHANGED: list/search customers for staff/admin
  async listCustomersForStaff(
    staff: { role?: string; branchCode?: string | null },
    q?: string,
  ) {
    const query = q?.trim();
    const where: Prisma.CustomerWhereInput = {
      ...(staff.role === 'BM' && staff.branchCode
        ? { branchCode: staff.branchCode }
        : {}),
      ...(query
        ? {
            OR: [
              { memberNo: { contains: query } },
              { fullName: { contains: query } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.customer.findMany({
      where,
      include: { credential: true },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((customer) => ({
      memberNo: customer.memberNo,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      groupName: customer.groupName,
      branchName: customer.branchName,
      accessibilityEnabled: customer.accessibilityEnabled,
      isActive: customer.credential?.isActive ?? false,
    }));
  }

  // CHANGED: staff/admin customer detail
  async getCustomerDetailForStaff(
    memberNo: string,
    staff: { role?: string; branchCode?: string | null },
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { memberNo },
      include: { credential: true },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }

    this.ensureBranchAccess(customer, staff);

    let tempPassword: string | null = null;
    if (customer.credential?.mustChangePassword && customer.credential?.tempPasswordEncrypted) {
      try {
        tempPassword = this.tempPasswordCryptoService.decrypt(
          customer.credential.tempPasswordEncrypted,
        );
      } catch {
        tempPassword = null;
      }
    }

    return {
      memberNo: customer.memberNo,
      fullName: customer.fullName,
      phoneNumber: customer.phoneNumber,
      branchCode: customer.branchCode ?? null,
      branchName: customer.branchName ?? null,
      groupCode: customer.groupCode ?? null,
      groupName: customer.groupName ?? null,
      accessibilityEnabled: customer.accessibilityEnabled,
      credential: customer.credential
        ? {
            isActive: customer.credential.isActive,
            mustChangePassword: customer.credential.mustChangePassword,
            tempPassword,
          }
        : null,
    };
  }

  // CHANGED: create customer account (credential)
  async createCustomerAccountForStaff(
    memberNo: string,
    initialPassword: string,
    staff: { role?: string; branchCode?: string | null },
  ) {
    let customer = await this.prisma.customer.findUnique({
      where: { memberNo },
      include: { credential: true },
    });

    if (!customer) {
      const synced = await this.bijliCustomerSyncService.syncMemberNo(memberNo); // CHANGED: auto-sync BIJI khi tạo account
      if (!synced) {
        throw new BadRequestException('Hệ thống BIJI chưa ghi nhận khách hàng này.'); // CHANGED: l?i r? r?ng n?u BIJI kh?ng c?
      }
      customer = await this.prisma.customer.findUnique({
        where: { memberNo },
        include: { credential: true },
      }); // CHANGED: l?y l?i sau khi sync
      if (!customer) {
        throw new BadRequestException('Hệ thống BIJI chưa ghi nhận khách hàng này.'); // CHANGED
      }
    }
    this.ensureBranchAccess(customer, staff);

    if (customer.credential) {
      throw new ConflictException('Tài khoản khách hàng đã tồn tại.');
    }

    const hashed = await hashPassword(initialPassword);
    const issuedAt = new Date();
    const encrypted = this.tempPasswordCryptoService.encrypt(initialPassword);

    await this.prisma.customerCredential.create({
      data: {
        customerId: customer.id,
        passwordHash: hashed,
        mustChangePassword: true,
        isActive: true,
        tempPasswordEncrypted: encrypted,
        tempPasswordIssuedAt: issuedAt,
      },
    });

    return { success: true };
  }

  // CHANGED: reset customer password by staff/admin
  async resetCustomerPasswordForStaff(
    memberNo: string,
    newPassword: string,
    staff: { role?: string; branchCode?: string | null },
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { memberNo },
      include: { credential: true },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }

    this.ensureBranchAccess(customer, staff);

    const hashed = await hashPassword(newPassword);
    const issuedAt = new Date();
    const encrypted = this.tempPasswordCryptoService.encrypt(newPassword);

    await this.prisma.customerCredential.upsert({
      where: { customerId: customer.id },
      create: {
        customerId: customer.id,
        passwordHash: hashed,
        mustChangePassword: true,
        isActive: true,
        tempPasswordEncrypted: encrypted,
        tempPasswordIssuedAt: issuedAt,
      },
      update: {
        passwordHash: hashed,
        mustChangePassword: true,
        tempPasswordEncrypted: encrypted,
        tempPasswordIssuedAt: issuedAt,
        passwordUpdatedAt: new Date(),
      },
    });

    return { success: true, temporaryPassword: newPassword };
  }

  // CHANGED: lock/unlock customer account
  async setCustomerLockForStaff(
    memberNo: string,
    locked: boolean,
    staff: { role?: string; branchCode?: string | null },
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { memberNo },
      include: { credential: true },
    });

    if (!customer || !customer.credential) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }

    this.ensureBranchAccess(customer, staff);

    await this.prisma.customerCredential.update({
      where: { customerId: customer.id },
      data: { isActive: !locked },
    });

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { isActive: !locked }, // CHANGED: keep login behavior consistent
    });

    return { success: true };
  }

  // CHANGED: toggle accessibility flag
  async setCustomerAccessibilityForStaff(
    memberNo: string,
    enabled: boolean,
    staff: { role?: string; branchCode?: string | null },
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { memberNo },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng.');
    }

    this.ensureBranchAccess(customer, staff);

    await this.prisma.customer.update({
      where: { memberNo },
      data: { accessibilityEnabled: enabled },
    });

    return { success: true };
  }
}
