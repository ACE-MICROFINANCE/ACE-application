import { Body, Controller, Post, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { TtsService } from './tts.service';

type UserPayload = {
  actorKind?: string;
  accessibilityEnabled?: boolean;
};

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post()
  @UseGuards(JwtAccessGuard)
  async create(@Body('text') text: string, @Body() _body: any, @Req() req: any) {
    const user = (req?.user || req?.payload) as UserPayload | undefined;
    if (!user || user.actorKind !== 'CUSTOMER' || user.accessibilityEnabled !== true) {
      throw new ForbiddenException('TTS available for accessible customers only');
    }
    if (!text || typeof text !== 'string') {
      throw new ForbiddenException('Invalid text');
    }
    const result = await this.ttsService.synthesize(text.trim());
    return { ok: true, ...result };
  }
}
