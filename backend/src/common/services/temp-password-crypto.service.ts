import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class TempPasswordCryptoService {
  constructor(private readonly configService: ConfigService) {}

  private getKey(): Buffer {
    const raw = this.configService.get<string>('security.tempPasswordEncKey') ?? '';
    const normalized = raw.trim();
    if (!normalized) {
      throw new Error('TEMP_PASSWORD_ENC_KEY is required'); // CHANGED: enforce key presence
    }

    const isHex = /^[0-9a-fA-F]+$/.test(normalized);
    const key = isHex ? Buffer.from(normalized, 'hex') : Buffer.from(normalized, 'base64');

    if (key.length !== 32) {
      throw new Error('TEMP_PASSWORD_ENC_KEY must be 32 bytes'); // CHANGED: enforce 256-bit key
    }

    return key;
  }

  encrypt(plainText: string): string {
    const key = this.getKey();
    const iv = randomBytes(12); // CHANGED: GCM standard IV length
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const key = this.getKey();
    const [ivB64, tagB64, dataB64] = payload.split(':');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Invalid encrypted payload'); // CHANGED: validate format
    }
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
