import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ConfigValidationSchema } from './config/config.module';
import { PrismaService } from './database/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { WeatherModule } from './weather/weather.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: ConfigValidationSchema,
    }),
    AuthModule,
    CustomersModule,
    WeatherModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
