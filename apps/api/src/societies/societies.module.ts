import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Society, SocietySchema } from './society.schema';
import { SocietyMembership, SocietyMembershipSchema } from './membership.schema';
import { Announcement, AnnouncementSchema } from './announcement.schema';
import { SocietiesController } from './societies.controller';
import { User, UserSchema } from '../users/user.schema';
import { UsersModule } from '../users/users.module';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { OptionalPlatformUserGuard } from '../auth/optional-platform-user.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Society.name, schema: SocietySchema },
      { name: SocietyMembership.name, schema: SocietyMembershipSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
  ],
  controllers: [SocietiesController],
  providers: [OptionalJwtAuthGuard, OptionalPlatformUserGuard],
  exports: [MongooseModule],
})
export class SocietiesModule {}