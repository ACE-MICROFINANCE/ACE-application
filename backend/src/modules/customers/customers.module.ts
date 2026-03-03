import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from '../../database/prisma.module';
import { BijliClientService } from './bijli-client.service';
import { BijliCustomerSyncService } from './bijli-customer-sync.service';
import { BranchGroupMapService } from './branch-group-map.service'; // CHANGED: map GroupName -> branch info
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: roles guard for stub endpoint
import { TempPasswordCryptoService } from '../../common/services/temp-password-crypto.service'; // CHANGED: temp password crypto
import { CustomerBootstrapSyncService } from './customer-bootstrap-sync.service'; // CHANGED: bootstrap sync on app start

@Module({
  imports: [PrismaModule],
  providers: [
    CustomersService,
    BijliClientService,
    BijliCustomerSyncService,
    BranchGroupMapService, // CHANGED: register branch mapping service
    RolesGuard,
    TempPasswordCryptoService, // CHANGED: provide crypto service
    CustomerBootstrapSyncService, // CHANGED: run BIJLI sync + credential bootstrap at startup
  ], // CHANGED: register roles guard
  controllers: [CustomersController],
  exports: [
    CustomersService,
    BijliCustomerSyncService,
    BijliClientService,
    CustomerBootstrapSyncService,
    BranchGroupMapService, // CHANGED: export branch mapping service
  ], // CHANGED: export BijliClientService for /savings
})
export class CustomersModule {}
