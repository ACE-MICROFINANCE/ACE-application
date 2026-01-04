import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BijliClientService } from './bijli-client.service';
import { formatVietnameseName } from '../../common/utils/string.utils';
import { BranchGroupMapService } from './branch-group-map.service'; // CHANGED: map GroupName -> GroupCode/branch

@Injectable()
export class BijliCustomerSyncService {
  private readonly logger = new Logger(BijliCustomerSyncService.name); // [BIJLI-CUSTOMER] debug sync flow

  constructor(
    private readonly prisma: PrismaService,
    private readonly bijliClientService: BijliClientService,
    private readonly branchGroupMapService: BranchGroupMapService, // CHANGED: resolve group mapping
  ) {}

  async syncMemberNo(
    memberNo: string,
    payload?: Record<string, unknown> | null,
  ): Promise<boolean> {
    this.logger.log(`[BIJLI-CUSTOMER] Sync start memberNo=${memberNo}`); // [BIJLI-CUSTOMER] debug start
    const data = payload ?? (await this.bijliClientService.fetchMemberInfo(memberNo)); // CHANGED: reuse BIJLI payload
    if (!data) return false;

    const mapped = this.mapBijliCustomer(data, memberNo);
    const { memberNo: normalizedMemberNo, ...updateData } = mapped;

    const customer = await this.prisma.customer.upsert({
      where: { memberNo: normalizedMemberNo },
      create: mapped,
      update: updateData,
    });

    await this.syncSavingsFromBijli(customer.id, data); // CHANGED: dong bo so du + lich su tiet kiem tu BIJLI

    this.logger.log(`[BIJLI-CUSTOMER] Sync success memberNo=${normalizedMemberNo}`); // [BIJLI-CUSTOMER] debug success
    return true;
  }

  private mapBijliCustomer(data: Record<string, unknown>, fallbackMemberNo: string) {
    const bijliMemberNo = this.normalizeString(data.MemberNo);
    const memberNo = fallbackMemberNo; // [BIJLI-CUSTOMER] keep input memberNo as canonical key
    if (bijliMemberNo && bijliMemberNo !== fallbackMemberNo) {
      this.logger.warn(
        `[BIJLI-CUSTOMER] BIJLI MemberNo=${bijliMemberNo} differs from input=${fallbackMemberNo}. Using input as key.`,
      ); // [BIJLI-CUSTOMER] debug mismatch
    }

    const rawFullName =
      this.normalizeString(data.MemberName) ??
      this.composeName(
        this.normalizeString(data.LastNM),
        this.normalizeString(data.MidNm),
        this.normalizeString(data.FirstNm),
      ) ??
      memberNo;
    const fullNameRaw = this.fixMojibakeUtf8(rawFullName);
    const fullName = formatVietnameseName(fullNameRaw);

    const gender = this.mapGender(this.normalizeString(data.Gender));

    const idCardNumber = this.normalizeString(data.IdProofNumber);

    // TODO: [BIJLI-CUSTOMER] confirm phone number field from BIJLI payload
    const phoneNumber = this.normalizeString(data.ContNo);

    const rawGroupName = this.normalizeString(data.GroupName);
    const groupName = rawGroupName ? this.fixMojibakeUtf8(rawGroupName) : null;
    const resolvedGroup = groupName
      ? this.branchGroupMapService.resolveGroupName(groupName, { memberNo })
      : null; // CHANGED: map GroupName from static JSON
    const groupCode = resolvedGroup?.found ? resolvedGroup.groupCode ?? null : null; // CHANGED: do not fallback to raw GroupCode
    const branchCode = resolvedGroup?.found ? resolvedGroup.branchId ?? null : null; // CHANGED: map branchId
    const branchName = resolvedGroup?.found ? resolvedGroup.branchName ?? null : null; // CHANGED: map branchName

    const rawVillageName =
      this.normalizeString(data.VillageName) ?? this.normalizeString(data.Village);
    const villageName = rawVillageName ? this.fixMojibakeUtf8(rawVillageName) : null;

    const locationType =
      this.normalizeString(data.LocationType) ??
      (villageName && villageName.trim().length > 0 ? 'Rural' : 'Urban'); // TODO: [BIJLI-CUSTOMER] confirm location rules

    const membershipStartDate = this.parseDateFlexible(
      this.normalizeString(data.AdmissionDate) ??
        this.normalizeString(data.MembershipStartDate) ??
        this.normalizeString(data.membershipStartDate),
    );

    return {
      memberNo,
      fullName,
      gender: gender ?? null,
      idCardNumber: idCardNumber ?? null,
      phoneNumber: phoneNumber ?? null,
      locationType: locationType ?? null,
      villageName: villageName ?? null,
      groupCode: groupCode ?? null,
      groupName: groupName ?? null,
      branchCode: branchCode ?? null, // CHANGED: save branchId from mapping
      branchName: branchName ?? null, // CHANGED: save branchName from mapping
      membershipStartDate: membershipStartDate ?? null,
      lastSyncedAt: new Date(), // [BIJLI-CUSTOMER] cache sync timestamp
    };
  }

  // CHANGED: dong bo so du + lich su tiet kiem VOLUNTARY tu BIJLI
  private async syncSavingsFromBijli(customerId: bigint, data: Record<string, unknown>) {
    const compBalance = this.parseMoney(
      data.CompSavings ?? data.CompSaving ?? data.CompBalance,
    );
    const volBalance = this.parseMoney(
      data.VolSavings ?? data.VollSavings ?? data.VolBalance ?? data.VolSaving,
    );

    if (compBalance !== null) {
      await this.prisma.customerSavings.upsert({
        where: {
          customerId_type: {
            customerId,
            type: 'COMPULSORY',
          },
        },
        update: {
          currentBalance: compBalance, // CHANGED: cap nhat tong so du bat buoc tu BIJLI
          principalAmount: compBalance,
        },
        create: {
          customerId,
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
            customerId,
            type: 'VOLUNTARY',
          },
        },
        update: {
          currentBalance: volBalance, // CHANGED: cap nhat tong so du tu nguyen tu BIJLI
          principalAmount: volBalance,
        },
        create: {
          customerId,
          type: 'VOLUNTARY',
          currentBalance: volBalance,
          principalAmount: volBalance,
          interestAccrued: 0,
        },
      });
    }

    const voluntaryRaw = this.normalizeArray(
      data.VollSavings ?? data.VolSavings ?? data.volSavings ?? data.VOLLSAVINGS,
    );

    if (!voluntaryRaw.length) return;

    const mapped = voluntaryRaw
      .map((item) => {
        const record = item as Record<string, unknown>;
        const trnDateText =
          this.normalizeString(record.TrnDate) ?? this.normalizeString(record.TranDate);
        const trnDate = this.parseDateFlexible(trnDateText, true);
        if (!trnDate) return null;

        const trnType =
          this.normalizeString(record.TrnType) ??
          this.normalizeString(record.TrnTypeCode) ??
          'UNKNOWN';
        const depositAmount =
          this.parseMoney(
            record.DepositAmt ??
              record.DepositAmount ??
              record.Deposit ??
              record.CrAmt,
          ) ?? 0;
        const withdrawalAmount =
          this.parseMoney(
            record.WithdrawalAmt ?? // CHANGED: BIJLI dùng key WithdrawalAmt
              record.WithdrawalAmount ?? // CHANGED: fallback nếu BIJLI đổi tên field
              record.WithdrawAmt ??
              record.WithdrawAmount ??
              record.Withdraw ??
              record.DrAmt,
          ) ?? 0;

        return {
          trnDate,
          trnType,
          depositAmount,
          withdrawalAmount,
        };
      })
      .filter(Boolean) as Array<{
      trnDate: Date;
      trnType: string;
      depositAmount: number;
      withdrawalAmount: number;
    }>;

    if (!mapped.length) return;

    const occurrenceMap = new Map<string, number>();
    const customerKey = customerId.toString();

    const tasks = mapped.map((txn) => {
      const baseKey = `${customerKey}:VOLUNTARY:${txn.trnDate.toISOString()}:${txn.trnType}:${txn.depositAmount}:${txn.withdrawalAmount}`;
      const occurrence = (occurrenceMap.get(baseKey) ?? 0) + 1;
      occurrenceMap.set(baseKey, occurrence);
      const externalKey = `${baseKey}:${occurrence}`; // CHANGED: externalKey idempotent

      return this.prisma.customerSavingsTransaction.upsert({
        where: { externalKey },
        create: {
          customerId,
          savingsType: 'VOLUNTARY',
          trnDate: txn.trnDate,
          trnType: txn.trnType,
          depositAmount: txn.depositAmount,
          withdrawalAmount: txn.withdrawalAmount,
          externalKey,
        },
        update: {
          trnDate: txn.trnDate,
          trnType: txn.trnType,
          depositAmount: txn.depositAmount,
          withdrawalAmount: txn.withdrawalAmount,
        },
      });
    });

    await this.prisma.$transaction(tasks);
  }

  // CHANGED: chuan hoa danh sach giao dich tu payload BIJLI
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

  // CHANGED: parse so tien tu BIJLI (string/number)
  private parseMoney(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const text = String(value).replace(/,/g, '').trim();
    if (!text) return null;
    const parsed = Number(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private composeName(
    lastName?: string | null,
    middleName?: string | null,
    firstName?: string | null,
  ): string | null {
    const parts = [lastName, middleName, firstName].filter(Boolean) as string[];
    if (!parts.length) return null;
    return parts.join(' ');
  }

  private mapGender(raw?: string | null): string | null {
    if (!raw) return null;
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'female') return 'Nữ'; // CHANGED: sua chu Viet dung UTF-8
    if (normalized === 'male') return 'Nam';
    return null;
  }

  private fixMojibakeUtf8(value: string): string {
    if (!value) return value;
    if (!/[\u00c3\u00c2]/.test(value)) return value;
    try {
      return Buffer.from(value, 'latin1').toString('utf8');
    } catch {
      return value;
    }
  }

  // CHANGED: legacy parseGroupCodeFromGroupName removed from active mapping (static JSON now).
  // private parseGroupCodeFromGroupName(groupName?: string | null): string | null {
  //   if (!groupName) return null;
  //   const normalized = groupName.trim();
  //   if (!normalized) return null;
  //   const left = normalized.split(' - ')[0];
  //   const firstToken = left.split(' ')[0];
  //   return firstToken || null;
  // }

  private parseDateFlexible(value?: string | null, preferDMY = true): Date | null {
    if (!value) return null;
    const cleaned = value.split(' ')[0];
    const parts = cleaned.split(/[\/-]/).map((part) => part.trim());
    if (parts.length < 3) return null;

    const [p1, p2, p3] = parts;
    if (!p1 || !p2 || !p3) return null;

    let day: number;
    let month: number;
    let year: number;

    if (p1.length === 4) {
      year = Number(p1);
      month = Number(p2);
      day = Number(p3);
    } else {
      const a = Number(p1);
      const b = Number(p2);
      const c = Number(p3);
      if (!a || !b || !c) return null;
      year = c < 100 ? 2000 + c : c;

      if (a > 12) {
        day = a;
        month = b;
      } else if (b > 12) {
        day = b;
        month = a;
      } else if (preferDMY) {
        day = a;
        month = b;
      } else {
        day = b;
        month = a;
      }
    }

    if (day < 1 || day > 31 || month < 1 || month > 12) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }
}

/* NOTE: Cap nhat bijli-customer-sync de dong bo so du va lich su tiet kiem VOLUNTARY; sua mapGender va them parseMoney/normalizeArray. */
