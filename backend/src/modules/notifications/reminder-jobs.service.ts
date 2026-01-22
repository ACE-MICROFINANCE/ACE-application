import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { addDays } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from './notifications.service';
import { scheduleTemplates, loanTemplates } from './notification-templates';
import { NotificationToSend } from './types';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReminderJobsService {
  private readonly logger = new Logger(ReminderJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  private nowBangkok() {
    const now = new Date();
    const offset = 7 * 60 * 60 * 1000;
    return new Date(now.getTime() + offset);
  }

  private startOfDayBangkok(date: Date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private async resolveScheduleRecipients(event: any) {
    const recipients: Array<{ actorKind: 'CUSTOMER' | 'STAFF'; actorId: string }> = [];
    const targetGroupCodes = (event.targetGroups ?? []).map((g: any) => g.groupCode).filter(Boolean);
    if (event.branchCode) {
      const where: any = { branchCode: event.branchCode };
      if (event.audienceType === 'GROUPS' && targetGroupCodes.length) {
        where.groupCode = { in: targetGroupCodes };
      }
      const customers = await this.prisma.customer.findMany({ where, select: { id: true } });
      recipients.push(...customers.map((c) => ({ actorKind: 'CUSTOMER' as const, actorId: c.id.toString() })));
    }
    if (event.createdByStaffId) {
      recipients.push({ actorKind: 'STAFF', actorId: event.createdByStaffId.toString() });
    }
    return recipients;
  }

  @Cron('0 * * * *', { timeZone: 'Asia/Bangkok' })
  async handleScheduleReminder() {
    const enabled = this.configService.get<boolean>('notifications.enableScheduleReminder');
    if (!enabled) return;
    const hour = this.configService.get<number>('notifications.scheduleReminderHour') ?? 8;
    const days = this.configService.get<number>('notifications.scheduleReminderDays') ?? 7;
    const now = this.nowBangkok();
    if (now.getHours() !== hour) return;

    const targetDayStart = this.startOfDayBangkok(addDays(now, days));
    const targetDayEnd = this.startOfDayBangkok(addDays(now, days + 1));

    const events = await this.prisma.event.findMany({
      where: {
        startDate: { gte: targetDayStart, lt: targetDayEnd },
      },
      include: { targetGroups: true },
    });

    for (const event of events) {
      const recipients = await this.resolveScheduleRecipients(event);
      if (!recipients.length) continue;
      const template = scheduleTemplates.reminder({
        scheduleId: Number(event.id),
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        branchCode: event.branchCode,
        groupCode: event.targetGroups?.[0]?.groupCode,
        reminderDays: days,
      });
      const payloads: NotificationToSend[] = recipients.map((rec) => ({
        recipientActorKind: rec.actorKind,
        recipientId: rec.actorId,
        type: template.type,
        title: template.title,
        body: template.body,
        data: template.data as Record<string, any>,
        notificationKey: template.notificationKey,
      }));
      await this.notificationsService.persistAndDispatch(payloads);
    }
  }

  @Cron('15 * * * *', { timeZone: 'Asia/Bangkok' })
  async handleLoanReminder() {
    const enabled = this.configService.get<boolean>('notifications.enableLoanReminder');
    if (!enabled) return;
    const hour = this.configService.get<number>('notifications.loanReminderHour') ?? 8;
    const days = this.configService.get<number>('notifications.loanReminderDays') ?? 7;
    const now = this.nowBangkok();
    if (now.getHours() !== hour) return;

    // TODO: Implement real query when loan installment dueDate is available.
    this.logger.warn('Loan reminder job is enabled but data query is not implemented yet.');
    // Skeleton: keep idempotent pattern ready
    const loans: any[] = [];
    for (const loan of loans) {
      const recipients = [{ actorKind: 'CUSTOMER' as const, actorId: loan.customerId?.toString?.() ?? '' }].filter(
        (r) => r.actorId,
      );
      if (!recipients.length) continue;
      const template = loanTemplates.reminder({
        loanId: loan.id,
        memberNo: loan.memberNo,
        dueDate: loan.dueDate,
        reminderDays: days,
      });
      const payloads: NotificationToSend[] = recipients.map((rec) => ({
        recipientActorKind: rec.actorKind,
        recipientId: rec.actorId,
        type: template.type,
        title: template.title,
        body: template.body,
        data: template.data as Record<string, any>,
        notificationKey: template.notificationKey,
      }));
      await this.notificationsService.persistAndDispatch(payloads);
    }
  }
}
