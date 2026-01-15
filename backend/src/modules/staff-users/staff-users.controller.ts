import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { StaffUsersService } from './staff-users.service';
import { CreateStaffUserDto } from './dto/create-staff-user.dto';
import { UpdateStaffUserDto } from './dto/update-staff-user.dto';
import { ResetStaffPasswordDto } from './dto/reset-staff-password.dto';
import { UpdateStaffLockDto } from './dto/update-staff-lock.dto'; // CHANGED: lock/unlock staff

@Controller('staff-users')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles('ADMIN')
export class StaffUsersController {
  constructor(private readonly staffUsersService: StaffUsersService) {}

  @Get()
  async list(@Query('q') q?: string) {
    return this.staffUsersService.list({ q }); // CHANGED: optional search
  }

  @Get('branches')
  async listBranches() {
    return this.staffUsersService.listBranches(); // CHANGED: list branches from map
  }

  @Post()
  async create(@Body() dto: CreateStaffUserDto) {
    return this.staffUsersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateStaffUserDto) {
    return this.staffUsersService.update(id, dto);
  }

  @Patch(':id/lock')
  async lock(@Param('id') id: string, @Body() dto: UpdateStaffLockDto) {
    return this.staffUsersService.setLockStatus(id, dto.locked); // CHANGED: lock/unlock staff
  }

  @Post(':id/reset-password')
  async resetPassword(@Param('id') id: string, @Body() dto: ResetStaffPasswordDto) {
    return this.staffUsersService.resetPassword(id, dto.newPassword);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.staffUsersService.remove(id); // CHANGED: delete staff
  }
}
