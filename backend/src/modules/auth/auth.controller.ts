import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../../common/guards/jwt-refresh.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { StaffForgotPasswordDto } from './dto/staff-forgot-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.memberNo);
    return {
      success: true,
      message:
        'Nếu mã khách hàng tồn tại, nhân viên ACE sẽ liên hệ để hỗ trợ cấp lại mật khẩu.',
    };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.refresh(req.user.userId, dto.refreshToken);
  }

  @UseGuards(JwtAccessGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user, dto);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(req.user.userId, dto.refreshToken);
  }

  @Post('staff/forgot-password')
  @HttpCode(HttpStatus.OK)
  async staffForgotPassword(@Body() dto: StaffForgotPasswordDto) {
    await this.authService.staffForgotPassword(dto.email);
    return { success: true, message: 'Hệ thống đã gửi mật khẩu tạm thời.' };
  }
}
