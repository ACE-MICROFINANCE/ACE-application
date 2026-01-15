import { Module } from '@nestjs/common';
import { StaffUsersController } from './staff-users.controller';
import { StaffUsersService } from './staff-users.service';
import { RolesGuard } from '../../common/guards/roles.guard'; // CHANGED: roles guard for admin endpoints
import { CustomersModule } from '../customers/customers.module'; // CHANGED: reuse branch map service

@Module({
  imports: [CustomersModule], // CHANGED: access branch mapping
  controllers: [StaffUsersController],
  providers: [StaffUsersService, RolesGuard], // CHANGED: register roles guard
})
export class StaffUsersModule {}
