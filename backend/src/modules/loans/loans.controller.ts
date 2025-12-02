import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';

@Controller('loan')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @UseGuards(JwtAccessGuard)
  @Get('current')
  async getCurrentLoan(@Req() req: any) {
    return this.loansService.getCurrentLoan(req.user.userId);
  }
}
