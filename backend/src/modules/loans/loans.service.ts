import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, LoanInstallment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { removeVietnameseAccents } from '../../common/utils/string.utils';
import { QrPayload } from './dto/qr-payload.dto';
import { BijliClientService } from './bijli-client.service';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LOAN_SYNC_TTL_MS = 6 * 60 * 60 * 1000; // [BIJLI-LOAN] cache TTL 6 hours

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly bijliClientService: BijliClientService, // [BIJLI-LOAN] inject BIJLI client
  ) {}

  private startOfToday() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  // [BIJLI-LOAN] Asia/Bangkok start of today for due-date comparison
  private startOfTodayBangkok() {
    const now = new Date();
    const bangkokOffsetMs = 7 * 60 * 60 * 1000;
    const local = new Date(now.getTime() + bangkokOffsetMs);
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  }

  // [BIJLI-LOAN] parse number to Decimal safely
  private parseDecimal(value: unknown): Prisma.Decimal | null {
    if (value === null || value === undefined) return null;
    const raw = String(value).trim().replace(/,/g, '');
    if (!raw || raw === '0') return new Prisma.Decimal(0);
    if (!Number.isFinite(Number(raw))) return null;
    return new Prisma.Decimal(raw);
  }

  // [BIJLI-LOAN] flexible date parser for dd/MM/yyyy or MM/DD/YYYY
  private parseDateFlexible(value?: string | null, preferDMY = true): Date | null {
    if (!value) return null;
    const parts = value.split('/').map((p) => p.trim());
    if (parts.length !== 3) return null;
    const [a, b, c] = parts.map((p) => Number(p));
    if (!a || !b || !c) return null;
    let day = a;
    let month = b;
    const year = c < 100 ? 2000 + c : c;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      day = b;
      month = a;
    } else if (!preferDMY) {
      day = b;
      month = a;
    }
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  // [BIJLI-LOAN-RULE] loan type mapping from product name
  private getLoanType(productName?: string | null) {
    const name = (productName ?? '').toUpperCase();
    if (name.includes('BULLET')) return 'BULLET';
    return 'DEGRESSIVE';
  }

  // [BIJLI-LOAN-RULE] interest rate mapping from product name
  private getInterestRate(productName?: string | null) {
    const name = (productName ?? '').toUpperCase();
    if (name.includes('POOR')) return 13.8;
    return 16.8;
  }

  // [BIJLI-LOAN-RULE] loan type label for UI
  private getLoanTypeLabel(loanType?: string | null) {
    return loanType === 'BULLET' ? 'Trả gốc cuối kỳ' : 'Trả gốc lẫn lãi';
  }

  // [BIJLI-LOAN] cache stale check
  private isStale(lastSyncedAt?: Date | null) {
    if (!lastSyncedAt) return true;
    return Date.now() - lastSyncedAt.getTime() > LOAN_SYNC_TTL_MS;
  }

  private mapLoanResponse(
    loan: Prisma.LoanGetPayload<{ include: { installments: true; customer: true } }>,
    nextInstallment?: LoanInstallment | null,
  ) {
    const remainingPrincipal =
      loan.totalPrincipalOutstanding ?? loan.principalAmount ?? loan.principalAmount;

    const nextPayment = nextInstallment
      ? {
          dueDate: nextInstallment.dueDate,
          principalDue: Number(nextInstallment.principalDue),
          interestDue: Number(nextInstallment.interestDue),
          totalDue: Number(nextInstallment.principalDue) + Number(nextInstallment.interestDue), // [BIJLI-LOAN-RULE]
        }
      : undefined;

    // [BIJLI-LOAN] keep existing VietQR payload for current FE contract
    const bankBin = this.configService.get<string>('payment.bankBin') ?? '';
    const accountNumber = this.configService.get<string>('payment.accountNumber') ?? '';
    const accountName = this.configService.get<string>('payment.accountName') ?? '';

    let qrPayload: QrPayload | undefined;
    if (nextPayment) {
      const normalizedVillageName = removeVietnameseAccents(loan.customer.villageName || '').toUpperCase();
      const normalizedName = removeVietnameseAccents(loan.customer.fullName || '').toUpperCase();
      const description = `${normalizedName} ${normalizedVillageName} ${loan.customer.memberNo} `.trim();
      qrPayload = {
        bankBin,
        accountNumber,
        accountName,
        description,
        amount: nextPayment.totalDue, // [BIJLI-LOAN-RULE] amount uses total due
      };
    }

    // NOTE: old static QR string kept for reference
    // const qrPayload = nextPayment && `ACE|${loan.loanNo}|${nextPayment.dueDate.toISOString()}|${nextPayment.principalDue}`;

    return {
      loanNo: loan.loanNo,
      disbursementDate: loan.disbursementDate,
      principalAmount: Number(loan.principalAmount),
      remainingPrincipal: Number(remainingPrincipal),
      interestRate: Number(loan.interestRate),
      loanType: loan.loanType ?? this.getLoanType(loan.productName), // [BIJLI-LOAN-RULE]
      loanTypeLabel: this.getLoanTypeLabel(loan.loanType ?? this.getLoanType(loan.productName)), // [BIJLI-LOAN-RULE]
      nextPayment,
      qrPayload,
    };
  }

  private getNextInstallment(installments: LoanInstallment[]) {
    const today = this.startOfToday();
    return installments
      // [BIJLI-LOAN] pick next installment with amount due
      .filter((inst) => {
        const principal = Number(inst.principalDue ?? 0);
        const interest = Number(inst.interestDue ?? 0);
        return inst.dueDate >= today && (principal > 0 || interest > 0);
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
  }

  // [BIJLI-LOAN] Sync loan + schedule from BIJLI
  private async syncLoanFromBijli(customerId: bigint, memberNo: string) {
    const data = await this.bijliClientService.fetchMemberInfo(memberNo);
    if (!data) return;

    const loanNo = String(data.LoanNo ?? '').trim();
    if (!loanNo) return;

    const productName = data.ProductName ?? null;
    const loanType = this.getLoanType(productName); // [BIJLI-LOAN-RULE]
    // [BIJLI-LOAN] parse loanCycle safely
    const loanCycleRaw = data.LoanCycle ?? null;
    const loanCycleParsed =
      loanCycleRaw !== null && loanCycleRaw !== undefined
        ? Number.parseInt(String(loanCycleRaw), 10)
        : NaN;
    const loanCycle = Number.isNaN(loanCycleParsed) ? null : loanCycleParsed;
    const totalPrincipalOutstanding = this.parseDecimal(data.LoS);

    const scheduleRaw = Array.isArray(data.RepamentSchedule) ? data.RepamentSchedule : [];
    const parsedSchedule = scheduleRaw
      .map((item: any) => {
        const dueDate = this.parseDateFlexible(item.DueDate ?? item.dueDate, true);
        const principalDue = this.parseDecimal(item.Principal ?? item.principal);
        const interestDue = this.parseDecimal(item.Interest ?? item.interest);
        if (!dueDate) return null;
        return { dueDate, principalDue, interestDue };
      })
      .filter(Boolean) as { dueDate: Date; principalDue: Prisma.Decimal | null; interestDue: Prisma.Decimal | null }[];

    parsedSchedule.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const termInstallments = parsedSchedule.length || null;
    const maturityDate = parsedSchedule.length
      ? parsedSchedule[parsedSchedule.length - 1].dueDate
      : null;

    const principalAmount =
      parsedSchedule.length > 0
        ? parsedSchedule.reduce(
            (sum, item) => sum.plus(item.principalDue ?? 0),
            new Prisma.Decimal(0),
          )
        : totalPrincipalOutstanding ?? new Prisma.Decimal(0);

    const today = this.startOfTodayBangkok();
    // [BIJLI-LOAN] best-effort estimate: sum interest for due dates >= today
    const totalInterestOutstanding =
      parsedSchedule.length > 0
        ? parsedSchedule.reduce((sum, item) => {
            if (item.dueDate >= today) {
              return sum.plus(item.interestDue ?? 0);
            }
            return sum;
          }, new Prisma.Decimal(0))
        : null;

    const outstandingNumber = totalPrincipalOutstanding
      ? Number(totalPrincipalOutstanding)
      : Number(principalAmount ?? 0);
    const status = outstandingNumber <= 0 ? 'CLOSED' : 'ACTIVE';

    const loan = await this.prisma.loan.upsert({
      where: { loanNo },
      create: {
        customerId,
        loanNo,
        externalLoanId: data.ContNo ?? null,
        productName,
        loanType, // [BIJLI-LOAN-RULE]
        loanCycle,
        principalAmount,
        interestRate: this.getInterestRate(productName),
        termInstallments,
        maturityDate,
        totalPrincipalOutstanding,
        totalInterestOutstanding,
        status,
        lastSyncedAt: new Date(),
      },
      update: {
        customerId,
        externalLoanId: data.ContNo ?? null,
        productName,
        loanType, // [BIJLI-LOAN-RULE]
        loanCycle,
        principalAmount,
        interestRate: this.getInterestRate(productName),
        termInstallments,
        maturityDate,
        totalPrincipalOutstanding,
        totalInterestOutstanding,
        status,
        lastSyncedAt: new Date(),
      },
    });

    for (let i = 0; i < parsedSchedule.length; i += 1) {
      const installmentNo = i + 1;
      const item = parsedSchedule[i];
      await this.prisma.loanInstallment.upsert({
        where: {
          loanId_installmentNo: {
            loanId: loan.id,
            installmentNo,
          },
        },
        create: {
          loanId: loan.id,
          installmentNo,
          dueDate: item.dueDate,
          principalDue: item.principalDue ?? new Prisma.Decimal(0),
          interestDue: item.interestDue ?? new Prisma.Decimal(0),
          status: 'PENDING',
        },
        update: {
          dueDate: item.dueDate,
          principalDue: item.principalDue ?? new Prisma.Decimal(0),
          interestDue: item.interestDue ?? new Prisma.Decimal(0),
        },
      });
    }
  }

  async getActiveLoanWithNextInstallment(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const loan = await this.prisma.loan.findFirst({
      where: { customerId: id, status: 'ACTIVE' },
      include: { installments: true, customer: true },
      orderBy: [{ disbursementDate: 'desc' }],
    });

    if (!loan) {
      return null;
    }

    const nextInstallment = this.getNextInstallment(loan.installments);
    return { loan, nextInstallment };
  }

  async getCurrentLoan(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    // [BIJLI-LOAN] load customer for BIJLI memberNo
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    let result = await this.getActiveLoanWithNextInstallment(id);
    const needsSync = !result?.loan || this.isStale(result.loan.lastSyncedAt);

    if (needsSync) {
      // [BIJLI-LOAN] sync from BIJLI when missing or stale
      await this.syncLoanFromBijli(id, customer.memberNo);
      result = await this.getActiveLoanWithNextInstallment(id);
    }

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
