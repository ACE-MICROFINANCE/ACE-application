import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SuperAdminService } from './super-admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('super-admin')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('admins')
  async listAdmins(@Query('q') q?: string) {
    return this.service.listAdmins(q);
  }

  @Post('admins')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.service.createAdmin(dto);
  }

  @Put('admins/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.service.updateAdmin(id, dto);
  }

  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string) {
    return this.service.deleteAdmin(id);
  }
}
