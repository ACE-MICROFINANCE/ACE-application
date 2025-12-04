import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationModule } from '../notifications/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
