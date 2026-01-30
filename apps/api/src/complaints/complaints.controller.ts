import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, UseInterceptors, UploadedFile, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ComplaintsService } from './complaints.service';
import { AddCommentDto, CreateComplaintDto, ListQueryDto, UpdateStatusDto } from './dto';
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
  @UseInterceptors(FileInterceptor('photo', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  }))
  async create(@Req() req: any, @UploadedFile() photo: Express.Multer.File) {
    this.logger.log(`Creating complaint with photo upload for user: ${req.user.sub}`);
    
    if (!photo) {
      throw new Error('Photo is required');
    }

    // Get user's society from platform context
    const societyId = req.platform?.societyIds?.[0];
    if (!societyId) {
      throw new Error('User must be a member of a society to report complaints');
    }

    // Upload image to Cloudinary
    this.logger.log('Uploading image to Cloudinary...');
    const uploadResult = await this.uploadsService.uploadImage(photo, 'complaints');
    const photoUrl = uploadResult.secure_url;
    this.logger.log(`Image uploaded: ${photoUrl}`);

    // Use OpenAI Vision API for AI classification
    const aiAnalysis = await this.aiService.classifyImage(photoUrl);

    const dto: CreateComplaintDto = {
      reporterId: req.user.sub,
      societyId: societyId,
      category: aiAnalysis.category,
      description: aiAnalysis.description,
      media: [photoUrl],
    };

    this.logger.log(`AI Analysis: ${JSON.stringify(aiAnalysis)}`);
    
    const complaint = await this.svc.create(dto);
    
    // Return complaint with AI analysis
    return {
      ...complaint.toObject(),
      photoUrl,
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

  @Post(':id/comment')
  comment(@Param('id') id: string, @Body() dto: AddCommentDto) { return this.svc.addComment(id, dto); }
}