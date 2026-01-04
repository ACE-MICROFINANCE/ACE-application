import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ConfigValidationSchema } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AdminModule } from './modules/admin/admin.module';
import { LoansModule } from './modules/loans/loans.module';
import { SavingsModule } from './modules/savings/savings.module';
import { EventsModule } from './modules/events/events.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { WeatherModule } from './weather/weather.module';
import { StaffUsersModule } from './modules/staff-users/staff-users.module'; // CHANGED: staff users RBAC

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: ConfigValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    AdminModule,
    LoansModule,
    SavingsModule,
    EventsModule,
    FeedbackModule,
    DashboardModule,
    WeatherModule,
    StaffUsersModule, // CHANGED: staff users RBAC
  ],
})
export class AppModule {}
