import { Module } from '@nestjs/common';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';
import { UsersModule } from '../users/users.module';
import { SocietiesModule } from '../societies/societies.module';

@Module({
  imports: [
    UsersModule,
    SocietiesModule, // Provides Announcement model and PlatformUserGuard dependencies
  ],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
