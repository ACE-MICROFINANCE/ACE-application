import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, GroupRequestStatus, GroupRequestType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';
import { BranchGroupMapService } from './branch-group-map.service'; // CHANGED: map group for staff dropdown
import { TempPasswordCryptoService } from '../../common/services/temp-password-crypto.service'; // CHANGED: temp password crypto
import { BijliCustomerSyncService } from './bijli-customer-sync.service'; // CHANGED: auto-sync BIJI on create account
import { normalizeGroupNameKey } from '../../common/utils/normalize-group-name.util';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchGroupMapService: BranchGroupMapService, // CHANGED: branch group mapping
    private readonly tempPasswordCryptoService: TempPasswordCryptoService, // CHANGED: temp password crypto
    private readonly bijliCustomerSyncService: BijliCustomerSyncService, // CHANGED: auto-sync BIJI on create account
  ) {}

  private async assertValidSso(branchCode: string, ssoId: number) {
    const sso = await this.prisma.staffUser.findUnique({
      where: { id: BigInt(ssoId) },
      select: { id: true, role: true, branchCode: true, isActive: true, fullName: true, email: true },
    });
    if (!sso || sso.role !== 'SSO' || sso.branchCode !== branchCode || sso.isActive !== true) {
      throw new BadRequestException('SSO không hợp lệ cho chi nhánh.');
    }
    return sso;
  }

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
    return await this.branchGroupMapService.listGroupsByBranchCode(branchCode); // CHANGED: map groups by branch
  }

  // STAFF: list groups with counts (DB-first)
  async listStaffGroupsWithCounts(
    staff: { role?: string | null; branchCode?: string | null },
    branchCode?: string,
  ) {
    const branchCodeResolved =
      staff?.role === 'BM' || staff?.role === 'BA'
        ? staff?.branchCode ?? branchCode ?? null
        : branchCode ?? null;
    if (!branchCodeResolved) {
      throw new BadRequestException('Mã chi nhánh là bắt buộc.');
    }
    if ((staff?.role === 'BM' || staff?.role === 'BA') && staff.branchCode && branchCode && staff.branchCode !== branchCode) {
      throw new ForbiddenException('Không được xem nhóm ngoài chi nhánh của bạn.');
    }

    const groups = await this.prisma.group.findMany({
      where: { branchCode: branchCodeResolved },
      orderBy: { groupName: 'asc' },
    });

    if (!groups.length) return [];

    const customerCounts = await this.prisma.customer.groupBy({
      by: ['branchCode', 'groupCode'],
      where: {
        branchCode: branchCodeResolved,
        groupCode: { in: groups.map((g) => g.groupCode) },
      },
      _count: { _all: true },
    });
    const customerCountMap = new Map<string, number>();
    customerCounts.forEach((c) => {
      customerCountMap.set(`${c.branchCode}::${c.groupCode}`, c._count._all);
    });

    const unmappedCounts = await this.prisma.customer.groupBy({
      by: ['groupNameKey'],
      where: {
        groupNameKey: { in: groups.map((g) => g.groupNameKey) },
        OR: [{ branchCode: null }, { groupCode: null }],
      },
      _count: { _all: true },
    });
    const unmappedMap = new Map<string, number>();
    unmappedCounts.forEach((c) => unmappedMap.set(c.groupNameKey ?? '', c._count._all));

    return groups.map((g) => ({
      id: Number(g.id),
      branchCode: g.branchCode,
      groupCode: g.groupCode,
      groupName: g.groupName,
      groupNameKey: g.groupNameKey,
      customerCount: customerCountMap.get(`${g.branchCode}::${g.groupCode}`) ?? 0,
      unmappedCustomerCount: unmappedMap.get(g.groupNameKey) ?? 0,
    }));
  }

  async createGroup(
    staff: { role?: string | null; branchCode?: string | null },
    dto: { branchCode: string; groupCode: string; groupName: string },
  ) {
    if (staff?.role !== 'BM') {
      throw new ForbiddenException('Chỉ BM được phép tạo nhóm.');
    }
    if (!staff.branchCode || staff.branchCode !== dto.branchCode) {
      throw new ForbiddenException('Không được tạo nhóm ngoài chi nhánh của bạn.');
    }
    const key = normalizeGroupNameKey(dto.groupName);
    if (!key) throw new BadRequestException('groupName không hợp lệ');
    const conflict = await this.prisma.group.findFirst({ where: { groupNameKey: key } });
    if (conflict) {
      throw new ConflictException({
        code: 'GROUP_NAME_KEY_CONFLICT',
        message: 'groupName conflicts after normalization',
        conflictGroup: { id: conflict.id, branchCode: conflict.branchCode, groupCode: conflict.groupCode, groupName: conflict.groupName },
      });
    }
    const created = await this.prisma.group.create({
      data: {
        branchCode: dto.branchCode,
        groupCode: dto.groupCode,
        groupName: dto.groupName,
        groupNameKey: key,
      },
    });
    this.branchGroupMapService.invalidateCache();
    return { ...created, id: Number(created.id) };
  }

  async updateGroup(
    staff: { role?: string | null; branchCode?: string | null },
    id: number,
    dto: { branchCode?: string; groupCode?: string; groupName?: string },
  ) {
    if (staff?.role !== 'BM') {
      throw new ForbiddenException('Chỉ BM được phép cập nhật nhóm.');
    }
    const existing = await this.prisma.group.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy nhóm.');
    if (!staff.branchCode || staff.branchCode !== existing.branchCode) {
      throw new ForbiddenException('Không được sửa nhóm ngoài chi nhánh của bạn.');
    }
    const nextBranchCode = dto.branchCode ?? existing.branchCode;
    const nextGroupName = dto.groupName ?? existing.groupName;
    const nextKey = normalizeGroupNameKey(nextGroupName);
    if (!nextKey) throw new BadRequestException('groupName không hợp lệ');
    const conflict = await this.prisma.group.findFirst({
      where: { groupNameKey: nextKey, NOT: { id } },
    });
    if (conflict) {
      throw new ConflictException({
        code: 'GROUP_NAME_KEY_CONFLICT',
        message: 'groupName conflicts after normalization',
        conflictGroup: { id: conflict.id, branchCode: conflict.branchCode, groupCode: conflict.groupCode, groupName: conflict.groupName },
      });
    }

    const updated = await this.prisma.group.update({
      where: { id },
      data: {
        branchCode: nextBranchCode,
        groupCode: dto.groupCode ?? undefined,
        groupName: dto.groupName ?? undefined,
        groupNameKey: nextKey,
      },
    });
    this.branchGroupMapService.invalidateCache();
    return { ...updated, id: Number(updated.id) };
  }

  private async assertGroupNameKeyConflict(
    key: string,
    opts?: { excludeGroupId?: number; excludeRequestId?: number },
  ) {
    const conflictGroup = await this.prisma.group.findFirst({
      where: {
        groupNameKey: key,
        ...(opts?.excludeGroupId ? { NOT: { id: opts.excludeGroupId } } : {}),
      },
    });
    if (conflictGroup) {
      throw new ConflictException({
        code: 'GROUP_NAME_KEY_CONFLICT',
        message: 'groupName conflicts after normalization',
        conflictGroup: {
          id: conflictGroup.id,
          branchCode: conflictGroup.branchCode,
          groupCode: conflictGroup.groupCode,
          groupName: conflictGroup.groupName,
        },
      });
    }

    const pendingReq = await this.prisma.groupRequest.findFirst({
      where: {
        proposedGroupNameKey: key,
        status: GroupRequestStatus.PENDING,
        ...(opts?.excludeRequestId ? { NOT: { id: opts.excludeRequestId } } : {}),
      },
    });
    if (pendingReq) {
      throw new ConflictException({
        code: 'GROUP_NAME_KEY_CONFLICT',
        message: 'groupName conflicts with pending request',
        conflictGroup: {
          id: pendingReq.id,
          branchCode: pendingReq.branchCode,
          groupCode: pendingReq.proposedGroupCode ?? undefined,
          groupName: pendingReq.proposedGroupName,
        },
      });
    }
  }

  // BA propose CREATE
  async proposeCreateGroupRequest(
    staff: { id?: string | null; role?: string | null; branchCode?: string | null },
    dto: { groupName: string; groupCode?: string; ssoId: number },
  ) {
    if (staff.role !== 'BA') {
      throw new ForbiddenException('Chỉ BA được phép tạo đề xuất.');
    }
    if (!staff.branchCode) {
      throw new BadRequestException('BA cần gán branchCode.');
    }
    await this.assertValidSso(staff.branchCode, dto.ssoId);
    const key = normalizeGroupNameKey(dto.groupName);
    if (!key) throw new BadRequestException('groupName không hợp lệ');
    await this.assertGroupNameKeyConflict(key);

    const created = await this.prisma.groupRequest.create({
      data: {
        type: GroupRequestType.CREATE,
        status: GroupRequestStatus.PENDING,
        branchCode: staff.branchCode,
        proposedGroupCode: dto.groupCode ?? null,
        proposedGroupName: dto.groupName,
        proposedGroupNameKey: key,
        proposedSsoId: BigInt(dto.ssoId),
        createdByStaffId: BigInt(staff.id ?? '0'),
      },
    });
    return {
      ...created,
      id: Number(created.id),
      targetGroupId: created.targetGroupId ? Number(created.targetGroupId) : null,
      createdByStaffId: Number(created.createdByStaffId),
      reviewedByStaffId: created.reviewedByStaffId ? Number(created.reviewedByStaffId) : null,
    };
  }

  // BA propose UPDATE
  async proposeUpdateGroupRequest(
    staff: { id?: string | null; role?: string | null; branchCode?: string | null },
    dto: { targetGroupId: number; groupName: string; groupCode?: string; ssoId: number },
  ) {
    if (staff.role !== 'BA') {
      throw new ForbiddenException('Chỉ BA được phép tạo đề xuất.');
    }
    const target = await this.prisma.group.findUnique({ where: { id: dto.targetGroupId } });
    if (!target) throw new NotFoundException('Không tìm thấy nhóm.');
    if (!staff.branchCode || staff.branchCode !== target.branchCode) {
      throw new ForbiddenException('Không được sửa nhóm ngoài chi nhánh của bạn.');
    }
    await this.assertValidSso(target.branchCode, dto.ssoId);
    const key = normalizeGroupNameKey(dto.groupName);
    if (!key) throw new BadRequestException('groupName không hợp lệ');

    // Nếu đã có request PENDING cho group này, BA được quyền bổ sung/ghi đè nội dung
    const existingPending = await this.prisma.groupRequest.findFirst({
      where: { targetGroupId: target.id, status: GroupRequestStatus.PENDING },
    });

    await this.assertGroupNameKeyConflict(key, {
      excludeGroupId: Number(target.id),
      excludeRequestId: existingPending ? Number(existingPending.id) : undefined,
    });

    if (existingPending) {
      const updated = await this.prisma.groupRequest.update({
        where: { id: existingPending.id },
        data: {
          proposedGroupCode: dto.groupCode ?? target.groupCode,
          proposedGroupName: dto.groupName,
          proposedGroupNameKey: key,
          proposedSsoId: BigInt(dto.ssoId),
          createdByStaffId: BigInt(staff.id ?? '0'), // ghi nhận BA hiện tại
        },
      });
      return {
        ...updated,
        id: Number(updated.id),
        targetGroupId: updated.targetGroupId ? Number(updated.targetGroupId) : null,
        createdByStaffId: Number(updated.createdByStaffId),
        reviewedByStaffId: updated.reviewedByStaffId ? Number(updated.reviewedByStaffId) : null,
      };
    }

    const created = await this.prisma.groupRequest.create({
      data: {
        type: GroupRequestType.UPDATE,
        status: GroupRequestStatus.PENDING,
        branchCode: target.branchCode,
        targetGroupId: target.id,
        proposedGroupCode: dto.groupCode ?? target.groupCode,
        proposedGroupName: dto.groupName,
        proposedGroupNameKey: key,
        proposedSsoId: BigInt(dto.ssoId),
        createdByStaffId: BigInt(staff.id ?? '0'),
      },
    });
    return {
      ...created,
      id: Number(created.id),
      targetGroupId: created.targetGroupId ? Number(created.targetGroupId) : null,
      createdByStaffId: Number(created.createdByStaffId),
      reviewedByStaffId: created.reviewedByStaffId ? Number(created.reviewedByStaffId) : null,
    };
  }

  // BA view own requests
  async listMyGroupRequests(staff: { id?: string | null; role?: string | null }) {
    if (staff.role !== 'BA') {
      throw new ForbiddenException('Chỉ BA được phép xem danh sách này.');
    }
    const now = new Date();
    const rows = await this.prisma.groupRequest.findMany({
      where: {
        createdByStaffId: BigInt(staff.id ?? '0'),
        NOT: {
          AND: [{ status: GroupRequestStatus.REJECTED }, { expiresAt: { lte: now } }],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const rank = (s: GroupRequestStatus) =>
      s === GroupRequestStatus.REJECTED ? 0 : s === GroupRequestStatus.PENDING ? 1 : 2;
    const sorted = rows.sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return Number(a.id - b.id);
    });
    return sorted.map((r) => ({
      ...r,
      id: Number(r.id),
      targetGroupId: r.targetGroupId ? Number(r.targetGroupId) : null,
      createdByStaffId: Number(r.createdByStaffId),
      reviewedByStaffId: r.reviewedByStaffId ? Number(r.reviewedByStaffId) : null,
      proposedSsoId: r.proposedSsoId ? Number(r.proposedSsoId) : null,
    }));
  }

  // BM list requests
  async listGroupRequestsForBranch(
    staff: { id?: string | null; role?: string | null; branchCode?: string | null },
    status?: string,
    branchCodeFromQuery?: string | null,
  ) {
    if (staff.role !== 'BM') {
      throw new ForbiddenException('Chỉ BM được phép xem danh sách này.');
    }
    const branchCodeResolved = staff.branchCode ?? branchCodeFromQuery ?? null;
    if (!branchCodeResolved) throw new BadRequestException('BM cần gán branchCode.');
    if (staff.branchCode && branchCodeFromQuery && staff.branchCode !== branchCodeFromQuery) {
      throw new ForbiddenException('Không được xem đề xuất ngoài chi nhánh của bạn.');
    }
    const statusFilter =
      status && Object.values(GroupRequestStatus).includes(status as GroupRequestStatus)
        ? (status as GroupRequestStatus)
        : GroupRequestStatus.PENDING;

    const rows = await this.prisma.groupRequest.findMany({
      where: { branchCode: branchCodeResolved, status: statusFilter },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => ({
      ...r,
      id: Number(r.id),
      targetGroupId: r.targetGroupId ? Number(r.targetGroupId) : null,
      createdByStaffId: Number(r.createdByStaffId),
      reviewedByStaffId: r.reviewedByStaffId ? Number(r.reviewedByStaffId) : null,
      proposedSsoId: r.proposedSsoId ? Number(r.proposedSsoId) : null,
    }));
  }

  // BM approve request
  async approveGroupRequest(
    staff: { id?: string | null; role?: string | null; branchCode?: string | null },
    id: number,
  ) {
    if (staff.role !== 'BM') throw new ForbiddenException('Chỉ BM được phép duyệt.');
    const req = await this.prisma.groupRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy đề xuất.');
    if (req.status !== GroupRequestStatus.PENDING) {
      throw new BadRequestException('Đề xuất không còn ở trạng thái chờ duyệt.');
    }
    if (!staff.branchCode || staff.branchCode !== req.branchCode) {
      throw new ForbiddenException('Không được duyệt đề xuất ngoài chi nhánh của bạn.');
    }

    await this.assertGroupNameKeyConflict(req.proposedGroupNameKey, {
      excludeGroupId: req.targetGroupId ? Number(req.targetGroupId) : undefined,
      excludeRequestId: Number(req.id),
    });
    if (!req.proposedSsoId) {
      throw new BadRequestException('Đề xuất thiếu SSO.');
    }
    await this.assertValidSso(req.branchCode, Number(req.proposedSsoId));

    let group;
    if (req.type === GroupRequestType.CREATE) {
      group = await this.prisma.group.create({
        data: {
          branchCode: req.branchCode,
          groupCode: req.proposedGroupCode ?? '',
          groupName: req.proposedGroupName,
          groupNameKey: req.proposedGroupNameKey,
          ssoId: req.proposedSsoId,
        },
      });
    } else {
      if (!req.targetGroupId) throw new BadRequestException('Đề xuất thiếu targetGroupId.');
      group = await this.prisma.group.update({
        where: { id: req.targetGroupId },
        data: {
          groupCode: req.proposedGroupCode ?? undefined,
          groupName: req.proposedGroupName,
          groupNameKey: req.proposedGroupNameKey,
          ssoId: req.proposedSsoId,
        },
      });
    }

    const updatedReq = await this.prisma.groupRequest.update({
      where: { id },
      data: {
        status: GroupRequestStatus.APPROVED,
        reviewedByStaffId: BigInt(staff.id ?? '0'),
        reviewedAt: new Date(),
        rejectReason: null,
        expiresAt: null,
      },
    });

    this.branchGroupMapService.invalidateCache();
    return {
      request: {
        ...updatedReq,
        id: Number(updatedReq.id),
        targetGroupId: updatedReq.targetGroupId ? Number(updatedReq.targetGroupId) : null,
        createdByStaffId: Number(updatedReq.createdByStaffId),
        reviewedByStaffId: updatedReq.reviewedByStaffId ? Number(updatedReq.reviewedByStaffId) : null,
      },
      group: group ? { ...group, id: Number(group.id) } : null,
    };
  }

  // BM reject request
  async rejectGroupRequest(
    staff: { id?: string | null; role?: string | null; branchCode?: string | null },
    id: number,
    reason?: string | null,
  ) {
    if (staff.role !== 'BM') throw new ForbiddenException('Chỉ BM được phép từ chối.');
    const req = await this.prisma.groupRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Không tìm thấy đề xuất.');
    if (req.status !== GroupRequestStatus.PENDING) {
      throw new BadRequestException('Đề xuất không còn ở trạng thái chờ duyệt.');
    }
    if (!staff.branchCode || staff.branchCode !== req.branchCode) {
      throw new ForbiddenException('Không được từ chối đề xuất ngoài chi nhánh của bạn.');
    }
    const updated = await this.prisma.groupRequest.update({
      where: { id },
      data: {
        status: GroupRequestStatus.REJECTED,
        reviewedByStaffId: BigInt(staff.id ?? '0'),
        reviewedAt: new Date(),
        rejectReason: reason ?? null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return {
      ...updated,
      id: Number(updated.id),
      targetGroupId: updated.targetGroupId ? Number(updated.targetGroupId) : null,
      createdByStaffId: Number(updated.createdByStaffId),
      reviewedByStaffId: updated.reviewedByStaffId ? Number(updated.reviewedByStaffId) : null,
    };
  }

  async listUnmappedGroups(
    staff: { role?: string | null; branchCode?: string | null },
    query: { q?: string | null; limit?: number; offset?: number },
  ) {
    const limit = query.limit && query.limit > 0 ? query.limit : 50;
    const offset = query.offset && query.offset > 0 ? query.offset : 0;
    const q = query.q?.trim();
    const where: Prisma.UnmappedGroupNameWhereInput | undefined = q
      ? {
          OR: [
            { rawGroupName: { contains: q, mode: 'insensitive' } },
            { groupNameKey: { contains: q.toUpperCase() } },
          ],
        }
      : undefined;

    const rows = await this.prisma.unmappedGroupName.findMany({
      where,
      orderBy: [{ lastSeenAt: 'desc' }, { count: 'desc' }],
      skip: offset,
      take: limit,
    });

    return rows.map((r) => ({ ...r, id: Number(r.id) }));
  }

  async backfillGroup(staff: { role?: string | null; branchCode?: string | null }, id: number) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Không tìm thấy nhóm.');
    if (staff?.role === 'BM' || staff?.role === 'BA') {
      if (!staff.branchCode || staff.branchCode !== group.branchCode) {
        throw new ForbiddenException('Không được backfill ngoài chi nhánh của bạn.');
      }
    }
    const candidateCount = await this.prisma.group.count({ where: { groupNameKey: group.groupNameKey } });
    if (candidateCount !== 1) {
      throw new ConflictException({
        code: 'GROUP_KEY_AMBIGUOUS',
        message: 'Cannot backfill due to ambiguous groupNameKey',
        candidateCount,
      });
    }

    const updated = await this.prisma.customer.updateMany({
      where: {
        groupNameKey: group.groupNameKey,
        OR: [{ branchCode: null }, { groupCode: null }],
      },
      data: {
        branchCode: group.branchCode,
        groupCode: group.groupCode,
      },
    });
    return { updatedCount: updated.count };
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
        tokenVersion: { increment: 1 },
        mustChangePassword: true,
        tempPasswordEncrypted: encrypted,
        tempPasswordIssuedAt: issuedAt,
        passwordUpdatedAt: new Date(),
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { customerId: customer.id, revokedAt: null },
      data: { revokedAt: new Date() },
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
      data: { isActive: !locked, tokenVersion: { increment: 1 } },
    });

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { isActive: !locked }, // CHANGED: keep login behavior consistent
    });

    await this.prisma.refreshToken.updateMany({
      where: { customerId: customer.id, revokedAt: null },
      data: { revokedAt: new Date() },
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
