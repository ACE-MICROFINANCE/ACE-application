import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BijliClientService } from './bijli-client.service';

@Injectable()
export class BijliCustomerSyncService {
  private readonly logger = new Logger(BijliCustomerSyncService.name); // [BIJLI-CUSTOMER] debug sync flow

  constructor(
    private readonly prisma: PrismaService,
    private readonly bijliClientService: BijliClientService,
  ) {}

  async syncMemberNo(memberNo: string): Promise<boolean> {
    this.logger.log(`[BIJLI-CUSTOMER] Sync start memberNo=${memberNo}`); // [BIJLI-CUSTOMER] debug start
    const data = await this.bijliClientService.fetchMemberInfo(memberNo);
    if (!data) return false;

    const mapped = this.mapBijliCustomer(data, memberNo);
    const { memberNo: normalizedMemberNo, ...updateData } = mapped;

    await this.prisma.customer.upsert({
      where: { memberNo: normalizedMemberNo },
      create: mapped,
      update: updateData,
    });

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
    const fullName = this.fixMojibakeUtf8(rawFullName);

    const gender = this.mapGender(this.normalizeString(data.Gender));

    const idCardNumber = this.normalizeString(data.IdProofNumber);

    // TODO: [BIJLI-CUSTOMER] confirm phone number field from BIJLI payload
    const phoneNumber = this.normalizeString(data.ContNo);

    const rawGroupName = this.normalizeString(data.GroupName);
    const groupName = rawGroupName ? this.fixMojibakeUtf8(rawGroupName) : null;
    const groupCode =
      this.normalizeString(data.GroupCode) ??
      this.parseGroupCodeFromGroupName(groupName); // TODO: [BIJLI-CUSTOMER] refine groupCode mapping

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
      membershipStartDate: membershipStartDate ?? null,
      lastSyncedAt: new Date(), // [BIJLI-CUSTOMER] cache sync timestamp
    };
  }

  private normalizeString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text.length > 0 ? text : null;
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
    if (normalized === 'female') return 'Nữ';
    if (normalized === 'male') return 'Nam';
    return null;
  }

  private fixMojibakeUtf8(value: string): string {
    if (!value) return value;
    if (!/[ÃÂá»]/.test(value)) return value;
    try {
      return Buffer.from(value, 'latin1').toString('utf8');
    } catch {
      return value;
    }
  }

  private parseGroupCodeFromGroupName(groupName?: string | null): string | null {
    if (!groupName) return null;
    const normalized = groupName.trim();
    if (!normalized) return null;
    const left = normalized.split(' - ')[0];
    const firstToken = left.split(' ')[0];
    return firstToken || null;
  }

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
