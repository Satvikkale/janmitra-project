import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SocietyMembership, SocietyMembershipSchema } from 'src/societies/membership.schema';
import { Society, SocietySchema } from 'src/societies/society.schema';

@Module({
  imports: [MongooseModule.forFeature([ { name: User.name, schema: UserSchema },
      { name: SocietyMembership.name, schema: SocietyMembershipSchema },
     { name: Society.name, schema: SocietySchema },])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}