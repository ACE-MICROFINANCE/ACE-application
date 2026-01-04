import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from '../../database/prisma.module';
import { BijliClientService } from './bijli-client.service';
import { BijliCustomerSyncService } from './bijli-customer-sync.service';
import { BranchGroupMapService } from './branch-group-map.service'; // CHANGED: map GroupName -> branch info
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: roles guard for stub endpoint

@Module({
  imports: [PrismaModule],
  providers: [
    CustomersService,
    BijliClientService,
    BijliCustomerSyncService,
    BranchGroupMapService, // CHANGED: register branch mapping service
    RolesGuard,
  ], // CHANGED: register roles guard
  controllers: [CustomersController],
  exports: [
    CustomersService,
    BijliCustomerSyncService,
    BijliClientService,
    BranchGroupMapService, // CHANGED: export branch mapping service
  ], // CHANGED: export BijliClientService for /savings
})
export class CustomersModule {}
