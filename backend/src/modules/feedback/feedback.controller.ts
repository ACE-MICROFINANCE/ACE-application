import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @UseGuards(JwtAccessGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAccessGuard)
  @Get()
  async list(@Req() req: any) {
    return this.feedbackService.list(req.user.userId);
  }
}
