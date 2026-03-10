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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Complaint.name, schema: ComplaintSchema },
      { name: ComplaintEvent.name, schema: ComplaintEventSchema },
      { name: SocietyMembership.name, schema: SocietyMembershipSchema },
      { name: Society.name, schema: SocietySchema },
    ]),
    UsersModule,
    RealtimeModule,
    RoutingModule,
    AIModule,
    UploadsModule,
    BlockchainModule,
    NotificationsModule,
  ],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}