import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { normalizeGroupNameKey } from '../../common/utils/normalize-group-name.util';

export type ContactItem = {
  type: 'HOTLINE' | 'AGRI' | 'LIVESTOCK' | 'SOCIAL' | 'SOCIAL_OFFICER' | string;
  label: string;
  phone: string;
};

export type ContactsResponse = {
  branchCode: string;
  contacts: ContactItem[];
  socialPhone: string | null;
};

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);
  private readonly contactsByBranch: Record<string, ContactItem[]> = {};
  private readonly contactsByGroup: Record<string, ContactItem[]> = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const raw = this.configService.get<string>('CONTACTS_BY_BRANCH_JSON');
    if (!raw) {
      this.logger.warn('CONTACTS_BY_BRANCH_JSON is not set; contacts API will return empty lists.');
      return;
    }

    try {
      const parsed = JSON.parse(this.unwrapWrappedQuotes(raw));
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([branchCode, contacts]) => {
          if (Array.isArray(contacts)) {
            const key = this.normalizeBranchCodeKey(branchCode) || branchCode.trim();
            this.contactsByBranch[key] = contacts.filter(
              (c) =>
                c &&
                typeof c.phone === 'string' &&
                typeof c.label === 'string' &&
                // SOCIAL comes from group SSO/CCO mapping in DB.
                c.type !== 'SOCIAL' &&
                c.type !== 'SOCIAL_OFFICER',
            ) as ContactItem[];
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to parse CONTACTS_BY_BRANCH_JSON, using empty map.', error as Error);
    }

    const rawGroup = this.configService.get<string>('CONTACTS_BY_GROUP_JSON');
    if (rawGroup) {
      try {
        const parsed = JSON.parse(this.unwrapWrappedQuotes(rawGroup));
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([groupName, contacts]) => {
            if (Array.isArray(contacts)) {
              const key = normalizeGroupNameKey(groupName) || groupName;
              this.contactsByGroup[key] = contacts.filter(
                (c) =>
                  c &&
                  typeof c.phone === 'string' &&
                  typeof c.label === 'string' &&
                  c.type !== 'SOCIAL' &&
                  c.type !== 'SOCIAL_OFFICER',
              ) as ContactItem[];
            }
          });
        }
      } catch (error) {
        this.logger.error('Failed to parse CONTACTS_BY_GROUP_JSON, using empty group map.', error as Error);
      }
    }
  }

  private unwrapWrappedQuotes(raw: string) {
    const value = raw.trim();
    if (value.length >= 2) {
      const first = value[0];
      const last = value[value.length - 1];
      if ((first === "'" && last === "'") || (first === '"' && last === '"')) {
        return value.slice(1, -1);
      }
    }
    return value;
  }

  private normalizeBranchCodeKey(value?: string | null) {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';
    if (/^\d+$/.test(trimmed)) return trimmed.padStart(3, '0');
    return trimmed;
  }

  private mergeContacts(base: ContactItem[], overrides: ContactItem[]) {
    const map = new Map<string, ContactItem>();
    base.forEach((c) => map.set(c.type || c.label, c));
    overrides.forEach((c) => map.set(c.type || c.label, c));
    return Array.from(map.values());
  }

  async getByBranchCode(branchCode?: string, groupName?: string): Promise<ContactsResponse> {
    const normalized = this.normalizeBranchCodeKey(branchCode);
    const rawBranchCode = (branchCode || '').trim();
    const lookupCode =
      (normalized && this.contactsByBranch[normalized] ? normalized : '') ||
      (rawBranchCode && this.contactsByBranch[rawBranchCode] ? rawBranchCode : '') ||
      normalized ||
      rawBranchCode;
    const branchContacts =
      lookupCode && Array.isArray(this.contactsByBranch[lookupCode])
        ? this.contactsByBranch[lookupCode].filter((c) => c.type !== 'SOCIAL' && c.type !== 'SOCIAL_OFFICER')
        : [];

    let merged = branchContacts;
    let socialPhone: string | null = null;

    if (groupName) {
      const gKey = normalizeGroupNameKey(groupName) || groupName;

      // Merge optional group-level overrides from env first.
      const gContacts = this.contactsByGroup[gKey];
      if (Array.isArray(gContacts) && gContacts.length) {
        merged = this.mergeContacts(merged, gContacts);
      }

      // Then load SSO/CCO phone from DB mapping.
      const group = await this.prisma.group.findFirst({
        where: {
          groupNameKey: gKey,
          ...(lookupCode ? { branchCode: lookupCode } : {}),
        },
        include: { sso: true },
      });

      const ssoPhone = group?.sso?.phoneNumber?.trim() || null;
      if (ssoPhone) {
        const ssoName = group?.sso?.fullName?.trim() || 'Cán bộ công tác xã hội';
        merged = this.mergeContacts(merged, [
          {
            type: 'SOCIAL_OFFICER',
            label: ssoName,
            phone: ssoPhone,
          },
        ]);
        socialPhone = ssoPhone;
      }
    }

    if (!socialPhone) {
      socialPhone =
        merged.find((c) => c.type === 'SOCIAL_OFFICER')?.phone ??
        merged.find((c) => c.type === 'SOCIAL')?.phone ??
        null;
    }

    if (socialPhone) {
      const hasSocialOfficer = merged.some((c) => c.type === 'SOCIAL_OFFICER');
      if (!hasSocialOfficer) {
        merged = this.mergeContacts(merged, [
          {
            type: 'SOCIAL_OFFICER',
            label: 'SĐT Cán bộ công tác xã hội',
            phone: socialPhone,
          },
        ]);
      }
    }

    // Ensure we always have separate AGRI/LIVESTOCK lines.
    const hasAgri = merged.some((c) => c.type === 'AGRI');
    const hasLivestock = merged.some((c) => c.type === 'LIVESTOCK');
    if (hasAgri && !hasLivestock) {
      const agri = merged.find((c) => c.type === 'AGRI');
      if (agri) {
        merged = this.mergeContacts(merged, [
          {
            ...agri,
            type: 'LIVESTOCK',
            label: 'SĐT Cán bộ chăn nuôi',
          },
        ]);
      }
    }

    return {
      branchCode: lookupCode,
      contacts: merged,
      socialPhone,
    };
  }
}
