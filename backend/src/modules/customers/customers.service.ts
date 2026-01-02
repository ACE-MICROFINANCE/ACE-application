import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private mapProfile(customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>) {
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
}
