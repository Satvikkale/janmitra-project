import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NgoUsersService } from './ngo-users.service';
import { NgoUsersController } from './ngo-users.controller';
import { NgoUser, NgoUserSchema } from './ngo-user.schema';
import { Org, OrgSchema } from '../orgs/orgs.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NgoUser.name, schema: NgoUserSchema },
      { name: Org.name, schema: OrgSchema },
    ]),
  ],
  controllers: [NgoUsersController],
  providers: [NgoUsersService],
  exports: [NgoUsersService],
})
export class NgoUsersModule {}
