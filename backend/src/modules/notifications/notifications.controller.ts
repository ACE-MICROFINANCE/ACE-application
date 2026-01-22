import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
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
}
