import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Complaint, ComplaintSchema } from '../complaints/complaint.schema';
import { Org, OrgSchema } from '../orgs/orgs.schema';
import { Society, SocietySchema } from '../societies/society.schema';
import { User, UserSchema } from '../users/user.schema';
import { OrgComplaint, OrgComplaintSchema } from '../org-complaints/org-complaints.schema';
import { Event, EventSchema } from '../events/event.schema';
import { Notification, NotificationSchema } from '../notifications/notification.schema';
import { SocietyMembership, SocietyMembershipSchema } from '../societies/membership.schema';
import { NgoUser, NgoUserSchema } from '../ngo-users/ngo-user.schema';
import { OrganizationUser, OrganizationUserSchema } from '../organization-users/organization-user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Complaint.name, schema: ComplaintSchema },
      { name: Org.name, schema: OrgSchema },
      { name: Society.name, schema: SocietySchema },
      { name: User.name, schema: UserSchema },
      { name: OrgComplaint.name, schema: OrgComplaintSchema },
      { name: Event.name, schema: EventSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: SocietyMembership.name, schema: SocietyMembershipSchema },
      { name: NgoUser.name, schema: NgoUserSchema },
      { name: OrganizationUser.name, schema: OrganizationUserSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
