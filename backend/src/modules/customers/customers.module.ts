import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaModule } from '../../database/prisma.module';
import { BijliClientService } from './bijli-client.service';
import { BijliCustomerSyncService } from './bijli-customer-sync.service';

@Module({
  imports: [PrismaModule],
  providers: [CustomersService, BijliClientService, BijliCustomerSyncService], // [BIJLI-CUSTOMER] BIJLI sync services
  controllers: [CustomersController],
  exports: [CustomersService, BijliCustomerSyncService], // [BIJLI-CUSTOMER] allow sync usage in other modules
})
export class CustomersModule {}
