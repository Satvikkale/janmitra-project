import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { HealthController } from './health.controller';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SocietiesModule } from './societies/societies.module';

import { OrgsModule } from './orgs/orgs.module';
import { RoutingModule } from './routing/routing.module';

import { UploadsModule } from './uploads/uploads.module';
import { RealtimeModule } from './realtime/realtime.module';

import { ComplaintsModule } from './complaints/complaints.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnnouncementsModule } from './announcements/announcements.module';

import { NgoUsersModule } from './ngo-users/ngo-users.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BlockchainModule } from './blockchain/blockchain.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    SocietiesModule,
    OrgsModule,
    RoutingModule,
    UploadsModule,
    RealtimeModule,
    ComplaintsModule,
    AnalyticsModule,
    AnnouncementsModule,
    NgoUsersModule,
    EventsModule,
    NotificationsModule,
    BlockchainModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}