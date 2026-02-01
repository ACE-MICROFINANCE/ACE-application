import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { BranchGroupMapService } from '../customers/branch-group-map.service'; // CHANGED: resolve branch name

@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchGroupMapService: BranchGroupMapService, // CHANGED: resolve branch info
  ) {}

  private async mapBranchName(branchCode?: string | null) {
    const branch = await this.branchGroupMapService.resolveBranchByCode(branchCode);
    return branch?.branchName ?? null; // CHANGED: map branchName from static map
  }

  private async mapStaffUser(row: { id: bigint; branchCode?: string | null } & Record<string, unknown>) {
    return {
      ...row,
      id: Number(row.id), // CHANGED: convert BigInt to number for JSON response
      branchName: await this.mapBranchName(row.branchCode), // CHANGED: include branchName in response
    };
  }

  async list(query?: { q?: string | null }) {
    const q = query?.q?.trim();
    const rows = await this.prisma.staffUser.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q } },
              { fullName: { contains: q } },
            ],
          }
        : undefined, // CHANGED: optional search by email/fullName
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const mapped = await Promise.all(rows.map((row) => this.mapStaffUser(row)));
    return mapped; // CHANGED: map BigInt + branchName
  }

  async create(dto: CreateStaffUserDto) {
    const roleNeedsBranch = dto.role === 'BM' || dto.role === 'BA';
    if (roleNeedsBranch && !dto.branchCode) {
      throw new BadRequestException('Nhân sự chi nhánh phải có mã chi nhánh.'); // CHANGED: Vietnamese message
    }
    if (dto.role === 'ADMIN' && dto.branchCode) {
      throw new BadRequestException('Admin không được gán mã chi nhánh.'); // CHANGED: Vietnamese message
    }

    const passwordHash = await hashPassword(dto.password);
    const created = await this.prisma.staffUser.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        branchCode: dto.role === 'ADMIN' ? null : dto.branchCode ?? null,
        fullName: dto.fullName ?? null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return this.mapStaffUser(created); // CHANGED: map BigInt + branchName
  }

  async update(id: string, dto: UpdateStaffUserDto) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.'); // CHANGED: Vietnamese message
    }

    const role = dto.role ?? existing.role;
    const branchCode = role === 'ADMIN' ? null : dto.branchCode ?? existing.branchCode ?? null;
    const roleNeedsBranch = role === 'BM' || role === 'BA';
    if (roleNeedsBranch && !branchCode) {
      throw new BadRequestException('Nhân sự chi nhánh phải có mã chi nhánh.'); // CHANGED: Vietnamese message
    }

    const updated = await this.prisma.staffUser.update({
      where: { id: staffId },
      data: {
        fullName: dto.fullName ?? undefined,
        email: dto.email?.toLowerCase() ?? undefined, // CHANGED: allow update email
        role: dto.role ?? undefined,
        branchCode: dto.role ? (role === 'ADMIN' ? null : branchCode) : undefined,
        isActive: dto.isActive ?? undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return this.mapStaffUser(updated); // CHANGED: map BigInt + branchName
  }

  async resetPassword(id: string, newPassword: string) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.'); // CHANGED: Vietnamese message
    }

    const passwordHash = await hashPassword(newPassword);
    return this.prisma.staffUser.update({
      where: { id: staffId },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        isActive: true,
        updatedAt: true,
      },
    }).then((row) => this.mapStaffUser(row)); // CHANGED: map BigInt + branchName
  }

  async setLockStatus(id: string, locked: boolean) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.'); // CHANGED: Vietnamese message
    }

    return this.prisma.staffUser.update({
      where: { id: staffId },
      data: { isActive: !locked }, // CHANGED: lock/unlock via isActive
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        isActive: true,
        updatedAt: true,
      },
    }).then((row) => this.mapStaffUser(row)); // CHANGED: map BigInt + branchName
  }

  async remove(id: string) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.'); // CHANGED: Vietnamese message
    }

    await this.prisma.staffUser.delete({ where: { id: staffId } }); // CHANGED: delete staff user
    return { success: true };
  }

  listBranches() {
    return this.branchGroupMapService.listBranches(); // CHANGED: expose branch list for admin UI
  }
}
