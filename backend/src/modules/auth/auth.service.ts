import {
  Injectable,
  UnauthorizedException,
  NotImplementedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../../database/prisma.service';
import { comparePassword, hashPassword } from '../../utils/password.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getExpiresIn(key: string, fallback: string): SignOptions['expiresIn'] {
    return (this.configService.get<string>(key) ?? fallback) as SignOptions['expiresIn'];
  }

  private async generateTokens(customer: { id: string; customerId: string }) {
    const payload = { sub: customer.id, customerId: customer.customerId };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.getExpiresIn('jwt.accessExpiresIn', '15m'),
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.getExpiresIn('jwt.refreshExpiresIn', '7d'),
    });
    return { accessToken, refreshToken };
  }

  private sanitizeCustomer(customer: any) {
    const { passwordHash, ...rest } = customer;
    return rest;
  }

  async login(dto: LoginDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { customerId: dto.customerId },
    });

    if (!customer) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const isValid = await comparePassword(dto.password, customer.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không hợp lệ');
    }

    const tokens = await this.generateTokens(customer);
    return {
      ...tokens,
      mustChangePassword: customer.mustChangePassword,
      customer: this.sanitizeCustomer(customer),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
    });

    if (!customer) {
      throw new UnauthorizedException('Không tìm thấy khách hàng');
    }

    // First-time login: skip old password check to allow temp password rotation.
    if (!customer.mustChangePassword) {
      const validOld = dto.oldPassword
        ? await comparePassword(dto.oldPassword, customer.passwordHash)
        : false;
      if (!validOld) {
        throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
      }
    }

    const newHash = await hashPassword(dto.newPassword);
    const updated = await this.prisma.customer.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    const tokens = await this.generateTokens(updated);
    return {
      message: 'Đổi mật khẩu thành công',
      ...tokens,
      customer: this.sanitizeCustomer(updated),
    };
  }

  async me(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
    });
    if (!customer) {
      throw new UnauthorizedException('Không tìm thấy khách hàng');
    }
    return this.sanitizeCustomer(customer);
  }

  async refresh(userId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: userId },
    });
    if (!customer) {
      throw new UnauthorizedException('Không tìm thấy khách hàng');
    }
    return this.generateTokens(customer);
  }

  forgotPasswordStub() {
    throw new NotImplementedException('Tính năng đang phát triển.');
  }
}
