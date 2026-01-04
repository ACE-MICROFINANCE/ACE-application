import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, LoanInstallment } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { removeVietnameseAccents } from '../../common/utils/string.utils';
import { inferDaysFromFirstInterest, inferDisbursementDate } from '../../common/utils/loan-date.utils'; // CHANGED: infer disbursement date
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

  private normalizeArray(value: unknown): Record<string, unknown>[] {
    // CHANGED: normalize BIJLI arrays for collection parsing
    if (!value) return [];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (typeof value === 'object') return [value as Record<string, unknown>];
    return [];
  }

  private startOfDayBangkokForDate(date: Date) {
    // CHANGED: start of day in Asia/Ho_Chi_Minh for a given date
    const bangkokOffsetMs = 7 * 60 * 60 * 1000;
    const local = new Date(date.getTime() + bangkokOffsetMs);
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
  }

  private parseAmountNumber(value: unknown): number {
    // CHANGED: parse Decimal-like values to number safely
    const decimal = this.parseDecimal(value);
    return decimal ? Number(decimal) : 0;
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

  private differenceInCalendarDaysUtc(dateLeft: Date, dateRight: Date) {
    // CHANGED: tính chênh lệch ngày theo UTC để tránh lệch timezone
    const leftUtc = Date.UTC(dateLeft.getUTCFullYear(), dateLeft.getUTCMonth(), dateLeft.getUTCDate());
    const rightUtc = Date.UTC(dateRight.getUTCFullYear(), dateRight.getUTCMonth(), dateRight.getUTCDate());
    return Math.round((leftUtc - rightUtc) / MS_PER_DAY);
  }

  private getLoanPaymentTypeLabel(productName: string | null | undefined, installments: LoanInstallment[]) {
    // CHANGED: chỉ áp dụng cho ProductName có "DEGRESSIVE" (không phân biệt hoa/thường)
    if (!productName || !productName.toUpperCase().includes('DEGRESSIVE')) return null;

    const dueDates = (installments ?? [])
      .map((i) => i.dueDate)
      .filter((d): d is Date => d instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime());
    if (dueDates.length < 2) return null;

    const gapsDays: number[] = [];
    for (let i = 1; i < dueDates.length; i += 1) {
      const gap = this.differenceInCalendarDaysUtc(dueDates[i], dueDates[i - 1]); // CHANGED: differenceInCalendarDays
      if (gap > 0) gapsDays.push(gap);
    }
    if (gapsDays.length < 1) return null;

    const ratio28 = gapsDays.filter((gap) => gap <= 28).length / gapsDays.length; // CHANGED: tỉ lệ gap <= 28 ngày
    return ratio28 >= 0.6 ? 'Trả gốc lãi hàng kỳ' : 'Trả dần linh hoạt';
  }

  private computeLateAmount(
    installments: LoanInstallment[] | null | undefined,
    bijliData?: Record<string, unknown> | null,
  ) {
    // CHANGED: compute lateAmount from schedule vs BIJLI collection
    if (!installments?.length || !bijliData) return 0;

    const now = new Date();
    const totalDueUntilNow = installments.reduce((sum, inst) => {
      const dueStart = this.startOfDayBangkokForDate(inst.dueDate);
      if (dueStart <= now) {
        const principal = Number(inst.principalDue ?? 0);
        const interest = Number(inst.interestDue ?? 0);
        return sum + principal + interest;
      }
      return sum;
    }, 0);

    const rawCollection =
      (bijliData as Record<string, unknown>).LoanCollection ??
      (bijliData as Record<string, unknown>).LoanCollections ??
      (bijliData as Record<string, unknown>).loanCollection ??
      (bijliData as Record<string, unknown>).loanCollections ??
      (bijliData as Record<string, unknown>).Collection ??
      (bijliData as Record<string, unknown>).Collections ??
      null;

    const collection = this.normalizeArray(rawCollection)
      .map((item) => {
        const trnDate = this.parseDateFlexible(String(item.TrnDate ?? item.trnDate ?? ''), true);
        if (!trnDate) return null;
        const principal = this.parseAmountNumber(
          item.Principal ?? item.principal ?? item.PrincipalAmt ?? item.principalAmt,
        );
        const interest = this.parseAmountNumber(
          item.Interest ?? item.interest ?? item.InterestAmt ?? item.interestAmt,
        );
        return { trnDate, amount: principal + interest };
      })
      .filter(Boolean) as { trnDate: Date; amount: number }[];

    if (!collection.length) return 0;

    collection.sort((a, b) => a.trnDate.getTime() - b.trnDate.getTime()); // CHANGED: sort collection by TrnDate

    const totalPaidUntilNow = collection.reduce((sum, item) => {
      if (item.trnDate <= now) return sum + item.amount;
      return sum;
    }, 0);

    const lateAmount = Math.max(0, totalDueUntilNow - totalPaidUntilNow);
    return lateAmount;
  }

  // [BIJLI-LOAN] cache stale check
  private isStale(lastSyncedAt?: Date | null) {
    if (!lastSyncedAt) return true;
    return Date.now() - lastSyncedAt.getTime() > LOAN_SYNC_TTL_MS;
  }

  private mapLoanResponse(
    loan: Prisma.LoanGetPayload<{ include: { installments: true; customer: true } }>,
    nextInstallment?: LoanInstallment | null,
    options?: { lateAmount?: number; qrEnabled?: boolean; qrAmount?: number }, // CHANGED: bổ sung lateAmount + QR rule
  ) {
    const remainingPrincipal =
      loan.totalPrincipalOutstanding ?? loan.principalAmount ?? loan.principalAmount;

    const termInstallments =
      loan.termInstallments ?? (loan.installments?.length ? loan.installments.length : null); // CHANGED: tính tổng số kỳ để FE hiển thị

    const today = this.startOfToday(); // CHANGED: dùng mốc hôm nay nhất quán với logic nextPayment
    const remainingInstallments = loan.installments?.length
      ? loan.installments.filter((inst) => {
          const status = String(inst.status ?? '').toUpperCase();
          const principal = Number(inst.principalDue ?? 0);
          const interest = Number(inst.interestDue ?? 0);
          return (
            status !== 'PAID' &&
            inst.dueDate >= today &&
            (principal > 0 || interest > 0)
          );
        }).length
      : null; // CHANGED: tính số kỳ còn lại (fallback theo dueDate do chưa có PAID status)

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

    const lateAmount = options?.lateAmount ?? 0; // CHANGED: lateAmount từ BE
    const qrEnabled = options?.qrEnabled ?? false; // CHANGED: bật QR theo rule late/đến hạn
    const qrAmount = options?.qrAmount ?? nextPayment?.totalDue ?? 0; // CHANGED: số tiền QR theo rule mới

    let qrPayload: QrPayload | undefined;
    if (qrEnabled) {
      const normalizedVillageName = removeVietnameseAccents(loan.customer.villageName || '').toUpperCase();
      const normalizedName = removeVietnameseAccents(loan.customer.fullName || '').toUpperCase();
      const description = `${normalizedName} ${normalizedVillageName} ${loan.customer.memberNo} `.trim();
      qrPayload = {
        bankBin,
        accountNumber,
        accountName,
        description,
        amount: qrAmount, // CHANGED: amount dùng lateAmount hoặc totalDue khi đến hạn
      };
    }

    // NOTE: old static QR string kept for reference
    // const qrPayload = nextPayment && `ACE|${loan.loanNo}|${nextPayment.dueDate.toISOString()}|${nextPayment.principalDue}`;

    const loanPaymentTypeLabel = this.getLoanPaymentTypeLabel(loan.productName, loan.installments);

    let disbursementDateInferred: Date | null = null;
    let firstInterestDays: number | null = null;
    const firstInterestInstallment = loan.installments
      ?.filter((inst) => Number(inst.interestDue ?? 0) > 0)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];
    if (firstInterestInstallment) {
      const principalDisbursed = Number(loan.principalAmount ?? 0);
      const interestFirstPeriod = Number(firstInterestInstallment.interestDue ?? 0);
      const annualRatePct = Number(loan.interestRate ?? 0);
      if (principalDisbursed > 0 && interestFirstPeriod > 0 && annualRatePct > 0) {
        firstInterestDays = inferDaysFromFirstInterest({
          principalDisbursed,
          interestFirstPeriod,
          annualRatePct,
          basisDate: firstInterestInstallment.dueDate, // CHANGED: use due date for day basis
          dayCountConvention: 'ACT_365F',
        }); // CHANGED: infer days from first interest
        if (firstInterestDays > 0) {
          disbursementDateInferred = inferDisbursementDate(
            firstInterestInstallment.dueDate,
            firstInterestDays,
          ); // CHANGED: infer disbursement date
        }
      }
    }
 // CHANGED: phân loại hình thức trả nợ (DEGRESSIVE)

    return {
      memberNo: loan.customer?.memberNo, // CHANGED: bổ sung mã số khách hàng cho FE hiển thị
      loanNo: loan.loanNo,
      disbursementDate: loan.disbursementDate,
      disbursementDateInferred, // CHANGED: inferred disbursement date (runtime only)
      firstInterestDays, // CHANGED: inferred days from first interest
      principalAmount: Number(loan.principalAmount),
      remainingPrincipal: Number(remainingPrincipal),
      interestRate: Number(loan.interestRate),
      loanType: loan.loanType ?? this.getLoanType(loan.productName), // [BIJLI-LOAN-RULE]
      loanTypeLabel: this.getLoanTypeLabel(loan.loanType ?? this.getLoanType(loan.productName)), // [BIJLI-LOAN-RULE]
      loanPaymentTypeLabel, // CHANGED: nhãn "hình thức trả nợ" để FE chỉ hiển thị
      termInstallments, // CHANGED: tổng số kỳ để FE hiển thị dưới "Hạn tới"
      remainingInstallments, // CHANGED: số kỳ còn lại để FE hiển thị dưới "Hạn tới"
      lateAmount, // CHANGED: số tiền chậm trả để FE hiển thị
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
  private async syncLoanFromBijli(
    customerId: bigint,
    memberNo: string,
    payload?: Record<string, unknown> | null,
  ) {
    const data = payload ?? (await this.bijliClientService.fetchMemberInfo(memberNo)); // CHANGED: reuse BIJLI payload when available
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

    let bijliData: Record<string, unknown> | null = null; // CHANGED: cache BIJLI payload for lateAmount + QR rule
    try {
      bijliData = (await this.bijliClientService.fetchMemberInfo(customer.memberNo)) as
        | Record<string, unknown>
        | null;
    } catch {
      bijliData = null;
    }

    let result = await this.getActiveLoanWithNextInstallment(id);
    const needsSync = !result?.loan || this.isStale(result.loan.lastSyncedAt);

    if (needsSync) {
      // [BIJLI-LOAN] sync from BIJLI when missing or stale
      await this.syncLoanFromBijli(id, customer.memberNo, bijliData); // CHANGED: reuse BIJLI payload when available
      result = await this.getActiveLoanWithNextInstallment(id);
    }

    if (!result) {
      throw new NotFoundException('No active loan found');
    }

    const lateAmount = this.computeLateAmount(result.loan.installments, bijliData); // CHANGED: compute lateAmount from schedule vs collection
    const nextInstallment = result.nextInstallment ?? null;
    const nextTotalDue = nextInstallment
      ? Number(nextInstallment.principalDue) + Number(nextInstallment.interestDue)
      : 0;
    const nextDueStart = nextInstallment
      ? this.startOfDayBangkokForDate(nextInstallment.dueDate)
      : null;
    const now = new Date();
    const qrEnabled =
      lateAmount > 0 || Boolean(nextInstallment && nextDueStart && now >= nextDueStart); // CHANGED: QR rule (late first, else open at 0h dueDate)
    const qrAmount = lateAmount > 0 ? lateAmount : qrEnabled ? nextTotalDue : 0; // CHANGED: QR amount uses lateAmount or next total due

    return this.mapLoanResponse(result.loan, result.nextInstallment, {
      lateAmount,
      qrEnabled,
      qrAmount,
    });
  }

  async createLoanQr(customerId: string | bigint, amount: number) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const result = await this.getActiveLoanWithNextInstallment(id);
    if (!result) {
      throw new NotFoundException('No active loan found');
    }

    let bijliData: Record<string, unknown> | null = null; // CHANGED: fetch BIJLI for lateAmount
    try {
      bijliData = (await this.bijliClientService.fetchMemberInfo(
        result.loan.customer.memberNo,
      )) as Record<string, unknown> | null;
    } catch {
      bijliData = null;
    }

    const lateAmount = this.computeLateAmount(result.loan.installments, bijliData); // CHANGED: compute lateAmount from schedule vs collection
    const nextInstallment = result.nextInstallment ?? null;
    const nextTotalDue = nextInstallment
      ? Number(nextInstallment.principalDue) + Number(nextInstallment.interestDue)
      : 0;
    const nextDueStart = nextInstallment
      ? this.startOfDayBangkokForDate(nextInstallment.dueDate)
      : null;
    const now = new Date();
    const qrEnabled =
      lateAmount > 0 || Boolean(nextInstallment && nextDueStart && now >= nextDueStart); // CHANGED: QR rule (late first, else open at 0h dueDate)
    if (!qrEnabled) {
      throw new BadRequestException('Bạn hiện chưa đến kỳ thanh toán');
    }

    const amountDueNow = lateAmount > 0 ? lateAmount : nextTotalDue; // CHANGED: amountDueNow follows rule
    if (!amountDueNow || amountDueNow <= 0) {
      throw new BadRequestException('Không có số tiền phải trả');
    }

    const amountNumber = Number(amount);
    if (!Number.isFinite(amountNumber) || !Number.isInteger(amountNumber) || amountNumber <= 0) {
      throw new BadRequestException('Số tiền không hợp lệ');
    }
    if (amountNumber < 1000) {
      throw new BadRequestException('Số tiền tối thiểu là 1.000 VND');
    }
    if (amountNumber > amountDueNow) {
      throw new BadRequestException('Số tiền vượt quá số tiền phải trả hiện tại');
    }

    const bankBin = this.configService.get<string>('payment.bankBin') ?? '';
    const accountNumber = this.configService.get<string>('payment.accountNumber') ?? '';
    const accountName = this.configService.get<string>('payment.accountName') ?? '';
    const normalizedVillageName = removeVietnameseAccents(result.loan.customer.villageName || '').toUpperCase();
    const normalizedName = removeVietnameseAccents(result.loan.customer.fullName || '').toUpperCase();
    const description = `${normalizedName} ${normalizedVillageName} ${result.loan.customer.memberNo} `.trim();
    const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact.png?accountName=${encodeURIComponent(
      accountName,
    )}&addInfo=${encodeURIComponent(description)}&amount=${Math.round(amountNumber)}`; // CHANGED: VietQR image url with custom amount

    return { qrImageUrl, amount: amountNumber };
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
