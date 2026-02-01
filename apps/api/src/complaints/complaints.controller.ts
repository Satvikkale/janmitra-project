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
import { AddCommentDto, CreateComplaintDto, HeadReviewDto, ListQueryDto, UpdateStatusDto } from './dto';
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
    // If societyId is specified, allow fetching all complaints for that society
    // (used by society heads to manage complaints)
    // Otherwise, filter by the current user's reporter ID (My Issues)
    if (!q.societyId) {
      q.reporterId = req.user.sub;
    } else {
      const isAdmin = req.platform?.roles?.includes('platform_admin');
      const isHeadOfSociety = (req.platform?.headSocietyIds || []).includes(q.societyId);
      if (!isAdmin && !isHeadOfSociety) throw new Error('Forbidden');
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