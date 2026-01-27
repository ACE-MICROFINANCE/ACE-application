import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapAdmin(row: any) {
    return { ...row, id: Number(row.id) };
  }

  async listAdmins(q?: string | null) {
    const query = q?.trim();
    const admins = await this.prisma.staffUser.findMany({
      where: {
        role: 'ADMIN',
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { fullName: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        createdAt: true,
      },
    });
    return admins.map((a) => this.mapAdmin(a));
  }

  async createAdmin(dto: CreateAdminDto) {
    const passwordHash = await hashPassword(dto.password);
    const admin = await this.prisma.staffUser.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: 'ADMIN',
        branchCode: null,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        createdAt: true,
      },
    });
    return this.mapAdmin(admin);
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const adminId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: adminId, role: 'ADMIN' } });
    if (!existing) throw new NotFoundException('Admin không tồn tại.');

    const data: any = {};
    if (dto.email) data.email = dto.email.toLowerCase();
    if (dto.fullName) data.fullName = dto.fullName;
    if (dto.password) data.passwordHash = await hashPassword(dto.password);

    const updated = await this.prisma.staffUser.update({
      where: { id: adminId },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        createdAt: true,
      },
    });
    return this.mapAdmin(updated);
  }

  async deleteAdmin(id: string) {
    const adminId = BigInt(id);
    const existing = await this.prisma.staffUser.findUnique({ where: { id: adminId, role: 'ADMIN' } });
    if (!existing) throw new NotFoundException('Admin không tồn tại.');

    await this.prisma.staffUser.delete({ where: { id: adminId } });
    return { success: true };
  }
}
