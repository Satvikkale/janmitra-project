import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrgComplaintsService } from './org-complaints.service.js';
import { AssignComplaintDto, CreateOrgComplaintDto, RejectComplaintDto, UpdateOrgComplaintStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';

@UseGuards(JwtAuthGuard, PlatformUserGuard)
@Controller('org-complaints')
export class OrgComplaintsController {
  private readonly logger = new Logger(OrgComplaintsController.name);

  constructor(private readonly orgComplaintsService: OrgComplaintsService) {}

  private resolveRoleFlags(req: any) {
    const platformRoles: string[] = Array.isArray(req.platform?.roles) ? req.platform.roles : [];
    const userRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const roles = new Set([...platformRoles, ...userRoles]);
    return {
      isAdmin: roles.has('platform_admin'),
      isOrganization: roles.has('organization'),
      isOrgUser: roles.has('org-user'),
    };
  }

  private resolveOrgId(req: any): string | null {
    const orgIds: string[] = Array.isArray(req.platform?.orgIds) ? req.platform.orgIds : [];
    if (orgIds.length > 0) return orgIds[0];
    return null;
  }

  private resolveEffectiveOrgId(
    req: any,
    roles: { isAdmin: boolean; isOrganization: boolean; isOrgUser: boolean },
  ): string | null {
    const requestOrgId = this.resolveOrgId(req);
    if (requestOrgId) return requestOrgId;

    // For direct organization logins, JWT sub is the organization id.
    if (roles.isOrganization && req?.user?.sub) {
      return String(req.user.sub);
    }

    return null;
  }

  /**
   * Create a new org complaint (internal use - called after complaint creation)
   */
  @Post()
  async create(@Body() createOrgComplaintDto: CreateOrgComplaintDto, @Req() req: any) {
    const roles = this.resolveRoleFlags(req);

    if (!roles.isAdmin) {
      throw new ForbiddenException('Only admins can create org complaints directly');
    }

    const actorId = req.user?.sub || 'system';
    const actorName = req.user?.name || 'System';

    return this.orgComplaintsService.createOrgComplaint(createOrgComplaintDto, actorId, actorName);
  }

  /**
   * Get all complaints for an organization
   */
  @Get('org/:orgId')
  async getOrgComplaints(
    @Param('orgId') orgId: string,
    @Query('status') status?: string,
    @Query('sourceType') sourceType?: 'booking' | 'complaint',
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const roles = this.resolveRoleFlags(req);
    const requestOrgId = this.resolveOrgId(req);

    // Only organization users can access their own org complaints
    if (!roles.isAdmin && !roles.isOrganization && !roles.isOrgUser) {
      throw new ForbiddenException('Only organization staff can access organization complaints');
    }

    let effectiveOrgId = orgId;
    if (!roles.isAdmin) {
      if (requestOrgId) {
        effectiveOrgId = requestOrgId;
      } else if (roles.isOrganization && req?.user?.sub) {
        // For direct organization logins, JWT sub is the organization id.
        effectiveOrgId = String(req.user.sub);
      } else {
        throw new ForbiddenException('Organization context not found in token');
      }
    }

    const filters = {
      status: status || undefined,
      sourceType: sourceType || undefined,
      skip: skip ? parseInt(skip) : 0,
      limit: limit ? parseInt(limit) : 10,
    };

    return this.orgComplaintsService.getOrgComplaints(effectiveOrgId, filters);
  }

  /**
   * Get a specific org complaint by ID
   */
  @Get(':complaintId')
  async getOrgComplaint(@Param('complaintId') complaintId: string, @Req() req?: any) {
    const roles = this.resolveRoleFlags(req);
    const requestOrgId = this.resolveEffectiveOrgId(req, roles);

    const complaint = await this.orgComplaintsService.getOrgComplaintById(complaintId);

    // Organization users can only access their own organization's complaints
    if ((roles.isOrganization || roles.isOrgUser) && complaint.orgId !== requestOrgId) {
      throw new ForbiddenException('Cannot access complaints from another organization');
    }

    return complaint;
  }

  /**
   * Assign complaint to an org user
   */
  @Patch(':complaintId/assign')
  async assignComplaint(
    @Param('complaintId') complaintId: string,
    @Body() assignDto: AssignComplaintDto,
    @Req() req: any,
  ) {
    const roles = this.resolveRoleFlags(req);
    const requestOrgId = this.resolveEffectiveOrgId(req, roles);

    if (!roles.isOrganization && !roles.isOrgUser && !roles.isAdmin) {
      throw new ForbiddenException('Only organization staff can assign complaints');
    }

    const complaint = await this.orgComplaintsService.getOrgComplaintById(complaintId);

    // Organization users can only assign their own organization's complaints
    if ((roles.isOrganization || roles.isOrgUser) && complaint.orgId !== requestOrgId) {
      throw new ForbiddenException('Cannot assign complaints from another organization');
    }

    const actorId = req.user?.sub || 'system';
    const actorName = req.user?.name || 'System';

    return this.orgComplaintsService.assignComplaint(complaintId, assignDto, actorId, actorName);
  }

  /**
   * Reject complaint with reason
   */
  @Patch(':complaintId/reject')
  async rejectComplaint(
    @Param('complaintId') complaintId: string,
    @Body() rejectDto: RejectComplaintDto,
    @Req() req: any,
  ) {
    const roles = this.resolveRoleFlags(req);
    const requestOrgId = this.resolveEffectiveOrgId(req, roles);

    if (!roles.isOrganization && !roles.isOrgUser && !roles.isAdmin) {
      throw new ForbiddenException('Only organization staff can reject complaints');
    }

    const complaint = await this.orgComplaintsService.getOrgComplaintById(complaintId);

    // Organization users can only reject their own organization's complaints
    if ((roles.isOrganization || roles.isOrgUser) && complaint.orgId !== requestOrgId) {
      throw new ForbiddenException('Cannot reject complaints from another organization');
    }

    const actorId = req.user?.sub || 'system';
    const actorName = req.user?.name || 'System';

    return this.orgComplaintsService.rejectComplaint(complaintId, rejectDto, actorId, actorName);
  }

  /**
   * Update complaint status
   */
  @Patch(':complaintId/status')
  async updateComplaintStatus(
    @Param('complaintId') complaintId: string,
    @Body() updateDto: UpdateOrgComplaintStatusDto,
    @Req() req: any,
  ) {
    const roles = this.resolveRoleFlags(req);
    const requestOrgId = this.resolveEffectiveOrgId(req, roles);

    if (!roles.isOrganization && !roles.isOrgUser && !roles.isAdmin) {
      throw new ForbiddenException('Only organization staff can update complaint status');
    }

    const complaint = await this.orgComplaintsService.getOrgComplaintById(complaintId);

    // Organization users can only update their own organization's complaints
    if ((roles.isOrganization || roles.isOrgUser) && complaint.orgId !== requestOrgId) {
      throw new ForbiddenException('Cannot update complaints from another organization');
    }

    const actorId = req.user?.sub || 'system';
    const actorName = req.user?.name || 'System';

    return this.orgComplaintsService.updateComplaintStatus(complaintId, updateDto, actorId, actorName);
  }
}
