import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class BijliClientService {
  // [BIJLI-LOAN] BIJLI endpoint base
  private readonly baseUrl = 'https://ace.bijliftt.com/ShareData.asmx/ReturnMemberInfo';

  // [BIJLI-LOAN] Fetch member info with 10s timeout
  async fetchMemberInfo(memberNo: string): Promise<any | null> {
    const url = `${this.baseUrl}?pMemberNo=00${memberNo}`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    if (Array.isArray(data) && data.length > 0) return data[0];
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
      } catch {
        return null;
      }
    }
    return data ?? null;
  }
}
