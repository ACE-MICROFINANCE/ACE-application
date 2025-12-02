import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { EventsService } from './events.service';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

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
