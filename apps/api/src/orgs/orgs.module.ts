import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Org, OrgSchema } from './orgs.schema';
import { OrgsService } from './orgs.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Org.name, schema: OrgSchema }])],
  providers: [OrgsService],
  exports: [OrgsService],
})
export class OrgsModule {}