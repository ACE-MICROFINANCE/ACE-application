import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffUsersService } from './staff-users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';

@Controller('staff-users')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
export class StaffUsersController {
  constructor(private readonly staffUsersService: StaffUsersService) {}

  @Get()
  async list() {
    return this.staffUsersService.list();
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto) {
    return this.staffUsersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffUserDto) {
    return this.staffUsersService.update(id, dto);
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetStaffPasswordDto) {
    return this.staffUsersService.resetPassword(id, dto.newPassword);
  }
}
