import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';

type CacheValue = { audioUrl: string; cached: boolean; createdAt: number };

@Injectable()
export class TtsService {
  private cache = new Map<string, CacheValue>();
  private readonly apiKey = process.env.FPT_TTS_API_KEY;
  private readonly voice = process.env.FPT_TTS_VOICE || 'banmai';
  private readonly speed = process.env.FPT_TTS_SPEED || '0';
  private readonly format = process.env.FPT_TTS_FORMAT || 'mp3';

  async synthesize(text: string) {
    if (!this.apiKey) {
      throw new ForbiddenException('TTS is not configured');
    }
    const key = `${this.voice}|${this.speed}|${this.format}|${text}`;
    const cached = this.cache.get(key);
    if (cached) {
      return { audioUrl: cached.audioUrl, cached: true };
    }

    try {
      const resp = await axios.post<any>(
        'https://api.fpt.ai/hmi/tts/v5',
        text,
        {
          headers: {
            'api_key': this.apiKey,
            'voice': this.voice,
            'speed': this.speed,
            'format': this.format,
            'Content-Type': 'text/plain; charset=utf-8',
          },
          timeout: 10000,
        },
      );

      const data = resp.data;
      const audioUrl =
        typeof data === 'string'
          ? data.trim()
          : data?.async ?? data?.audioUrl ?? null;
      if (!audioUrl || typeof audioUrl !== 'string') {
        throw new InternalServerErrorException('TTS failed: invalid response');
      }

      // Warm-up: try HEAD once to reduce race where URL not ready
      try {
        await axios.head(audioUrl, { timeout: 4000 });
      } catch {
        // ignore warm-up failure
      }

      this.cache.set(key, { audioUrl, cached: false, createdAt: Date.now() });
      // CHANGED: log success for debugging
      // eslint-disable-next-line no-console
      console.log('[TTS] Generated audio', { audioUrl, cached: false });
      return { audioUrl, cached: false };
    } catch (err: any) {
      // CHANGED: log error detail to help debug
      // eslint-disable-next-line no-console
      console.error('[TTS] Error', {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
      });
      if (err?.response?.status === 403) {
        throw new ForbiddenException('TTS service rejected the request');
      }
      throw new InternalServerErrorException('Unable to generate TTS audio');
    }
  }
}
