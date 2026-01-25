import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {
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
              (c) => c && typeof c.phone === 'string' && typeof c.label === 'string',
            ) as ContactItem[];
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to parse CONTACTS_BY_BRANCH_JSON, using empty map.', error as Error);
    }
  }

  getByBranchCode(branchCode?: string): ContactsResponse {
    const normalized = (branchCode || '').trim();
    const contacts = normalized && Array.isArray(this.contactsByBranch[normalized])
      ? [...this.contactsByBranch[normalized]]
      : [];
    const socialPhone = contacts.find((c) => c.type === 'SOCIAL')?.phone ?? null;

    return {
      branchCode: normalized,
      contacts,
      socialPhone,
    };
  }
}
