import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { AdminApiKeyGuard } from '../../common/guards/admin-api-key.guard';

@Controller('admin')
@UseGuards(AdminApiKeyGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('customers')
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.adminService.createCustomer(dto);
  }

  @Post('customers/:id/reset-password')
  async resetPassword(@Param('id') id: string) {
    return this.adminService.resetPassword(id);
  }
}
