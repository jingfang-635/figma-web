import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { DepartmentsModule } from './departments/departments.module';
import { DoctorsModule } from './doctors/doctors.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PatientsModule } from './patients/patients.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NotificationLogsModule } from './notification-logs/notification-logs.module';
import { AddressesModule } from './addresses/addresses.module';
import { BannersModule } from './banners/banners.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { NewsModule } from './news/news.module';
import { NewsCategoriesModule } from './news-categories/news-categories.module';
import { NavItemsModule } from './nav-items/nav-items.module';
import { FeedbackModule } from './feedback/feedback.module';
import { AppointmentRulesModule } from './appointment-rules/appointment-rules.module';
import { OperationLogsModule } from './operation-logs/operation-logs.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    DepartmentsModule,
    DoctorsModule,
    SchedulesModule,
    AppointmentsModule,
    PatientsModule,
    OrdersModule,
    ReviewsModule,
    NotificationsModule,
    NotificationLogsModule,
    AddressesModule,
    BannersModule,
    AnnouncementsModule,
    NewsModule,
    NewsCategoriesModule,
    NavItemsModule,
    FeedbackModule,
    AppointmentRulesModule,
    OperationLogsModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
