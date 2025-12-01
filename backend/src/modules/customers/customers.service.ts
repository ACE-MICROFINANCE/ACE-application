import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(customerId: string) {
    return this.prisma.customer.findUnique({ where: { customerId } });
  }

  async findById(id: string) {
    return this.prisma.customer.findUnique({ where: { id } });
  }

  async updatePassword(id: string, newPassword: string) {
    const customer = await this.findById(id);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const passwordHash = await hashPassword(newPassword);
    return this.prisma.customer.update({
      where: { id },
      data: { passwordHash, mustChangePassword: false },
    });
  }
}
