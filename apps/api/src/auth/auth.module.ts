import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.schema';
import { Org, OrgSchema } from '../orgs/orgs.schema';
import { NgoUsersModule } from '../ngo-users/ngo-users.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot(),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { algorithm: 'HS256' },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Org.name, schema: OrgSchema },
    ]),
    NgoUsersModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}