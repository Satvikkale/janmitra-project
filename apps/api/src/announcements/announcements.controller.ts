import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto, UpdateAnnouncementDto, ListAnnouncementsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';

@UseGuards(JwtAuthGuard, PlatformUserGuard)
@Controller('announcements')
export class AnnouncementsController {
  private readonly logger = new Logger(AnnouncementsController.name);

  constructor(private readonly svc: AnnouncementsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateAnnouncementDto) {
    this.logger.log(`Creating announcement by user: ${req.user.sub}`);
    
    // Get user's society from platform context (society head only)
    const societyId = req.platform?.societyIds?.[0];
    if (!societyId) {
      throw new Error('User must be a society head to create announcements');
    }

    // Check if user is society head
    const isHead = req.platform?.roles?.includes('society_head');
    if (!isHead) {
      throw new Error('Only society heads can create announcements');
    }

    return this.svc.create(societyId, req.user.sub, dto);
  }

  @Get()
  async list(@Req() req: any, @Query() q: ListAnnouncementsDto) {
    this.logger.log(`Listing announcements for user: ${req.user.sub}`);
    
    // Get user's society from platform context
    const societyId = q.societyId || req.platform?.societyIds?.[0];
    if (!societyId) {
      throw new Error('Society ID is required');
    }

    q.societyId = societyId;
    return this.svc.list(q);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const societyId = req.platform?.societyIds?.[0];
    if (!societyId) {
      return { count: 0 };
    }
    return this.svc.getUnreadCount(societyId, req.user.sub);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateAnnouncementDto) {
    this.logger.log(`Updating announcement ${id} by user: ${req.user.sub}`);
    return this.svc.update(id, req.user.sub, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Deleting announcement ${id} by user: ${req.user.sub}`);
    return this.svc.delete(id, req.user.sub);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.svc.markAsRead(id, req.user.sub);
  }

  @Post(':id/toggle-pin')
  async togglePin(@Param('id') id: string, @Req() req: any) {
    return this.svc.togglePin(id, req.user.sub);
  }
}
