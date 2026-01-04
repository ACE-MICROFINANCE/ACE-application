import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';

@Injectable()
export class StaffUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.staffUser.findMany({
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
  }

  async create(dto: CreateStaffUserDto) {
    if (dto.role === 'BRANCH_MANAGER' && !dto.branchCode) {
      throw new BadRequestException('Branch manager phai co branchCode'); // CHANGED: enforce branchCode
    }
    if (dto.role === 'ADMIN' && dto.branchCode) {
      throw new BadRequestException('Admin khong duoc gan branchCode'); // CHANGED: enforce admin rule
    }

    const passwordHash = await hashPassword(dto.password);
    return this.prisma.staffUser.create({
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
  }

  async update(id: string, dto: UpdateStaffUserDto) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Staff user not found');
    }

    const role = dto.role ?? existing.role;
    const branchCode =
      role === 'ADMIN' ? null : dto.branchCode ?? existing.branchCode ?? null;

    if (role === 'BRANCH_MANAGER' && !branchCode) {
      throw new BadRequestException('Branch manager phai co branchCode'); // CHANGED: enforce branchCode
    }

    return this.prisma.staffUser.update({
      where: { id: staffId },
      data: {
        fullName: dto.fullName ?? undefined,
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
  }

  async resetPassword(id: string, newPassword: string) {
    const staffId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
    if (!existing) {
      throw new NotFoundException('Staff user not found');
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
    });
  }
}
