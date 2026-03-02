import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { BranchGroupMapService } from '../customers/branch-group-map.service';

@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchGroupMapService: BranchGroupMapService,
  ) {}

  private async mapBranchName(branchCode?: string | null) {
    const branch = await this.branchGroupMapService.resolveBranchByCode(branchCode);
    return branch?.branchName ?? null;
  }

  private async mapStaffUser(row: { id: bigint; branchCode?: string | null } & Record<string, unknown>) {
    return {
      ...row,
      id: Number(row.id),
      branchName: await this.mapBranchName(row.branchCode),
    };
  }

  async list(query?: { q?: string | null }) {
    const q = query?.q?.trim();
    const rows = await this.prisma.staffUser.findMany({
      where: q
        ? {
            OR: [{ email: { contains: q } }, { fullName: { contains: q } }],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return Promise.all(rows.map((row) => this.mapStaffUser(row)));
  }

  async listSsoByBranch(branchCode: string) {
    const rows = await this.prisma.staffUser.findMany({
      where: {
        role: 'SSO',
        isActive: true,
        branchCode,
      },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
      },
    });

    return Promise.all(rows.map((row) => this.mapStaffUser(row)));
  }

  async create(dto: CreateStaffUserDto) {
    if ((dto.role as string) === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không được tạo tài khoản SUPER_ADMIN tại API này.');
    }

    const roleNeedsBranch = dto.role === 'BM' || dto.role === 'BA' || dto.role === 'SSO';
    if (roleNeedsBranch && !dto.branchCode) {
      throw new BadRequestException('Nhân sự chi nhánh phải có mã chi nhánh.');
    }
    if (dto.role === 'ADMIN' && dto.branchCode) {
      throw new BadRequestException('Admin không được gán mã chi nhánh.');
    }
    if (dto.role === 'SSO' && !(dto.phoneNumber ?? '').trim()) {
      throw new BadRequestException('CCO bắt buộc phải nhập số điện thoại.');
    }

    const passwordToUse =
      dto.password && dto.password.length > 0
        ? dto.password
        : dto.role === 'SSO'
          ? Math.floor(100000 + Math.random() * 900000).toString()
          : null;
    if (!passwordToUse) {
      throw new BadRequestException('Mật khẩu bắt buộc đối với vai trò này.');
    }

    const passwordHash = await hashPassword(passwordToUse);
    const created = await this.prisma.staffUser.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        branchCode: dto.role === 'ADMIN' ? null : dto.branchCode ?? null,
        fullName: dto.fullName ?? null,
        phoneNumber: dto.role === 'SSO' ? dto.phoneNumber?.trim() || null : null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapStaffUser(created);
  }

  async update(id: string, dto: UpdateStaffUserDto) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.');
    }
    if (existing.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không được chỉnh sửa tài khoản SUPER_ADMIN.');
    }
    if (existing.role === 'SSO' && dto.role !== undefined) {
      throw new BadRequestException('Tài khoản SSO không được chuyển sang vai trò khác.');
    }

    const role = dto.role ?? existing.role;
    if ((role as string) === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không được gán quyền SUPER_ADMIN tại API này.');
    }

    const branchCode = role === 'ADMIN' ? null : dto.branchCode ?? existing.branchCode ?? null;
    const roleNeedsBranch = role === 'BM' || role === 'BA' || role === 'SSO';
    if (roleNeedsBranch && !branchCode) {
      throw new BadRequestException('Nhân sự chi nhánh phải có mã chi nhánh.');
    }
    if (dto.phoneNumber !== undefined && role !== 'SSO') {
      throw new BadRequestException('Chỉ được cập nhật số điện thoại cho vai trò SSO.');
    }

    const shouldBumpTokenVersion = dto.isActive !== undefined && dto.isActive !== existing.isActive;

    const updated = await this.prisma.staffUser.update({
      where: { id: staffId },
      data: {
        fullName: dto.fullName ?? undefined,
        email: dto.email?.toLowerCase() ?? undefined,
        role: dto.role ?? undefined,
        branchCode: dto.role ? (role === 'ADMIN' ? null : branchCode) : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber?.trim() || null : undefined,
        isActive: dto.isActive ?? undefined,
        ...(shouldBumpTokenVersion ? { tokenVersion: { increment: 1 } } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.mapStaffUser(updated);
  }

  async resetPassword(id: string, newPassword: string) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.');
    }
    if (existing.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không được đặt lại mật khẩu SUPER_ADMIN tại API này.');
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await this.prisma.staffUser.update({
      where: { id: staffId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return this.mapStaffUser(updated);
  }

  async setLockStatus(id: string, locked: boolean) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.');
    }
    if (existing.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không được khóa/mở khóa tài khoản SUPER_ADMIN.');
    }

    const updated = await this.prisma.staffUser.update({
      where: { id: staffId },
      data: {
        isActive: !locked,
        tokenVersion: { increment: 1 },
      },
      select: {
        id: true,
        email: true,
        role: true,
        branchCode: true,
        fullName: true,
        phoneNumber: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return this.mapStaffUser(updated);
  }

  async remove(id: string) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy nhân viên.');
    }
    if (existing.role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Không được xóa tài khoản SUPER_ADMIN.');
    }

    await this.prisma.staffUser.delete({ where: { id: staffId } });
    return { success: true };
  }

  listBranches() {
    return this.branchGroupMapService.listBranches();
  }
}
