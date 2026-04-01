import { Controller, Get, Delete, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrganizationUsersService } from './organization-users.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Org } from '../orgs/orgs.schema';

@Controller('organization-users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationUsersController {
  constructor(
    private readonly orgUsersService: OrganizationUsersService,
    @InjectModel(Org.name) private orgModel: Model<Org>,
  ) {}

  @Get('me')
  @Roles('org-user')
  async getMe(@Request() req) {
    const orgUser = await this.orgUsersService.findById(req.user.sub);
    if (!orgUser) {
      throw new Error('Organization user not found');
    }
    const { password, ...userData } = orgUser.toObject();
    return userData;
  }

  @Patch('me')
  @Roles('org-user')
  async updateMe(
    @Request() req,
    @Body() updateData: {
      name?: string;
      email?: string;
      isActive?: boolean;
      profilePhoto?: string;
    },
  ) {
    return this.orgUsersService.updateProfile(req.user.sub, updateData);
  }

  @Get('my-employees')
  @Roles('organization')
  async getMyEmployees(@Request() req) {
    const org = await this.orgModel.findById(req.user.sub);
    if (!org) {
      throw new Error('Organization not found');
    }
    return this.orgUsersService.findByOrganizationId(String(org._id));
  }

  @Get(':organizationId')
  @Roles('organization', 'admin')
  getOrgUsers(@Param('organizationId') organizationId: string) {
    return this.orgUsersService.findByOrganizationId(organizationId);
  }

  @Delete(':id')
  @Roles('organization', 'admin')
  removeOrgUser(@Param('id') id: string) {
    return this.orgUsersService.remove(id);
  }
}
