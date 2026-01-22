import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider } from './notification.provider';
import { NotificationToSend } from '../types';

@Injectable()
export class RealtimeNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(RealtimeNotificationProvider.name);
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.enabled = configService.get<boolean>('notifications.enableRealtime') ?? false;
  }

  async sendMany(items: NotificationToSend[]): Promise<void> {
    if (!items.length) return;
    if (!this.enabled) {
      this.logger.debug?.(`Realtime provider disabled, skipped ${items.length} notifications`);
      return;
    }
    // TODO: plug socket provider when ENABLE_REALTIME=true
    this.logger.log(`Realtime provider enabled but no implementation, skipped ${items.length} notifications`);
  }
}
