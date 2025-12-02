import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt-access.strategy';

const cookieOrBodyExtractor = (req: any): string | null => {
  if (req?.body?.refreshToken) {
    return req.body.refreshToken;
  }
  if (req?.cookies?.refreshToken) {
    return req.cookies.refreshToken;
  }
  return null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([cookieOrBodyExtractor]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: any, payload: JwtPayload) {
    const refreshToken = cookieOrBodyExtractor(req);
    return { userId: payload.sub, memberNo: payload.memberNo, refreshToken };
  }
}
