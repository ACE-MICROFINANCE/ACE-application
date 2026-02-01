import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationToSend } from './types';
import { PushNotificationProvider } from './providers/push.provider';
import { RealtimeNotificationProvider } from './providers/realtime.provider';
import { addDays, startOfDay } from 'date-fns';

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

  // Badge counts for tabbar (customer & staff BA/BM)
  async getBadgeCounts(user: { actorKind?: string | null; role?: string | null; userId?: string | null; branchCode?: string | null }) {
    const badge = {
      loans: 0,
      group: 0,
      schedule: 0,
    };

    // Count unread notifications by type prefix
    if (user.userId && user.actorKind) {
      const unread = await this.prisma.notification.findMany({
        where: { recipientActorKind: user.actorKind, recipientId: String(user.userId), isRead: false },
        select: { type: true },
      });
      unread.forEach((n) => {
        if (n.type?.startsWith('LOAN_')) badge.loans += 1;
        if (n.type?.startsWith('SCHEDULE_')) badge.schedule += 1;
      });
    }

    // Fallback counts if no notifications stored yet
    if (badge.loans === 0 && user.actorKind === 'CUSTOMER' && user.userId) {
      try {
        const now = new Date();
        const dueSoon = await this.prisma.loan.count({
          where: {
            customerId: BigInt(user.userId),
            status: 'ACTIVE',
            nextPaymentDueDate: {
              gte: startOfDay(now),
              lte: addDays(startOfDay(now), 7),
            },
          },
        } as any);
        badge.loans = dueSoon ?? 0;
      } catch (err) {
        this.logger.debug?.('Badge loans count skipped (field missing?)', err as any);
      }
    }

    if (badge.group === 0 && user.actorKind === 'STAFF' && user.role === 'BM' && user.branchCode) {
      const pending = await this.prisma.groupRequest.count({
        where: { branchCode: user.branchCode, status: 'PENDING' },
      });
      badge.group = pending;
    }
    if (badge.group === 0 && user.actorKind === 'STAFF' && user.role === 'BA' && user.userId) {
      const pending = await this.prisma.groupRequest.count({
        where: { createdByStaffId: BigInt(user.userId), status: 'PENDING' },
      });
      badge.group = pending;
    }

    return badge;
  }

  async markCategoryRead(user: { actorKind?: string | null; role?: string | null; userId?: string | null; branchCode?: string | null }, category?: string) {
    if (!user.userId || !user.actorKind) return { success: true };
    const prefixes: Record<string, string[]> = {
      loans: ['LOAN_'],
      schedule: ['SCHEDULE_'],
      group: ['GROUP_'], // reserved if cần sau này
    };
    const selected = prefixes[category ?? ''] ?? [];
    if (!selected.length) return { success: true };

    await this.prisma.notification.updateMany({
      where: {
        recipientActorKind: user.actorKind,
        recipientId: String(user.userId),
        isRead: false,
        OR: selected.map((p) => ({ type: { startsWith: p } })),
      },
      data: { isRead: true },
    });
    return { success: true };
  }
}
