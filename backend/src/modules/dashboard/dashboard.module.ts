import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaModule } from '../../database/prisma.module';
import { LoansModule } from '../loans/loans.module';
import { EventsModule } from '../events/events.module';
import { SavingsModule } from '../savings/savings.module';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  imports: [PrismaModule, LoansModule, EventsModule, SavingsModule],
  controllers: [DashboardController],
  providers: [DashboardService, RolesGuard],
})
export class DashboardModule {}
