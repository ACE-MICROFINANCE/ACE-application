import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationProvider } from './notification.provider';
import { NotificationToSend } from '../types';
import { PushClient, StubPushClient } from '../push-client';

@Injectable()
export class PushNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(PushNotificationProvider.name);
  private readonly client: PushClient;

  constructor(private readonly prisma: PrismaService, private readonly configService: ConfigService) {
    const mode = (this.configService.get<string>('notifications.pushMode') || 'stub').toLowerCase();
    // TODO: add FcmPushClient when credential available
    this.client = new StubPushClient();
    if (mode !== 'stub') {
      this.logger.warn(`PUSH_MODE=${mode} but no concrete client configured. Falling back to stub.`);
    }
  }

  async sendMany(items: NotificationToSend[]): Promise<void> {
    if (!items.length) return;

    // Collect recipient filters
    const recipients = Array.from(
      new Map(
        items.map((item) => [`${item.recipientActorKind}:${item.recipientId}`, item]),
      ).values(),
    ).map((item) => ({
      actorKind: item.recipientActorKind,
      actorId: item.recipientId,
    }));

    if (!recipients.length) return;

    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { OR: recipients },
    });

    if (!deviceTokens.length) {
      this.logger.debug?.('No device tokens found for recipients, skip push.');
      return;
    }

    // Group by token and send one payload per notification item
    for (const item of items) {
      const tokens = deviceTokens
        .filter(
          (t) => t.actorKind === item.recipientActorKind && t.actorId === item.recipientId,
        )
        .map((t) => t.token);
      if (!tokens.length) continue;
      await this.client.send(tokens, {
        title: item.title,
        body: item.body,
        data: item.data as any,
      });
    }
  }
}
