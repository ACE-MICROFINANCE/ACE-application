import axios, { AxiosInstance } from 'axios';
import { Injectable, Logger } from '@nestjs/common';

const BIJLI_ENDPOINT =
  'https://ace.bijliftt.com/ShareData.asmx/ReturnMemberInfo?pMemberNo=00';

@Injectable()
export class BijliClientService {
  private readonly client: AxiosInstance;
  private readonly logger = new Logger(BijliClientService.name); // [BIJLI-CUSTOMER] debug BIJLI calls

  constructor() {
    this.client = axios.create({ timeout: 10000 });
  }

  async fetchMemberInfo(memberNo: string): Promise<any | null> {
    const normalized = memberNo?.trim();
    if (!normalized) return null;

    const url = `${BIJLI_ENDPOINT}${encodeURIComponent(normalized)}`;
    try {
      this.logger.log(`[BIJLI-CUSTOMER] Fetching BIJLI memberNo=${normalized}`); // [BIJLI-CUSTOMER] log request
      const response = await this.client.get(url);
      let data = response.data;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          this.logger.warn('[BIJLI-CUSTOMER] Response is not valid JSON'); // [BIJLI-CUSTOMER] debug parse
          return null;
        }
      }

      if (!Array.isArray(data) || data.length === 0) {
        this.logger.warn('[BIJLI-CUSTOMER] Empty BIJLI response'); // [BIJLI-CUSTOMER] debug empty
        return null;
      }

      this.logger.log(`[BIJLI-CUSTOMER] BIJLI response items=${data.length}`); // [BIJLI-CUSTOMER] debug count
      return data[0];
    } catch (error: any) {
      this.logger.error(
        `[BIJLI-CUSTOMER] BIJLI request failed: ${error?.message ?? error}`,
      ); // [BIJLI-CUSTOMER] debug errors
      throw error;
    }
  }
}
