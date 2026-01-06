import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'; // CHANGED: stub validation
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util'; // CHANGED: create stub credential
import { BranchGroupMapService } from './branch-group-map.service'; // CHANGED: map group for staff dropdown

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly branchGroupMapService: BranchGroupMapService, // CHANGED: branch group mapping
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
      throw new NotFoundException('Customer not found');
    }

    const activeLoan = await this.prisma.loan.findFirst({
      where: { customerId: id, status: 'ACTIVE' },
      orderBy: [{ disbursementDate: 'desc' }],
      select: { loanCycle: true },
    }); // CHANGED: lấy vòng quay từ khoản vay ACTIVE mới nhất

    return {
      ...this.mapProfile(customer),
      loanCycle: activeLoan?.loanCycle ?? null, // CHANGED: trả về loanCycle để FE hiển thị ở tab account
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
        throw new NotFoundException('Staff user not found'); // CHANGED: staff not found
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
        throw new ConflictException('Customer with this memberNo already exists');
      }
      throw error;
    }
  }

  async createCustomerStub(memberNo: string, branchCode: string) {
    if (!branchCode) {
      throw new BadRequestException('Branch code is required'); // CHANGED: enforce branchCode for stub
    }
    const customer = await this.prisma.customer.upsert({
      where: { memberNo },
      update: {
        branchCode, // CHANGED: assign branchCode from staff
      },
      create: {
        memberNo,
        branchCode, // CHANGED: assign branchCode on stub create
        isActive: true,
      },
      include: { credential: true },
    });

    if (!customer.credential) {
      const defaultPassword =
        this.configService.get<string>('defaults.customerPassword') ?? '123456';
      const passwordHash = await hashPassword(defaultPassword);

      await this.prisma.customerCredential.create({
        data: {
          customerId: customer.id,
          passwordHash,
          mustChangePassword: true,
        },
      });
    }

    const refreshed = await this.prisma.customer.findUnique({
      where: { id: customer.id },
      include: { credential: true },
    });

    if (!refreshed) {
      throw new NotFoundException('Customer not found');
    }

    return this.mapProfile(refreshed);
  }

  async getGroupsForBranch(branchCode: string | null | undefined) {
    if (!branchCode) {
      throw new BadRequestException('Branch code is required'); // CHANGED: staff must have branch
    }
    return this.branchGroupMapService.listGroupsByBranchCode(branchCode); // CHANGED: map groups by branch
  }
}
