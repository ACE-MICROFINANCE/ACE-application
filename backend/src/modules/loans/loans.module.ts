import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { PrismaModule } from '../../database/prisma.module';
import { BijliClientService } from './bijli-client.service';

@Module({
  imports: [PrismaModule],
  controllers: [LoansController],
  providers: [LoansService, BijliClientService], // [BIJLI-LOAN] add BIJLI client
  exports: [LoansService],
})
export class LoansModule {}
