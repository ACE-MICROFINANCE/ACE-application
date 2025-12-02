import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { SavingsService } from './savings.service';

@Controller('savings')
export class SavingsController {
  constructor(private readonly savingsService: SavingsService) {}

  @UseGuards(JwtAccessGuard)
  @Get()
  async list(@Req() req: any) {
    return this.savingsService.getSavings(req.user.userId);
  }
}
