import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../../database/prisma.module';
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: roles guard for staff endpoints
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService, RolesGuard], // CHANGED: register roles guard
  exports: [EventsService],
})
export class EventsModule {}
