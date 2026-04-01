import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgComplaintsService } from './org-complaints.service';
import { OrgComplaintsController } from './org-complaints.controller';
import { OrgComplaint, OrgComplaintSchema } from './org-complaints.schema';
import { UsersModule } from '../users/users.module';
import { SocietyMembership, SocietyMembershipSchema } from '../societies/membership.schema';
import { Society, SocietySchema } from '../societies/society.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrgComplaint.name, schema: OrgComplaintSchema },
      { name: SocietyMembership.name, schema: SocietyMembershipSchema },
      { name: Society.name, schema: SocietySchema },
    ]),
    UsersModule,
  ],
  controllers: [OrgComplaintsController],
  providers: [OrgComplaintsService],
  exports: [OrgComplaintsService],
})
export class OrgComplaintsModule {}
