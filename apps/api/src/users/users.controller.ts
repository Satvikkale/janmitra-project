import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, PlatformUserGuard)
export class UsersController {
  @Get('me')
  me(@Req() req: any) { return req.platform; }
}