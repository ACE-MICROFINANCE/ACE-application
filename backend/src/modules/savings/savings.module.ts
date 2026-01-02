import { Module } from '@nestjs/common';
import { SavingsController } from './savings.controller';
import { SavingsService } from './savings.service';
import { PrismaModule } from '../../database/prisma.module';
import { CustomersModule } from '../customers/customers.module'; // CHANGED: reuse BijliClientService

@Module({
  imports: [PrismaModule, CustomersModule], // CHANGED: allow BIJLI fetch for savings history
  controllers: [SavingsController],
  providers: [SavingsService],
  exports: [SavingsService],
})
export class SavingsModule {}
