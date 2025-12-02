import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../../database/prisma.module';
import { CustomersModule } from '../customers/customers.module';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';

@Module({
  imports: [PrismaModule, CustomersModule],
  controllers: [AdminController],
  providers: [AdminService, AdminApiKeyGuard],
})
export class AdminModule {}
