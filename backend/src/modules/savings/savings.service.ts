import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BijliClientService } from '../customers/bijli-client.service';

const SAVINGS_HISTORY_LIMIT = 0; // CHANGED: 0 = trả về toàn bộ lịch sử, đổi 12 để giới hạn 12 giao dịch gần nhất

type NormalizedTransaction = {
  date: Date;
  trnType: string;
  netAmount: number;
  deposit: number;
  withdrawal: number;
  index: number;
};

@Injectable()
export class SavingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bijliClientService: BijliClientService, // CHANGED: gọi BIJLI để lấy lịch sử giao dịch
  ) {}

  private mapBase(record: any) {
    return {
      type: record.type,
      principalAmount: Number(record.principalAmount),
      currentBalance: Number(record.currentBalance),
      interestAccrued: Number(record.interestAccrued),
      lastDepositAmount: record.lastDepositAmount !== null ? Number(record.lastDepositAmount) : null,
      lastDepositDate: record.lastDepositDate,
    };
  }

  // CHANGED: chuẩn hóa array từ BIJLI
  private normalizeArray(value: unknown): Record<string, unknown>[] {
    if (!value) return [];
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (typeof value === 'object') return [value as Record<string, unknown>];
    return [];
  }

  private normalizeString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
  }

  // CHANGED: parse ngày dd/MM/yyyy từ BIJLI (tránh Date đoán sai)
  private parseBijliDate(value: string | null): Date | null {
    if (!value) return null;
    const cleaned = value.split(' ')[0].trim();
    const parts = cleaned.split('/');
    if (parts.length !== 3) return null;
    const day = Number(parts[0]);
    const month = Number(parts[1]);
    const yearRaw = Number(parts[2]);
    if (!day || !month || !yearRaw) return null;
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  // CHANGED: parse số tiền từ BIJLI (string/number)
  private parseMoney(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const text = String(value).replace(/,/g, '').trim();
    if (!text) return null;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // CHANGED: parse số an toàn cho deposit/withdraw (fallback 0)
  private safeNumber(value: unknown): number {
    if (value === null || value === undefined) return 0;
    const text = String(value).replace(/,/g, '').trim();
    if (!text) return 0;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  // CHANGED: mô tả giao dịch theo hướng tiền, chỉ show code INT
  private getTransactionTitle(trnType: string | null, netAmount: number): string {
    const normalized = (trnType ?? '').trim().toUpperCase();
    if (normalized === 'INT') return 'Cộng lãi (INT)';
    if (netAmount > 0) return 'Chuyển tiền vào';
    if (netAmount < 0) return 'Chuyển tiền ra';
    return 'Giao dịch';
  }

  // CHANGED: chuẩn hóa giao dịch BIJLI
  private normalizeTransactions(raw: Record<string, unknown>[]): NormalizedTransaction[] {
    return raw
      .map((record, index) => {
        const trnDateText =
          this.normalizeString(record.TrnDate) ??
          this.normalizeString(record.TranDate) ??
          this.normalizeString(record.Date);
        const date = this.parseBijliDate(trnDateText);
        if (!date) return null;

        const trnType =
          this.normalizeString(record.TrnType) ??
          this.normalizeString(record.TrnTypeCode) ??
          'UNKNOWN';

        const deposit = this.safeNumber(
          record.DepositAmt ?? record.DepositAmount ?? record.Deposit ?? record.CrAmt,
        );
        const withdrawal = this.safeNumber(
          record.WithdrawalAmt ??
            record.WithdrawalAmount ??
            record.WithdrawAmt ??
            record.WithdrawAmount ??
            record.Withdraw ??
            record.DrAmt,
        );

        return {
          date,
          trnType,
          netAmount: deposit - withdrawal,
          deposit,
          withdrawal,
          index,
        };
      })
      .filter(Boolean) as NormalizedTransaction[];
  }

  // CHANGED: tính lịch sử giao dịch + số dư sau GD từ currentBalance root
  private computeHistory(raw: Record<string, unknown>[], currentBalance: number) {
    const normalized = this.normalizeTransactions(raw);
    if (!normalized.length) {
      return {
        history: [],
        lastTxnDate: null as Date | null,
        latestInt: null as NormalizedTransaction | null,
      };
    }

    const sorted = normalized
      .slice()
      .sort((a, b) => b.date.getTime() - a.date.getTime() || a.index - b.index);

    const latestInt = sorted.find((txn) => txn.trnType.trim().toUpperCase() === 'INT') ?? null;
    const limited =
      SAVINGS_HISTORY_LIMIT > 0 ? sorted.slice(0, SAVINGS_HISTORY_LIMIT) : sorted; // CHANGED: cấu hình giới hạn

    let runningBalance = currentBalance;
    const history = limited.map((txn) => {
      const balanceAfter = runningBalance; // CHANGED: số dư sau GD tính ngược từ currentBalance
      runningBalance -= txn.netAmount;

      return {
        date: txn.date,
        title: this.getTransactionTitle(txn.trnType, txn.netAmount),
        amount: txn.netAmount,
        runningBalance: balanceAfter,
        rawType: txn.trnType,
        deposit: txn.deposit,
        withdrawal: txn.withdrawal,
      };
    });

    return {
      history,
      lastTxnDate: sorted[0]?.date ?? null,
      latestInt,
    };
  }

  async getSavings(customerId: string | bigint) {
    const id = typeof customerId === 'string' ? BigInt(customerId) : customerId;
    const records = await this.prisma.customerSavings.findMany({
      where: { customerId: id },
    });

    const customer = await this.prisma.customer.findUnique({
      where: { id },
      select: { memberNo: true },
    });

    if (!customer?.memberNo) {
      return records.map((record) => this.mapBase(record));
    }

    let bijliData: Record<string, unknown> | null = null;
    try {
      bijliData = (await this.bijliClientService.fetchMemberInfo(customer.memberNo)) as
        | Record<string, unknown>
        | null; // CHANGED: lấy dữ liệu BIJLI phục vụ history
    } catch {
      bijliData = null;
    }

    if (!bijliData) {
      return records.map((record) => this.mapBase(record));
    }

    const baseByType = new Map<string, ReturnType<SavingsService['mapBase']>>(); // CHANGED: tránh dùng "this" trong type
    records.forEach((record) => {
      baseByType.set(record.type, this.mapBase(record));
    });
    const hasCompRecord = baseByType.has('COMPULSORY'); // CHANGED: chỉ render khi có dữ liệu
    const hasVolRecord = baseByType.has('VOLUNTARY'); // CHANGED: chỉ render khi có dữ liệu

    const compBalance = this.parseMoney(
      bijliData.CompSavings ?? bijliData.CompSaving ?? bijliData.CompBalance,
    );
    const volBalance = this.parseMoney(
      bijliData.VolSavings ?? bijliData.VollSavings ?? bijliData.VolBalance ?? bijliData.VolSaving,
    );

    // CHANGED: cập nhật số dư root vào DB (không lưu lịch sử)
    if (compBalance !== null) {
      await this.prisma.customerSavings.upsert({
        where: {
          customerId_type: {
            customerId: id,
            type: 'COMPULSORY',
          },
        },
        update: {
          currentBalance: compBalance,
          principalAmount: compBalance,
        },
        create: {
          customerId: id,
          type: 'COMPULSORY',
          currentBalance: compBalance,
          principalAmount: compBalance,
          interestAccrued: 0,
        },
      });
    }

    if (volBalance !== null) {
      await this.prisma.customerSavings.upsert({
        where: {
          customerId_type: {
            customerId: id,
            type: 'VOLUNTARY',
          },
        },
        update: {
          currentBalance: volBalance,
          principalAmount: volBalance,
        },
        create: {
          customerId: id,
          type: 'VOLUNTARY',
          currentBalance: volBalance,
          principalAmount: volBalance,
          interestAccrued: 0,
        },
      });
    }

    const compRaw = this.normalizeArray(bijliData.compSavings ?? bijliData.CompSavings);
    const volRaw = this.normalizeArray(
      bijliData.VollSavings ?? bijliData.VolSavings ?? bijliData.volSavings ?? bijliData.VOLLSAVINGS,
    );

    // CHANGED: compute history compulsory + voluntary từ BIJLI
    const compBase = baseByType.get('COMPULSORY') ?? {
      type: 'COMPULSORY',
      principalAmount: compBalance ?? 0,
      currentBalance: compBalance ?? 0,
      interestAccrued: 0,
      lastDepositAmount: null,
      lastDepositDate: null,
    };
    const volBase = baseByType.get('VOLUNTARY') ?? {
      type: 'VOLUNTARY',
      principalAmount: volBalance ?? 0,
      currentBalance: volBalance ?? 0,
      interestAccrued: 0,
      lastDepositAmount: null,
      lastDepositDate: null,
    };

    const compHistoryData = this.computeHistory(
      compRaw,
      compBalance ?? compBase.currentBalance,
    );
    const volHistoryData = this.computeHistory(volRaw, volBalance ?? volBase.currentBalance);

    const result = [];

    if (hasCompRecord || compBalance !== null || compHistoryData.history.length) {
      result.push({
        ...compBase,
        currentBalance: compBalance ?? compBase.currentBalance,
        transactions: compHistoryData.history, // CHANGED: trả history COMPULSORY
      });
    }

    if (hasVolRecord || volBalance !== null || volHistoryData.history.length) {
      const interestRun = volHistoryData.latestInt
        ? {
            amount: volHistoryData.latestInt.deposit,
            date: volHistoryData.latestInt.date,
          }
        : null;

      result.push({
        ...volBase,
        currentBalance: volBalance ?? volBase.currentBalance,
        lastTxnDate: volHistoryData.lastTxnDate,
        interestRun,
        transactions: volHistoryData.history, // CHANGED: trả history VOLUNTARY
      });
    }

    return result;
  }
}

/* NOTE: /savings lấy lịch sử giao dịch từ BIJLI cho cả bắt buộc & tự nguyện, không đổi schema. */
