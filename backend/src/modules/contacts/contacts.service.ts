import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { normalizeGroupNameKey } from '../../common/utils/normalize-group-name.util';

export type ContactItem = {
  type: 'HOTLINE' | 'AGRI' | 'SOCIAL' | string;
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
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([branchCode, contacts]) => {
          if (Array.isArray(contacts)) {
            this.contactsByBranch[branchCode] = contacts.filter(
              (c) =>
                c &&
                typeof c.phone === 'string' &&
                typeof c.label === 'string' &&
                // KHÔNG lấy số SOCIAL từ .env nữa; để DB SSO cung cấp
                c.type !== 'SOCIAL',
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
        const parsed = JSON.parse(rawGroup);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([groupName, contacts]) => {
            if (Array.isArray(contacts)) {
              const key = normalizeGroupNameKey(groupName) || groupName;
              this.contactsByGroup[key] = contacts.filter(
                (c) =>
                  c &&
                  typeof c.phone === 'string' &&
                  typeof c.label === 'string' &&
                  c.type !== 'SOCIAL',
              ) as ContactItem[];
            }
          });
        }
      } catch (error) {
        this.logger.error('Failed to parse CONTACTS_BY_GROUP_JSON, using empty group map.', error as Error);
      }
    }
  }

  private mergeContacts(base: ContactItem[], overrides: ContactItem[]) {
    const map = new Map<string, ContactItem>();
    base.forEach((c) => map.set(c.type || c.label, c));
    overrides.forEach((c) => map.set(c.type || c.label, c));
    return Array.from(map.values());
  }

  async getByBranchCode(branchCode?: string, groupName?: string): Promise<ContactsResponse> {
    const normalized = (branchCode || '').trim();
    const contacts = normalized && Array.isArray(this.contactsByBranch[normalized])
      ? this.contactsByBranch[normalized].filter((c) => c.type !== 'SOCIAL')
      : [];
    let merged = contacts;
    let socialPhone: string | null = null;

    // Ưu tiên lấy SSO từ DB theo group
    if (groupName) {
      const gKey = normalizeGroupNameKey(groupName) || groupName;

      // Nếu file JSON có contacts theo group thì merge vào trước
      const gContacts = this.contactsByGroup[gKey];
      if (Array.isArray(gContacts) && gContacts.length) {
        merged = this.mergeContacts(merged, gContacts);
      }

      // Tìm group trong DB để lấy SSO được gán
      const group = await this.prisma.group.findFirst({
        where: {
          groupNameKey: gKey,
          ...(normalized ? { branchCode: normalized } : {}),
        },
        include: { sso: true },
      });

      const ssoPhone = group?.sso?.phoneNumber ?? null;
      if (ssoPhone) {
        const ssoContact: ContactItem = {
          type: 'SOCIAL',
          label: group?.sso?.fullName || 'CCO phụ trách',
          phone: ssoPhone,
        };
        const socialOfficer: ContactItem = {
          type: 'SOCIAL_OFFICER',
          label: 'Cán bộ tín dụng xã hội',
          phone: ssoPhone,
        };
        merged = this.mergeContacts(merged, [ssoContact, socialOfficer]);
        socialPhone = ssoPhone;
      }
    }

    // fallback nếu chưa lấy được từ DB
    if (!socialPhone) {
      socialPhone = merged.find((c) => c.type === 'SOCIAL')?.phone ?? null;
    }

    // Bảo đảm luôn có dòng CÁN BỘ CÔNG TÁC XÃ HỘI (dùng cùng số SSO/social nếu có)
    if (socialPhone) {
      const hasSocialOfficer = merged.some((c) => c.type === 'SOCIAL_OFFICER');
      if (!hasSocialOfficer) {
        merged = this.mergeContacts(merged, [
          {
            type: 'SOCIAL_OFFICER',
            label: 'Cán bộ công tác xã hội',
            phone: socialPhone,
          },
        ]);
      }
    }

    // Đảm bảo tách riêng trồng trọt / chăn nuôi: nếu thiếu LIVESTOCK mà có AGRI thì duplicate với label mới
    const hasAgri = merged.some((c) => c.type === 'AGRI');
    const hasLivestock = merged.some((c) => c.type === 'LIVESTOCK');
    if (hasAgri && !hasLivestock) {
      const agri = merged.find((c) => c.type === 'AGRI');
      if (agri) {
        merged = this.mergeContacts(merged, [
          {
            ...agri,
            type: 'LIVESTOCK',
            label: agri.label.replace(/trồng trọt.*$/i, 'Cán bộ chăn nuôi').replace(/&.*$/i, '').trim() || 'Cán bộ chăn nuôi',
          },
        ]);
      }
    }

    return {
      branchCode: normalized,
      contacts: merged,
      socialPhone,
    };
  }
}
