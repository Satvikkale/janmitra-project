import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Complaint, ComplaintSchema, ComplaintEvent, ComplaintEventSchema } from './complaint.schema';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { RoutingModule } from 'src/routing/routing.module';
import { UsersModule } from 'src/users/users.module';
import { SocietyMembership, SocietyMembershipSchema } from 'src/societies/membership.schema';
import { Society, SocietySchema } from 'src/societies/society.schema';
import { AIModule } from 'src/ai/ai.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrgComplaintsModule } from '../org-complaints/org-complaints.module';
import { NgoUsersModule } from '../ngo-users/ngo-users.module';
import { OrganizationUsersModule } from '../organization-users/organization-users.module';
import { Org, OrgSchema } from '../orgs/orgs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Complaint.name, schema: ComplaintSchema },
      { name: ComplaintEvent.name, schema: ComplaintEventSchema },
      { name: SocietyMembership.name, schema: SocietyMembershipSchema },
      { name: Society.name, schema: SocietySchema },
      { name: Org.name, schema: OrgSchema },
    ]),
    UsersModule,
    NgoUsersModule,
    OrganizationUsersModule,
    RealtimeModule,
    RoutingModule,
    AIModule,
    UploadsModule,
    BlockchainModule,
    NotificationsModule,
    OrgComplaintsModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}