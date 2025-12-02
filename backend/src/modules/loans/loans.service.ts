import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, LoanInstallment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private mapLoanResponse(
    loan: Prisma.LoanGetPayload<{ include: { installments: true } }>,
    nextInstallment?: LoanInstallment | null,
  ) {
    const remainingPrincipal =
      loan.totalPrincipalOutstanding ?? loan.principalAmount ?? loan.principalAmount;

    const nextPayment = nextInstallment
      ? {
          dueDate: nextInstallment.dueDate,
          principalDue: Number(nextInstallment.principalDue),
          interestDue: Number(nextInstallment.interestDue),
        }
      : undefined;

    const qrPayload =
      nextPayment &&
      `ACE|${loan.loanNo}|${nextPayment.dueDate.toISOString()}|${nextPayment.principalDue}`;

    return {
      loanNo: loan.loanNo,
      disbursementDate: loan.disbursementDate,
      principalAmount: Number(loan.principalAmount),
      remainingPrincipal: Number(remainingPrincipal),
      interestRate: Number(loan.interestRate),
      nextPayment,
      qrPayload,
    };
  }

  private getNextInstallment(installments: LoanInstallment[]) {
    const today = this.startOfToday();
    return installments
      .filter((inst) => inst.dueDate >= today)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  }

  async getActiveLoanWithNextInstallment(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const loan = await this.prisma.loan.findFirst({
      where: { customerId: id, status: 'ACTIVE' },
      include: { installments: true },
      orderBy: [{ disbursementDate: 'desc' }],
    });

    if (!loan) {
      return null;
    }

    const nextInstallment = this.getNextInstallment(loan.installments);
    return { loan, nextInstallment };
  }

  async getCurrentLoan(customerId: string | bigint) {
    const result = await this.getActiveLoanWithNextInstallment(customerId);
    if (!result) {
      throw new NotFoundException('No active loan found');
    }
    return this.mapLoanResponse(result.loan, result.nextInstallment);
  }

  async getLoanReminder(customerId: string | bigint) {
    const result = await this.getActiveLoanWithNextInstallment(customerId);
    if (!result || !result.nextInstallment) {
      return null;
    }
    const today = this.startOfToday();
    const daysUntilDue = Math.ceil(
      (result.nextInstallment.dueDate.getTime() - today.getTime()) / MS_PER_DAY,
    );

    return {
      loanNo: result.loan.loanNo,
      nextDueDate: result.nextInstallment.dueDate,
      nextPrincipalDue: Number(result.nextInstallment.principalDue),
      nextInterestDue: Number(result.nextInstallment.interestDue),
      daysUntilDue,
    };
  }
}
