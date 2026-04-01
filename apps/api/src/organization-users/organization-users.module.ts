import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrganizationUser, OrganizationUserSchema } from './organization-user.schema';
import { OrganizationUsersService } from './organization-users.service';
import { OrganizationUsersController } from './organization-users.controller';
import { Org, OrgSchema } from '../orgs/orgs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OrganizationUser.name, schema: OrganizationUserSchema },
      { name: Org.name, schema: OrgSchema },
    ]),
  ],
  controllers: [OrganizationUsersController],
  providers: [OrganizationUsersService],
  exports: [OrganizationUsersService],
})
export class OrganizationUsersModule {}
