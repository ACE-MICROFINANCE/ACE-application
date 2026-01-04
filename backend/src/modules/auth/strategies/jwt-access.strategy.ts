import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // CHANGED: actor id as string
  actorKind: 'CUSTOMER' | 'STAFF'; // CHANGED: RBAC actor kind
  memberNo?: string;
  role?: 'ADMIN' | 'BRANCH_MANAGER';
  branchCode?: string | null;
  groupCode?: string | null;
}

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      memberNo: payload.memberNo,
      actorKind: payload.actorKind, // CHANGED: attach actorKind to request
      role: payload.role, // CHANGED: attach staff role
      branchCode: payload.branchCode ?? null, // CHANGED: attach branchCode
      groupCode: payload.groupCode ?? null, // CHANGED: attach groupCode
    };
  }
}
