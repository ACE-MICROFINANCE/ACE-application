import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../../database/prisma.service';
import { comparePassword, hashPassword } from '../../utils/password.util';
import { computeExpiryDate, hashToken } from '../../utils/token.util';
import { JwtPayload } from './strategies/jwt-access.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getExpiresIn(key: string, fallback: string): string | number {
    return (this.configService.get<string>(key) ?? fallback) as string | number;
  }

  private toCustomerResponse(customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>) {
    return {
      id: Number(customer.id),
      memberNo: customer.memberNo,
      fullName: customer.fullName,
      gender: customer.gender,
      idCardNumber: customer.idCardNumber,
      phoneNumber: customer.phoneNumber,
      locationType: customer.locationType,
      villageName: customer.villageName,
      groupCode: customer.groupCode,
      groupName: customer.groupName,
      membershipStartDate: customer.membershipStartDate,
      mustChangePassword: customer.credential?.mustChangePassword ?? true,
    };
  }

  private async issueTokens(customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>) {
    const payload: JwtPayload = {
      sub: customer.id.toString(),
      memberNo: customer.memberNo,
    };

    const accessExpiresIn = this.getExpiresIn('jwt.accessExpiresIn', '15m') as string | number;
    const refreshExpiresIn = this.getExpiresIn('jwt.refreshExpiresIn', '7d') as string | number;

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn as any,
    });

    await this.prisma.refreshToken.create({
      data: {
        customerId: customer.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: computeExpiryDate(refreshExpiresIn),
      },
    });

    return { accessToken, refreshToken };
  }

  private async getCustomerWithCredential(where: Prisma.CustomerWhereUniqueInput) {
    const customer = await this.prisma.customer.findUnique({
      where,
      include: { credential: true },
    });
    return customer;
  }

  async login(dto: LoginDto) {
    const customer = await this.getCustomerWithCredential({ memberNo: dto.memberNo });
    if (!customer || !customer.isActive || !customer.credential) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await comparePassword(dto.password, customer.credential.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.customerCredential.update({
      where: { customerId: customer.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(customer);
    return {
      ...tokens,
      customer: this.toCustomerResponse(customer),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }
    if (dto.newPassword === dto.oldPassword) {
      throw new BadRequestException('New password must be different from old password');
    }

    const id = BigInt(userId);
    const customer = await this.getCustomerWithCredential({ id });
    if (!customer || !customer.credential || !customer.isActive) {
      throw new UnauthorizedException('Customer not found or inactive');
    }

    const validOld = await comparePassword(dto.oldPassword, customer.credential.passwordHash);
    if (!validOld) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);

    await this.prisma.customerCredential.update({
      where: { customerId: id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordUpdatedAt: new Date(),
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { customerId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const refreshedCustomer = await this.getCustomerWithCredential({ id });
    if (!refreshedCustomer) {
      throw new UnauthorizedException('Customer not found');
    }

    const tokens = await this.issueTokens(refreshedCustomer);
    return {
      ...tokens,
      customer: this.toCustomerResponse(refreshedCustomer),
    };
  }

  async refresh(userId: string, refreshToken: string) {
    const id = BigInt(userId);
    const hashed = hashToken(refreshToken);

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        customerId: id,
        tokenHash: hashed,
        revokedAt: null,
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const customer = await this.getCustomerWithCredential({ id });
    if (!customer || !customer.isActive || !customer.credential) {
      throw new UnauthorizedException('Customer not found or inactive');
    }

    const tokens = await this.issueTokens(customer);
    return {
      ...tokens,
      customer: this.toCustomerResponse(customer),
    };
  }

  async logout(userId: string, refreshToken: string) {
    const id = BigInt(userId);
    const hashed = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { customerId: id, tokenHash: hashed, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
  }
}
