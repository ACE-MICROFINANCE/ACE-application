import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationToSend } from './types';
import { PushNotificationProvider } from './providers/push.provider';
import { RealtimeNotificationProvider } from './providers/realtime.provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushProvider: PushNotificationProvider,
    private readonly realtimeProvider: RealtimeNotificationProvider,
  ) {}

  async registerDeviceToken(params: {
    actorKind: 'CUSTOMER' | 'STAFF';
    actorId: string;
    token: string;
    platform: 'android' | 'ios';
  }) {
    const { actorKind, actorId, token, platform } = params;
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { actorKind, actorId, platform, lastSeenAt: new Date() },
      create: { actorKind, actorId, token, platform },
    });
  }

  private async persistNotifications(items: NotificationToSend[]): Promise<NotificationToSend[]> {
    const created: NotificationToSend[] = [];
    for (const item of items) {
      try {
        await this.prisma.notification.create({
          data: {
            recipientActorKind: item.recipientActorKind,
            recipientId: item.recipientId,
            type: item.type,
            title: item.title,
            body: item.body,
            data: JSON.stringify(item.data ?? {}),
            notificationKey: item.notificationKey,
          },
        });
        created.push(item);
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          // duplicate notificationKey -> idempotent, skip push
          this.logger.debug?.(`Skip duplicate notificationKey=${item.notificationKey}`);
          continue;
        }
        throw error;
      }
    }
    return created;
  }

  async persistAndDispatch(items: NotificationToSend[]): Promise<void> {
    if (!items?.length) return;
    const newlyCreated = await this.persistNotifications(items);
    if (!newlyCreated.length) return;
    await Promise.all([
      this.pushProvider.sendMany(newlyCreated),
      this.realtimeProvider.sendMany(newlyCreated),
    ]);
  }
}
