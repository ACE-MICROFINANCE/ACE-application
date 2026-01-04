import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @Post('events')
  async createEvent(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.createStaffEvent(req.user, dto); // CHANGED: staff create event
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @Get('events')
  async listStaffEvents(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.eventsService.listStaffEvents(req.user, { from, to, eventType }); // CHANGED: staff list
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @Patch('events/:id')
  async updateEvent(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.updateStaffEvent(req.user, id, dto); // CHANGED: staff update
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BRANCH_MANAGER')
  @Delete('events/:id')
  async deleteEvent(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.deleteStaffEvent(req.user, id); // CHANGED: staff delete
  }

  @UseGuards(JwtAccessGuard)
  @Get('events/my')
  async getCustomerEvents(@Req() req: any) {
    return this.eventsService.getCustomerEvents(req.user.userId); // CHANGED: customer event list
  }

  @UseGuards(JwtAccessGuard)
  @Get('schedule')
  async getSchedule(@Req() req: any) {
    return this.eventsService.getUpcomingEvents(req.user.userId);
  }

  @UseGuards(JwtAccessGuard)
  @Get('schedule/:id')
  async getScheduleDetail(@Param('id') id: string) {
    return this.eventsService.getEventDetail(id);
  }
}
