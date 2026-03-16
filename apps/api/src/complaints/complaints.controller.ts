import {
  BadRequestException,
  ForbiddenException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ComplaintsService } from './complaints.service';
import { AddCommentDto, AddProgressDto, AssignComplaintDto, CreateComplaintDto, HeadReviewDto, ListQueryDto, UpdateStatusDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';
import { AIService } from '../ai/ai.service';
import { UploadsService } from '../uploads/uploads.service';

@UseGuards(JwtAuthGuard, PlatformUserGuard)
@Controller('complaints')
export class ComplaintsController {
  private readonly logger = new Logger(ComplaintsController.name);
  constructor(
    private readonly svc: ComplaintsService,
    private readonly aiService: AIService,
    private readonly uploadsService: UploadsService,
  ) {}

  private resolveRoleFlags(req: any) {
    const platformRoles: string[] = Array.isArray(req.platform?.roles) ? req.platform.roles : [];
    const userRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const roles = new Set([...platformRoles, ...userRoles]);
    return {
      isAdmin: roles.has('platform_admin'),
      isNgo: roles.has('ngo') || roles.has('org_admin'),
      isNgoUser: roles.has('ngo-user') || roles.has('org_staff'),
    };
  }

  private resolveOrgId(req: any) {
    const orgIds: string[] = Array.isArray(req.platform?.orgIds) ? req.platform.orgIds : [];
    return orgIds[0] || req.user?.sub;
  }

    @Post()
    @UseInterceptors(
      FileInterceptor('photo', {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      }),
    )
    async create(
      @Req() req: any,
      @UploadedFile() photo: Express.Multer.File,
    ) {
      this.logger.log(`Creating complaint for user ${req.user.sub}`);

      if (!photo) {
        throw new BadRequestException('Photo is required');
      }

      const societyId = req.platform?.societyIds?.[0];
      if (!societyId) {
        throw new ForbiddenException('User must belong to a society');
      }

      /* 1️⃣ Upload image */
      const upload = await this.uploadsService.uploadImage(photo, 'complaints');
      const photoUrl = upload.secure_url;

      /* 2️⃣ Safe AI classification */
      let aiAnalysis = {
        category: 'General',
        description: 'Reported issue',
      };

      try {
        aiAnalysis = await this.aiService.classifyImage(photoUrl);
        this.logger.log(`AI category: ${aiAnalysis.category}`);
      } catch (err) {
        this.logger.error('AI classification failed', err);
      }

      /* 3️⃣ Persist complaint (ALWAYS) */
      const complaint = await this.svc.create({
        reporterId: req.user.sub,
        societyId,
        category: aiAnalysis.category,
        description: aiAnalysis.description,
        media: [photoUrl],
      });

      return {
        ...complaint.toObject(),
        aiAnalysis,
      };
    }

  @Get()
  async list(@Req() req: any, @Query() q: ListQueryDto) {
    const { isAdmin, isNgo, isNgoUser } = this.resolveRoleFlags(req);

    if (isAdmin || isNgo || isNgoUser) {
      await this.svc.backfillLegacyAssignments();
    }

    if (q.societyId) {
      const isHeadOfSociety = (req.platform?.headSocietyIds || []).includes(q.societyId);
      if (!isAdmin && !isHeadOfSociety) throw new Error('Forbidden');
    } else if (!isAdmin) {
      if (isNgoUser) {
        q.assignedTo = req.user.sub;
      } else if (isNgo) {
        q.orgId = q.orgId || this.resolveOrgId(req);
      } else {
        q.reporterId = req.user.sub;
      }
    }

    const complaints = await this.svc.list(q);
    
    // Photos are now Cloudinary URLs, return as-is
    return complaints.map(c => ({
      ...c,
      photoUrl: c.media?.[0] || null,
    }));
  }

  @Get(':id')
  get(@Param('id') id: string) { return this.svc.get(id); }

  @Get(':id/events')
  events(@Param('id') id: string) { return this.svc.eventsFor(id); }

  @Get(':id/progress')
  progress(@Param('id') id: string) { return this.svc.getProgress(id); }

  @Post(':id/progress')
  async addProgress(@Req() req: any, @Param('id') id: string, @Body() dto: AddProgressDto) {
    const userRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const platformRoles: string[] = Array.isArray(req.platform?.roles) ? req.platform.roles : [];
    const roles = new Set([...userRoles, ...platformRoles]);
    const isAdmin = roles.has('platform_admin');
    const isNgo = roles.has('ngo') || roles.has('org_admin');
    const isNgoUser = roles.has('ngo-user') || roles.has('org_staff');

    if (!isAdmin && !isNgo && !isNgoUser) {
      throw new Error('Forbidden');
    }

    return this.svc.addProgress(id, dto, {
      actorId: req.user.sub,
      isAdmin,
      isNgo,
      isNgoUser,
      orgIds: Array.isArray(req.platform?.orgIds) ? req.platform.orgIds : [],
    });
  }

  @Patch(':id/assign')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignComplaintDto) {
    const { isAdmin, isNgo } = this.resolveRoleFlags(req);
    if (!isAdmin && !isNgo) {
      throw new Error('Forbidden');
    }

    return this.svc.assignComplaint(id, dto, {
      actorId: req.user.sub,
      isAdmin,
      orgId: isNgo ? this.resolveOrgId(req) : undefined,
    });
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) { return this.svc.updateStatus(id, dto); }

  // Society head advisory action: flag + pinned note
  @Patch(':id/head-review')
  headReview(@Req() req: any, @Param('id') id: string, @Body() dto: HeadReviewDto) {
    return this.svc.headReview(id, dto, {
      actorId: req.user.sub,
      roles: req.platform?.roles || [],
      headSocietyIds: req.platform?.headSocietyIds || [],
    });
  }

  @Post(':id/comment')
  comment(@Param('id') id: string, @Body() dto: AddCommentDto) { return this.svc.addComment(id, dto); }
}