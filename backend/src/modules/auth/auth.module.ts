import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { SignOptions } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { PrismaModule } from '../../database/prisma.module';
import { NotificationModule } from '../notifications/notification.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    CustomersModule, // [BIJLI-CUSTOMER] allow customer sync service in auth
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('jwt.accessSecret');
        const expiresIn = (configService.get<string>('jwt.accessExpiresIn') ?? '15m') as SignOptions['expiresIn'];
        return {
          secret,
          signOptions: { expiresIn },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
