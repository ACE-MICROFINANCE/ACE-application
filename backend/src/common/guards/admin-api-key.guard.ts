import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const headerKey = request.headers['x-admin-key'] as string | undefined;
    const expected = this.configService.get<string>('admin.apiKey');

    if (!expected || headerKey !== expected) {
      throw new UnauthorizedException('Invalid admin API key');
    }

    return true;
  }
}
