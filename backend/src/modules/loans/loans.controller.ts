import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { LoansService } from './loans.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { CreateLoanQrDto } from './dto/create-loan-qr.dto';

@Controller('loan')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @UseGuards(JwtAccessGuard)
  @Get('current')
  async getCurrentLoan(@Req() req: any) {
    return this.loansService.getCurrentLoan(req.user.userId);
  }

  @UseGuards(JwtAccessGuard)
  @Post('qr')
  async createLoanQr(@Req() req: any, @Body() dto: CreateLoanQrDto) {
    // CHANGED: generate QR with custom amount
    return this.loansService.createLoanQr(req.user.userId, dto.amount);
  }
}
