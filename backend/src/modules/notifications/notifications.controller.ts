import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { NotificationsService } from './notifications.service';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAccessGuard)
  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  async registerDeviceToken(@Req() req: any, @Body() dto: RegisterDeviceTokenDto) {
    const actorKind = req.user?.actorKind;
    const actorId = req.user?.userId;
    if (!actorKind || !actorId) {
      return { success: false, message: 'Unauthorized' };
    }
    await this.notificationsService.registerDeviceToken({
      actorKind,
      actorId: String(actorId),
      token: dto.token,
      platform: dto.platform,
    });
    return { success: true };
  }

  // Badge counts for tabbar
  @UseGuards(JwtAccessGuard)
  @Get('badge-counts')
  async getBadgeCounts(@Req() req: any) {
    return this.notificationsService.getBadgeCounts(req.user);
  }

  // Mark category as read/cleared
  @UseGuards(JwtAccessGuard)
  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Req() req: any, @Body() body: { category?: string }) {
    await this.notificationsService.markCategoryRead(req.user, body?.category);
    return { success: true };
  }
}
