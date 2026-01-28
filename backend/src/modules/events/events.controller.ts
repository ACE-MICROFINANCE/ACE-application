import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
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
  @Roles('BM', 'BA')
  @Post('events')
  async createEvent(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.eventsService.createStaffEvent(req.user, dto); // CHANGED: staff create event
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM', 'BA')
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
  @Roles('BM', 'BA')
  @Patch('events/:id')
  async updateEvent(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.updateStaffEvent(req.user, id, dto); // CHANGED: staff update
  }

  // PUT alias to avoid breaking existing clients while matching spec
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM', 'BA')
  @Put('events/:id')
  async updateEventPut(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.updateStaffEvent(req.user, id, dto);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('events/:id/approve')
  async approve(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.approveEvent(req.user, id);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('events/:id/reject')
  async reject(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.rejectEvent(req.user, id);
  }

  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('BM')
  @Post('events/:id/hide')
  async hide(@Req() req: any, @Param('id') id: string, @Body() body: { hidden: boolean }) {
    return this.eventsService.hideEvent(req.user, id, body?.hidden ?? true);
  }

  @UseGuards(JwtAccessGuard)
  @Get('events/my')
  async getCustomerEvents(@Req() req: any) {
    return this.eventsService.getCustomerEvents(req.user.userId); // CHANGED: customer event list
  }

  @UseGuards(JwtAccessGuard)
  @Get('schedule')
  async getSchedule(@Req() req: any) {
    return this.eventsService.getScheduleForActor(req.user); // CHANGED: support staff/customer schedule
  }

  @UseGuards(JwtAccessGuard)
  @Get('schedule/:id')
  async getScheduleDetail(@Param('id') id: string) {
    return this.eventsService.getEventDetail(id);
  }
}
