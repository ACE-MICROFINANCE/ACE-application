import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'; // CHANGED: stub validation
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword } from '../../utils/password.util'; // CHANGED: create stub credential

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

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
      branchCode: customer.branchCode ?? null, // CHANGED: include branchCode in profile
      branchName: customer.branchName ?? null, // CHANGED: include branchName in profile
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
}
