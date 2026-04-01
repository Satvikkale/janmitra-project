import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Org, OrgSchema } from './orgs.schema';
import { OrgsService } from './orgs.service';
import { OrgsController } from './orgs.Controller';
import { OrgComplaintsModule } from '../org-complaints/org-complaints.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Org.name, schema: OrgSchema }]), OrgComplaintsModule],
  controllers: [OrgsController],
  providers: [OrgsService],
  exports: [OrgsService],
})
export class OrgsModule {}