import { Controller, Get, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NgoUsersService } from './ngo-users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Org } from '../orgs/orgs.schema';

@Controller('ngo-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NgoUsersController {
  constructor(
    private readonly ngoUsersService: NgoUsersService,
    @InjectModel(Org.name) private orgModel: Model<Org>,
  ) {}

  @Get('me')
  @Roles('ngo-user')
  async getMe(@Request() req) {
    const ngoUser = await this.ngoUsersService.findById(req.user.sub);
    if (!ngoUser) {
      throw new Error('NGO user not found');
    }
    const { password, ...userData } = ngoUser.toObject();
    return userData;
  }

  @Patch('me')
  @Roles('ngo-user')
  async updateMe(
    @Request() req,
    @Body() updateData: {
      name?: string;
      mobileNo?: string;
      isActive?: boolean;
      profilePhoto?: string;
    },
  ) {
    return this.ngoUsersService.updateProfile(req.user.sub, updateData);
  }

  @Get('my-employees')
  @Roles('ngo')
  async getMyEmployees(@Request() req) {
    const org = await this.orgModel.findById(req.user.sub);
    if (!org) {
      throw new Error('NGO organization not found');
    }
    return this.ngoUsersService.findByNgoName(org.name);
  }

  @Get(':ngoName')
  @Roles('ngo', 'admin')
  getNgoUsers(@Param('ngoName') ngoName: string) {
    return this.ngoUsersService.findByNgoName(ngoName);
  }

  @Delete(':id')
  @Roles('ngo', 'admin')
  removeNgoUser(@Param('id') id: string) {
    return this.ngoUsersService.remove(id);
  }
}
