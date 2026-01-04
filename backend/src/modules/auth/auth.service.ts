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
import { NotificationService } from '../notifications/notification.service';
import { generateNumericPassword } from '../../utils/password.util';
import { BijliCustomerSyncService } from '../customers/bijli-customer-sync.service';
import { formatVietnameseName } from '../../common/utils/string.utils';
import { isNumericString } from '../../utils/numeric-string.util'; // CHANGED: validate memberNo input

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly bijliCustomerSyncService: BijliCustomerSyncService, // [BIJLI-CUSTOMER] sync profile on login
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
      branchCode: customer.branchCode ?? null, // CHANGED: include branchCode for RBAC
      branchName: customer.branchName ?? null, // CHANGED: include branchName for profile
      membershipStartDate: customer.membershipStartDate,
      mustChangePassword: customer.credential?.mustChangePassword ?? true,
    };
  }

  private toStaffProfile(staff: { email: string; role: string; branchCode?: string | null; fullName?: string | null }) {
    return {
      actorKind: 'STAFF',
      role: staff.role,
      branchCode: staff.branchCode ?? null,
      email: staff.email,
      fullName: staff.fullName ?? null,
    };
  }

  private async signAccessToken(payload: JwtPayload) {
    const accessExpiresIn = this.getExpiresIn('jwt.accessExpiresIn', '15m') as string | number;
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn as any,
    });
  }

  private async issueTokens(customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>) {
    const payload: JwtPayload = {
      sub: customer.id.toString(),
      actorKind: 'CUSTOMER', // CHANGED: mark customer tokens
      memberNo: customer.memberNo,
      branchCode: customer.branchCode ?? null, // CHANGED: branchCode in JWT
      groupCode: customer.groupCode ?? null, // CHANGED: groupCode in JWT
    };

    const refreshExpiresIn = this.getExpiresIn('jwt.refreshExpiresIn', '7d') as string | number;

    const accessToken = await this.signAccessToken(payload); // CHANGED: reuse access token signer

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
    const identifier = (dto.identifier ?? dto.memberNo ?? '').trim(); // CHANGED: support identifier/memberNo
    if (!identifier) {
      throw new BadRequestException('Thong tin dang nhap khong hop le'); // CHANGED: validate login input
    }

    if (identifier.includes('@')) {
      const staff = await this.prisma.staffUser.findUnique({
        where: { email: identifier.toLowerCase() },
      }); // CHANGED: staff login by email

      if (!staff || !staff.isActive) {
        throw new UnauthorizedException('Thong tin dang nhap khong hop le'); // CHANGED: staff login error
      }

      const validStaff = await comparePassword(dto.password, staff.passwordHash);
      if (!validStaff) {
        throw new UnauthorizedException('Thong tin dang nhap khong hop le'); // CHANGED: staff login error
      }

      const staffRole =
        staff.role === 'ADMIN' || staff.role === 'BRANCH_MANAGER' ? staff.role : null; // CHANGED: narrow staff role
      if (!staffRole) {
        throw new UnauthorizedException('Thong tin dang nhap khong hop le'); // CHANGED: invalid role
      }

      const staffPayload: JwtPayload = {
        sub: staff.id.toString(),
        actorKind: 'STAFF',
        role: staffRole,
        branchCode: staff.branchCode ?? null,
      };

      const accessToken = await this.signAccessToken(staffPayload); // CHANGED: staff access token
      return {
        accessToken,
        profile: this.toStaffProfile({ ...staff, role: staffRole }), // CHANGED: use validated role
      };
    }

    if (!isNumericString(identifier)) {
      throw new BadRequestException('Ma khach hang khong hop le'); // CHANGED: numeric validation for customer
    }


    const customer = await this.getCustomerWithCredential({ memberNo: identifier });
    if (!customer || !customer.isActive || !customer.credential) {
      throw new UnauthorizedException('Thông tin đăng nhập không đúng');
    }

    const isValid = await comparePassword(dto.password, customer.credential.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không đúng');
    }

    await this.prisma.customerCredential.update({
      where: { customerId: customer.id },
      data: { lastLoginAt: new Date() },
    });

    let loginCustomer = customer;
    try {
      await this.bijliCustomerSyncService.syncMemberNo(customer.memberNo); // [BIJLI-CUSTOMER] refresh profile each login
      const refreshed = await this.getCustomerWithCredential({ id: customer.id }); // [BIJLI-CUSTOMER] load latest profile
      if (refreshed) {
        loginCustomer = refreshed; // [BIJLI-CUSTOMER] return updated data to FE
      }
    } catch {
      // [BIJLI-CUSTOMER] ignore BIJLI errors to keep login working
    }

    if (loginCustomer.fullName) {
      const formattedName = formatVietnameseName(loginCustomer.fullName);
      if (formattedName !== loginCustomer.fullName) {
        try {
          loginCustomer = await this.prisma.customer.update({
            where: { id: loginCustomer.id },
            data: { fullName: formattedName },
            include: { credential: true },
          });
        } catch {
          // Khong chan login neu cap nhat ten that bai.
        }
      }
    }

    const tokens = await this.issueTokens(loginCustomer);
    return {
      ...tokens,
      customer: this.toCustomerResponse(loginCustomer),
      profile: {
        actorKind: 'CUSTOMER',
        memberNo: loginCustomer.memberNo,
        fullName: loginCustomer.fullName,
        branchCode: loginCustomer.branchCode ?? null,
        branchName: loginCustomer.branchName ?? null, // CHANGED: include branchName in profile
        groupCode: loginCustomer.groupCode ?? null,
        groupName: loginCustomer.groupName ?? null,
      }, // CHANGED: include profile payload for RBAC
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.confirmPassword && dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận không khớp');
    }
    const id = BigInt(userId);
    const customer = await this.getCustomerWithCredential({ id });
    if (!customer || !customer.credential || !customer.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    const mustChangeNow = customer.credential?.mustChangePassword === true;
    if (!mustChangeNow) {
      if (!dto.oldPassword) {
        throw new BadRequestException('Cần nhập mật khẩu hiện tại');
      }
      if (dto.newPassword === dto.oldPassword) {
        throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
      }
      const validOld = await comparePassword(dto.oldPassword, customer.credential.passwordHash);
      if (!validOld) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng');
      }
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
      throw new UnauthorizedException('Tài khoản không tồn tại');
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
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const customer = await this.getCustomerWithCredential({ id });
    if (!customer || !customer.isActive || !customer.credential) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa');
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

  async requestPasswordReset(memberNo: string) {
    const customer = await this.getCustomerWithCredential({ memberNo });
    if (!customer) {
      // Do not expose existence of memberNo
      return;
    }

    const tempPassword = generateNumericPassword(6, 8);
    const passwordHash = await hashPassword(tempPassword);

    if (customer.credential) {
      await this.prisma.customerCredential.update({
        where: { customerId: customer.id },
        data: { passwordHash, mustChangePassword: true },
      });
    } else {
      await this.prisma.customerCredential.create({
        data: {
          customerId: customer.id,
          passwordHash,
          mustChangePassword: true,
        },
      });
    }

    await this.notificationService.sendPasswordResetToStaff(customer, tempPassword);
  }
}
