import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SavingsService {
  constructor(private readonly prisma: PrismaService) {}

  private map(record: any) {
    return {
      type: record.type,
      principalAmount: Number(record.principalAmount),
      currentBalance: Number(record.currentBalance),
      interestAccrued: Number(record.interestAccrued),
      lastDepositAmount: record.lastDepositAmount !== null ? Number(record.lastDepositAmount) : null,
      lastDepositDate: record.lastDepositDate,
    };
  }

  async getSavings(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const records = await this.prisma.customerSavings.findMany({
      where: { customerId: id },
    });
    return records.map((record) => this.map(record));
  }
}
