import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { PrismaService } from '../../database/prisma.service';

@Module({
  providers: [CustomersService, PrismaService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
