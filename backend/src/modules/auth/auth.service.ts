import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../../database/prisma.service';
import { comparePassword, hashPassword, generateNumericPassword } from '../../utils/password.util';
import { computeExpiryDate, hashToken } from '../../utils/token.util';
import { JwtPayload } from './strategies/jwt-access.strategy';
import { EmailNotificationService } from '../notifications/email-notification.service';
import { BijliCustomerSyncService } from '../customers/bijli-customer-sync.service';
import { formatVietnameseName } from '../../common/utils/string.utils';
import { isNumericString } from '../../utils/numeric-string.util';
import { TempPasswordCryptoService } from '../../common/services/temp-password-crypto.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly bijliCustomerSyncService: BijliCustomerSyncService,
    private readonly tempPasswordCryptoService: TempPasswordCryptoService,
  ) {}

  private getExpiresIn(key: string, fallback: string): string | number {
    return (this.configService.get<string>(key) ?? fallback) as string | number;
  }

  private getStaffTempPasswordTtlMinutes() {
    return Number(this.configService.get<number>('auth.staffTempPasswordTtlMinutes') ?? 30);
  }

  private getStaffPasswordExpiryMonths() {
    return Number(this.configService.get<number>('auth.staffPasswordExpiryMonths') ?? 6);
  }

  private getSessionMaxMinutes() {
    return Number(this.configService.get<number>('jwt.sessionMaxMinutes') ?? 10);
  }

  private toRemainingSeconds(expiresAt: Date) {
    const seconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    return Math.max(1, seconds);
  }

  private resolveSessionExpiry(refreshExpiresIn: string | number, absoluteSessionExpiresAt?: Date | null) {
    let sessionExpiresAt = computeExpiryDate(refreshExpiresIn);
    const sessionMaxMinutes = this.getSessionMaxMinutes();

    if (Number.isFinite(sessionMaxMinutes) && sessionMaxMinutes > 0) {
      const hardLimit = new Date(Date.now() + sessionMaxMinutes * 60 * 1000);
      if (hardLimit.getTime() < sessionExpiresAt.getTime()) {
        sessionExpiresAt = hardLimit;
      }
    }

    if (absoluteSessionExpiresAt && absoluteSessionExpiresAt.getTime() < sessionExpiresAt.getTime()) {
      sessionExpiresAt = absoluteSessionExpiresAt;
    }

    return sessionExpiresAt;
  }

  private addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
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
      branchCode: customer.branchCode ?? null,
      branchName: customer.branchName ?? null,
      membershipStartDate: customer.membershipStartDate,
      mustChangePassword: customer.credential?.mustChangePassword ?? true,
    };
  }

  private toStaffProfile(staff: {
    email: string;
    role: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM';
    branchCode?: string | null;
    fullName?: string | null;
  }) {
    return {
      actorKind: 'STAFF',
      role: staff.role,
      branchCode: staff.branchCode ?? null,
      email: staff.email,
      fullName: staff.fullName ?? null,
    };
  }

  private async signAccessToken(payload: JwtPayload, sessionExpiresAt?: Date | null) {
    const accessExpiresIn = this.getExpiresIn('jwt.accessExpiresIn', '15m') as string | number;
    let accessExpiresAt = computeExpiryDate(accessExpiresIn);
    const sessionMaxMinutes = this.getSessionMaxMinutes();

    if (Number.isFinite(sessionMaxMinutes) && sessionMaxMinutes > 0) {
      const hardLimit = new Date(Date.now() + sessionMaxMinutes * 60 * 1000);
      if (hardLimit.getTime() < accessExpiresAt.getTime()) {
        accessExpiresAt = hardLimit;
      }
    }

    if (sessionExpiresAt && sessionExpiresAt.getTime() < accessExpiresAt.getTime()) {
      accessExpiresAt = sessionExpiresAt;
    }

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: this.toRemainingSeconds(accessExpiresAt) as any,
    });
  }

  private async issueTokens(
    customer: Prisma.CustomerGetPayload<{ include: { credential: true } }>,
    absoluteSessionExpiresAt?: Date | null,
  ) {
    if (!customer.credential) {
      throw new UnauthorizedException('Invalid account state.');
    }

    const payload: JwtPayload = {
      sub: customer.id.toString(),
      actorKind: 'CUSTOMER',
      memberNo: customer.memberNo,
      branchCode: customer.branchCode ?? null,
      groupCode: customer.groupCode ?? null,
      tokenVersion: customer.credential.tokenVersion,
      accessibilityEnabled: customer.accessibilityEnabled === true,
    };

    const refreshExpiresIn = this.getExpiresIn('jwt.refreshExpiresIn', '7d') as string | number;
    const sessionExpiresAt = this.resolveSessionExpiry(refreshExpiresIn, absoluteSessionExpiresAt);

    const accessToken = await this.signAccessToken(payload, sessionExpiresAt);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.toRemainingSeconds(sessionExpiresAt) as any,
    });

    await this.prisma.refreshToken.create({
      data: {
        customerId: customer.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: sessionExpiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private async getCustomerWithCredential(where: Prisma.CustomerWhereUniqueInput) {
    return this.prisma.customer.findUnique({
      where,
      include: { credential: true },
    });
  }

  async login(dto: LoginDto) {
    const identifier = (dto.identifier ?? dto.memberNo ?? '').trim();
    if (!identifier) {
      throw new BadRequestException('Thông tin đăng nhập không hợp lệ.');
    }

    // STAFF login by email
    if (identifier.includes('@')) {
      const staff = await this.prisma.staffUser.findUnique({
        where: { email: identifier.toLowerCase() },
      });
      if (!staff) {
        throw new UnauthorizedException('Thông tin đăng nhập không đúng.');
      }
      if (!staff.isActive) {
        if (staff.role === 'ADMIN') {
          throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
        }
        throw new UnauthorizedException('Thông tin đăng nhập không đúng.');
      }

      const validStaff = await comparePassword(dto.password, staff.passwordHash);
      if (!validStaff) {
        throw new UnauthorizedException('Thông tin đăng nhập không đúng.');
      }

      const rawRole = staff.role as string;
      const mappedRole =
        rawRole === 'BRANCH_MANAGER' || rawRole === 'BM'
          ? 'BM'
          : rawRole === 'BA' || rawRole === 'Branch Assistant'
          ? 'BA'
          : rawRole === 'ADMIN' || rawRole === 'SUPER_ADMIN'
          ? (rawRole as 'ADMIN' | 'SUPER_ADMIN')
          : null;
      const staffRole = mappedRole;
      if (!staffRole) {
        if (rawRole === 'SSO') {
          throw new UnauthorizedException('Tài khoản CCO/SSO không được đăng nhập.');
        }
        throw new UnauthorizedException('Thông tin đăng nhập không đúng.');
      }

      // Temp password TTL check
      const ttlMinutes = this.getStaffTempPasswordTtlMinutes();
      let tempPasswordActive = false;
      if (staff.tempPasswordIssuedAt) {
        const diffMs = Date.now() - new Date(staff.tempPasswordIssuedAt).getTime();
        const diffMin = diffMs / (1000 * 60);
        tempPasswordActive = diffMin <= ttlMinutes;
        if (!tempPasswordActive) {
          throw new UnauthorizedException('Mật khẩu tạm đã hết hạn. Vui lòng yêu cầu lại.');
        }
      }

      // Password expiry for BA/BM/ADMIN (not SUPER_ADMIN)
      let passwordExpired = false;
      let passwordExpiresAt: Date | null = null;
      if (staffRole !== 'SUPER_ADMIN') {
        const expiryMonths = this.getStaffPasswordExpiryMonths();
        const base = staff.passwordUpdatedAt ?? staff.createdAt ?? new Date(0);
        passwordExpiresAt = this.addMonths(new Date(base), expiryMonths);
        if (Date.now() > passwordExpiresAt.getTime()) {
          passwordExpired = true;
          if (!staff.mustChangePassword) {
            await this.prisma.staffUser.update({
              where: { id: staff.id },
              data: { mustChangePassword: true },
            });
            staff.mustChangePassword = true;
          }
        }
      }

      const staffPayload: JwtPayload = {
        sub: staff.id.toString(),
        actorKind: 'STAFF',
        role: staffRole,
        branchCode: staff.branchCode ?? null,
        tokenVersion: staff.tokenVersion,
      };

      const accessToken = await this.signAccessToken(staffPayload);
      return {
        accessToken,
        profile: {
          ...this.toStaffProfile({ ...staff, role: staffRole }),
          mustChangePassword: !!staff.mustChangePassword,
          passwordExpired,
          passwordExpiresAt: passwordExpiresAt ? passwordExpiresAt.toISOString() : null,
          tempPasswordActive,
        },
      };
    }

    // CUSTOMER login by memberNo
    if (!isNumericString(identifier)) {
      throw new BadRequestException('Mã khách hàng không hợp lệ.');
    }

    const customer = await this.getCustomerWithCredential({ memberNo: identifier });
    if (!customer || !customer.isActive || !customer.credential || !customer.credential.isActive) {
      throw new UnauthorizedException('Thông tin đăng nhập không đúng.');
    }

    const isValid = await comparePassword(dto.password, customer.credential.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không đúng.');
    }

    await this.prisma.customerCredential.update({
      where: { customerId: customer.id },
      data: { lastLoginAt: new Date() },
    });

    this.bijliCustomerSyncService.syncMemberNo(customer.memberNo).catch(() => undefined);

    let loginCustomer = customer;

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
          // ignore
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
        branchName: loginCustomer.branchName ?? null,
        groupCode: loginCustomer.groupCode ?? null,
        groupName: loginCustomer.groupName ?? null,
        accessibilityEnabled: loginCustomer.accessibilityEnabled === true,
      },
    };
  }

  async changePassword(user: any, dto: ChangePasswordDto) {
    if (dto.confirmPassword && dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Mật khẩu mới và xác nhận không khớp.');
    }

    if (user?.actorKind === 'STAFF') {
      const staffId = BigInt(user.userId);
      const staff = await this.prisma.staffUser.findUnique({ where: { id: staffId } });
      if (!staff || !staff.isActive) {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa.');
      }

      const mustChange = staff.mustChangePassword === true;
      if (!mustChange) {
        if (!dto.oldPassword) {
          throw new BadRequestException('Cần nhập mật khẩu hiện tại.');
        }
        const validOld = await comparePassword(dto.oldPassword, staff.passwordHash);
        if (!validOld) {
          throw new BadRequestException('Mật khẩu hiện tại không đúng.');
        }
        if (dto.oldPassword === dto.newPassword) {
          throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại.');
        }
      }

      const newHash = await hashPassword(dto.newPassword);
      await this.prisma.staffUser.update({
        where: { id: staffId },
        data: {
          passwordHash: newHash,
          tokenVersion: { increment: 1 },
          mustChangePassword: false,
          passwordUpdatedAt: new Date(),
          tempPasswordEncrypted: null,
          tempPasswordIssuedAt: null,
        },
      });
      return { success: true };
    }

    // CUSTOMER branch
    const id = BigInt(user.userId ?? user);
    const customer = await this.getCustomerWithCredential({ id });
    if (!customer || !customer.credential || !customer.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa.');
    }

    const mustChangeNow = customer.credential?.mustChangePassword === true;
    if (!mustChangeNow) {
      if (!dto.oldPassword) {
        throw new BadRequestException('Cần nhập mật khẩu hiện tại.');
      }
      if (dto.newPassword === dto.oldPassword) {
        throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại.');
      }
      const validOld = await comparePassword(dto.oldPassword, customer.credential.passwordHash);
      if (!validOld) {
        throw new BadRequestException('Mật khẩu hiện tại không đúng.');
      }
    }

    const newHash = await hashPassword(dto.newPassword);

    await this.prisma.customerCredential.update({
      where: { customerId: id },
      data: {
        passwordHash: newHash,
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
        passwordUpdatedAt: new Date(),
        tempPasswordEncrypted: null,
        tempPasswordIssuedAt: null,
      },
    });

    await this.prisma.refreshToken.updateMany({
      where: { customerId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const refreshedCustomer = await this.getCustomerWithCredential({ id });
    if (!refreshedCustomer) {
      throw new UnauthorizedException('Tài khoản không tồn tại.');
    }

    const tokens = await this.issueTokens(refreshedCustomer);
    return {
      ...tokens,
      customer: this.toCustomerResponse(refreshedCustomer),
    };
  }

  async staffForgotPassword(email: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });
    if (!staff || !staff.isActive) return;
    const role = staff.role as string;
    if (!['BA', 'BM', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'Branch Assistant'].includes(role)) return;

    const tempPassword = generateNumericPassword(6, 6);
    const passwordHash = await hashPassword(tempPassword);
    const issuedAt = new Date();
    const encrypted = this.tempPasswordCryptoService.encrypt(tempPassword);

    // Update immediately
    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        mustChangePassword: true,
        passwordUpdatedAt: issuedAt,
        tempPasswordEncrypted: encrypted,
        tempPasswordIssuedAt: issuedAt,
      },
    });

    // Send mail async (non-blocking)
    const ttl = this.getStaffTempPasswordTtlMinutes();
    setImmediate(() => {
      this.emailNotificationService
        .sendStaffTempPassword({ email: staff.email, fullName: staff.fullName }, tempPassword, ttl)
        .catch((err) => {
          // log nhưng không chặn response
          console.error('[staffForgotPassword] send mail failed', err?.message || err);
        });
    });
  }

  async refresh(
    user: { userId: string; actorKind?: 'CUSTOMER' | 'STAFF'; tokenVersion?: number },
    refreshToken: string,
  ) {
    if (user.actorKind !== 'CUSTOMER') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const id = BigInt(user.userId);
    const hashed = hashToken(refreshToken);
    const now = new Date();

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        customerId: id,
        tokenHash: hashed,
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    if (tokenRecord.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { customerId: id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    if (tokenRecord.expiresAt <= now) {
      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }

    const customer = await this.getCustomerWithCredential({ id });
    if (!customer || !customer.isActive || !customer.credential || !customer.credential.isActive) {
      throw new UnauthorizedException('Account is inactive or does not exist.');
    }

    if (Number(user.tokenVersion ?? 0) !== customer.credential.tokenVersion) {
      await this.prisma.refreshToken.updateMany({
        where: { customerId: id, revokedAt: null },
        data: { revokedAt: now },
      });
      throw new UnauthorizedException('Session is no longer valid.');
    }

    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: now },
    });

    const tokens = await this.issueTokens(customer, tokenRecord.expiresAt);
    return {
      ...tokens,
      customer: this.toCustomerResponse(customer),
    };
  }

  async logout(
    user: { userId: string; actorKind?: 'CUSTOMER' | 'STAFF' },
    refreshToken: string,
  ) {
    if (user.actorKind !== 'CUSTOMER') {
      return { success: true };
    }

    const id = BigInt(user.userId);
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

    const tempPassword = generateNumericPassword(6, 6);
    const passwordHash = await hashPassword(tempPassword);
    const encryptedTempPassword = this.tempPasswordCryptoService.encrypt(tempPassword);
    const issuedAt = new Date();

    if (customer.credential) {
      await this.prisma.customerCredential.update({
        where: { customerId: customer.id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          mustChangePassword: true,
          tempPasswordEncrypted: encryptedTempPassword,
          tempPasswordIssuedAt: issuedAt,
        },
      });
    } else {
      await this.prisma.customerCredential.create({
        data: {
          customerId: customer.id,
          passwordHash,
          mustChangePassword: true,
          tempPasswordEncrypted: encryptedTempPassword,
          tempPasswordIssuedAt: issuedAt,
        },
      });
    }

    await this.prisma.refreshToken.updateMany({
      where: { customerId: customer.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Gửi mail async để API trả về nhanh
    setImmediate(() => {
      if (!customer.branchCode) {
        console.warn(
          `[requestPasswordReset] missing branchCode for memberNo=${customer.memberNo}, skip email dispatch`,
        );
        return;
      }

      this.prisma.staffUser
        .findMany({
          where: {
            isActive: true,
            branchCode: customer.branchCode,
            role: { in: ['BM', 'BA'] },
          },
          select: { email: true },
        })
        .then((staffRows) => {
          const recipients = Array.from(
            new Set(
              staffRows
                .map((s) => s.email?.trim().toLowerCase())
                .filter((email): email is string => Boolean(email)),
            ),
          );

          if (!recipients.length) {
            console.warn(
              `[requestPasswordReset] no BM/BA recipient found for branch=${customer.branchCode ?? 'null'} memberNo=${customer.memberNo}`,
            );
            return;
          }

          return this.emailNotificationService.sendPasswordResetToStaff(
            customer,
            tempPassword,
            recipients,
          );
        })
        .catch((err) => {
          console.error('[requestPasswordReset] send mail failed', err?.message || err);
        });
    });
  }
}
