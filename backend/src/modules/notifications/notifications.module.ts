import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationProvider } from './providers/push.provider';
import { RealtimeNotificationProvider } from './providers/realtime.provider';
import { EmailNotificationService } from './email-notification.service';
import { ReminderJobsService } from './reminder-jobs.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushNotificationProvider,
    RealtimeNotificationProvider,
    EmailNotificationService,
    ReminderJobsService,
  ],
  exports: [NotificationsService, EmailNotificationService],
})
export class NotificationsModule {}
