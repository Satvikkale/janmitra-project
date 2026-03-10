import { Controller, Get, Post, Put, Body, Logger, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { OrgsService } from './orgs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('orgs')
export class OrgsController {
  private readonly logger = new Logger(OrgsController.name);
  constructor(private orgs: OrgsService) {}

  /**
   * List all organizations
   */
  @Get()
  async list() {
    try {
      const result = await this.orgs.listAll();
      this.logger.log(`Orgs listed: ${result.length} items`);
      return result;
    } catch (error) {
      this.logger.error('Error listing orgs', error.stack);
      throw error;
    }
  }

  @Get('ngos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin', 'admin')
  async getAllNgos() {
    const ngos = await this.orgs.getAllNgos();
    const pending = ngos.filter((ngo) => !ngo.isVerified);
    const verified = ngos.filter((ngo) => ngo.isVerified);

    return {
      pending: pending.map((ngo) => this.transformNgoForAdmin(ngo)),
      verified: verified.map((ngo) => this.transformNgoForAdmin(ngo)),
    };
  }

  @Post('verify-ngo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin', 'admin')
  async verifyNgo(@Body() { ngoId }: { ngoId: string }) {
    return this.orgs.verifyNgo(ngoId);
  }

  @Post('reject-ngo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin', 'admin')
  async rejectNgo(@Body() { ngoId }: { ngoId: string }) {
    return this.orgs.rejectNgo(ngoId);
  }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async getMyProfile(@Request() req: any) {
    const ngo = await this.orgs.findById(req.user.sub);
    if (!ngo) {
      throw new NotFoundException('NGO profile not found');
    }
    return this.transformNgoProfile(ngo);
  }

  @Put('my-profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async updateMyProfile(@Request() req: any, @Body() updateData: any) {
    const { passwordHash, isVerified, roles, ...allowedUpdates } = updateData;
    const updatedNgo = await this.orgs.updateNgo(req.user.sub, allowedUpdates);
    if (!updatedNgo) {
      throw new NotFoundException('NGO profile not found');
    }
    return this.transformNgoProfile(updatedNgo);
  }

  private transformNgoForAdmin(ngo: any) {
    return {
      _id: ngo._id,
      ngoName: ngo.name,
      email: ngo.contactEmail || '',
      registrationNumber: ngo.registrationNumber || '',
      address: ngo.address || '',
      contactPerson: ngo.contactPersonName || '',
      contactPhone: ngo.contactPhone || '',
      description: ngo.description || '',
      isVerified: ngo.isVerified || false,
      createdAt: ngo.createdAt || new Date(),
      subtype: ngo.subtype || '',
      city: ngo.city || '',
      categories: ngo.categories || [],
      establishedYear: ngo.establishedYear || '',
      website: ngo.website || '',
    };
  }

  private transformNgoProfile(ngo: any) {
    return {
      _id: ngo._id,
      name: ngo.name,
      subtype: ngo.subtype || '',
      city: ngo.city || '',
      categories: ngo.categories || [],
      contactPersonName: ngo.contactPersonName || '',
      contactEmail: ngo.contactEmail || '',
      contactPhone: ngo.contactPhone || '',
      address: ngo.address || '',
      registrationNumber: ngo.registrationNumber || '',
      establishedYear: ngo.establishedYear || '',
      website: ngo.website || '',
      description: ngo.description || '',
      isVerified: ngo.isVerified || false,
      createdAt: ngo.createdAt || new Date(),
      updatedAt: ngo.updatedAt || new Date(),
    };
  }
}