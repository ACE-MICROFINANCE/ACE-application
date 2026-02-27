import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  actorKind: 'CUSTOMER' | 'STAFF';
  memberNo?: string;
  role?: 'ADMIN' | 'SUPER_ADMIN' | 'BA' | 'BM';
  branchCode?: string | null;
  groupCode?: string | null;
  tokenVersion?: number;
  accessibilityEnabled?: boolean;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const tokenVersion = Number(payload.tokenVersion ?? 0);

    if (payload.actorKind === 'STAFF' && payload.sub) {
      const staff = await this.prisma.staffUser.findUnique({
        where: { id: BigInt(payload.sub) },
        select: { id: true, isActive: true, tokenVersion: true },
      });

      if (!staff || !staff.isActive) {
        throw new UnauthorizedException('Account is inactive or does not exist.');
      }
      if (tokenVersion !== staff.tokenVersion) {
        throw new UnauthorizedException('Session is no longer valid.');
      }
    }

    if (payload.actorKind === 'CUSTOMER' && payload.sub) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: BigInt(payload.sub) },
        select: {
          id: true,
          isActive: true,
          credential: {
            select: {
              isActive: true,
              tokenVersion: true,
            },
          },
        },
      });

      if (!customer || !customer.isActive || !customer.credential?.isActive) {
        throw new UnauthorizedException('Account is inactive or does not exist.');
      }
      if (tokenVersion !== customer.credential.tokenVersion) {
        throw new UnauthorizedException('Session is no longer valid.');
      }
    }

    return {
      userId: payload.sub,
      memberNo: payload.memberNo,
      actorKind: payload.actorKind,
      role: payload.role,
      branchCode: payload.branchCode ?? null,
      groupCode: payload.groupCode ?? null,
      tokenVersion,
      accessibilityEnabled: payload.accessibilityEnabled ?? undefined,
    };
  }
}
