import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { TrackFeatureUsageDto } from './dto/track-feature-usage.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetFeatureUsageOverTimeDto } from './dto/get-feature-usage-over-time.dto';
import { GetActiveCustomersDto } from './dto/get-active-customers.dto';
import { GetFeatureTimeSpentDto } from './dto/get-feature-time-spent.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAccessGuard)
  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.dashboardService.getSummary(req.user.userId);
  }

  @UseGuards(JwtAccessGuard)
  @Post('feature-usage/track')
  @HttpCode(HttpStatus.OK)
  async trackFeatureUsage(@Req() req: any, @Body() dto: TrackFeatureUsageDto) {
    return this.dashboardService.trackFeatureUsage(req.user, dto);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('feature-usage-over-time')
  async getFeatureUsageOverTime(@Query() query: GetFeatureUsageOverTimeDto) {
    return this.dashboardService.getFeatureUsageOverTime(query);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('active-customers')
  async getActiveCustomers(@Query() query: GetActiveCustomersDto) {
    return this.dashboardService.getActiveCustomers(query.range);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Get('feature-time-spent')
  async getFeatureTimeSpent(@Query() query: GetFeatureTimeSpentDto) {
    return this.dashboardService.getFeatureTimeSpent(query);
  }
}
