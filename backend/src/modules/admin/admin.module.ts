import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../database/prisma.module';
import { CustomersModule } from '../customers/customers.module';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';
import { LoansModule } from '../loans/loans.module'; // CHANGED: debug sync loans
import { EventsModule } from '../events/events.module'; // CHANGED: debug snapshot events
import { AdminDebugController } from './admin-debug.controller'; // CHANGED: debug endpoints
import { MemberDebugSyncService } from './member-debug-sync.service'; // CHANGED: debug sync service
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: guard for admin debug

@Module({
  imports: [PrismaModule, CustomersModule, LoansModule, EventsModule], // CHANGED: add modules for debug sync
  controllers: [AdminController, AdminDebugController], // CHANGED: register debug controller
  providers: [
    AdminService,
    AdminApiKeyGuard,
    MemberDebugSyncService,
    RolesGuard, // CHANGED: provide RolesGuard
  ], // CHANGED: register debug service
})
export class AdminModule {}
