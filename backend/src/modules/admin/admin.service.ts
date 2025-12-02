import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword, generateNumericPassword } from '../../utils/password.util';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private mapCustomer(customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>) {
    return {
      id: Number(customer.id),
      memberNo: customer.memberNo,
      fullName: customer.fullName,
      gender: customer.gender,
      idCardNumber: customer.idCardNumber,
      phoneNumber: customer.phoneNumber,
      locationType: customer.locationType,
      villageName: customer.villageName,
      groupCode: customer.groupCode,
      groupName: customer.groupName,
      membershipStartDate: customer.membershipStartDate,
      mustChangePassword: customer.credential?.mustChangePassword ?? true,
    };
  }

  async createCustomer(dto: CreateCustomerDto) {
    const tempPassword = generateNumericPassword();
    const passwordHash = await hashPassword(tempPassword);

    try {
      const created = await this.prisma.customer.create({
        data: {
          memberNo: dto.memberNo,
          fullName: dto.fullName,
          gender: dto.gender,
          idCardNumber: dto.idCardNumber,
          phoneNumber: dto.phoneNumber,
          locationType: dto.locationType,
          villageName: dto.villageName,
          groupCode: dto.groupCode,
          groupName: dto.groupName,
          membershipStartDate: dto.membershipStartDate ? new Date(dto.membershipStartDate) : undefined,
          credential: {
            create: {
              passwordHash,
              mustChangePassword: true,
            },
          },
        },
        include: { credential: true },
      });

      return {
        customer: this.mapCustomer(created),
        temporaryPassword: tempPassword,
      };
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('memberNo must be unique');
      }
      throw error;
    }
  }

  async resetPassword(id: string | number) {
    const customerId = typeof id === 'number' ? BigInt(id) : BigInt(id);
    const existing = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!existing) {
      throw new NotFoundException('Customer not found');
    }

    const tempPassword = generateNumericPassword();
    const passwordHash = await hashPassword(tempPassword);

    await this.prisma.customerCredential.upsert({
      where: { customerId },
      create: {
        customerId,
        passwordHash,
        mustChangePassword: true,
      },
      update: {
        passwordHash,
        mustChangePassword: true,
        passwordUpdatedAt: new Date(),
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { temporaryPassword: tempPassword };
  }
}
