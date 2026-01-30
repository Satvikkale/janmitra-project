import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Announcement } from '../societies/announcement.schema';
import { CreateAnnouncementDto, UpdateAnnouncementDto, ListAnnouncementsDto } from './dto';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectModel(Announcement.name) private readonly announcementModel: Model<Announcement>,
  ) {}

  /**
   * Create a new announcement
   */
  async create(societyId: string, createdBy: string, dto: CreateAnnouncementDto) {
    try {
      const announcement = await this.announcementModel.create({
        societyId,
        createdBy,
        title: dto.title,
        message: dto.message,
        category: dto.category || 'general',
        priority: dto.priority || 'normal',
        isPinned: dto.isPinned || false,
        attachments: dto.attachments || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        status: 'active',
        readBy: [],
      });
      this.logger.log(`Announcement created: ${announcement._id} for society ${societyId}`);
      return announcement;
    } catch (error) {
      this.logger.error('Error creating announcement', error.stack);
      throw error;
    }
  }

  /**
   * List announcements for a society
   */
  async list(dto: ListAnnouncementsDto) {
    try {
      const filter: any = {};
      
      if (dto.societyId) filter.societyId = dto.societyId;
      // Support both old 'type' field and new 'category' field
      if (dto.category) {
        filter.$or = [
          { category: dto.category },
          { type: dto.category }
        ];
      }
      if (dto.status) filter.status = dto.status;
      if (dto.priority) filter.priority = dto.priority;

      // By default, only show active and non-expired announcements
      // Also include documents without status field (backward compatibility)
      if (!dto.status) {
        filter.$and = [
          { $or: [{ status: 'active' }, { status: { $exists: false } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }] }
        ];
      }

      const announcements = await this.announcementModel
        .find(filter)
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(100)
        .lean();

      this.logger.log(`Announcements listed: ${announcements.length} items for society ${dto.societyId}, category filter: ${dto.category || 'none'}`);
      return announcements;
    } catch (error) {
      this.logger.error('Error listing announcements', error.stack);
      throw error;
    }
  }

  /**
   * Get a single announcement by ID
   */
  async get(id: string) {
    const announcement = await this.announcementModel.findById(id).lean();
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  /**
   * Update an announcement
   */
  async update(id: string, userId: string, dto: UpdateAnnouncementDto) {
    try {
      const announcement = await this.announcementModel.findById(id);
      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      // Only the creator can update
      if (announcement.createdBy !== userId) {
        throw new ForbiddenException('Only the creator can update this announcement');
      }

      const updated = await this.announcementModel.findByIdAndUpdate(
        id,
        {
          ...dto,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : announcement.expiresAt,
          updatedAt: new Date(),
        },
        { new: true }
      ).lean();

      this.logger.log(`Announcement updated: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error('Error updating announcement', error.stack);
      throw error;
    }
  }

  /**
   * Delete an announcement
   */
  async delete(id: string, userId: string) {
    try {
      const announcement = await this.announcementModel.findById(id);
      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      // Only the creator can delete
      if (announcement.createdBy !== userId) {
        throw new ForbiddenException('Only the creator can delete this announcement');
      }

      await this.announcementModel.findByIdAndDelete(id);
      this.logger.log(`Announcement deleted: ${id}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error deleting announcement', error.stack);
      throw error;
    }
  }

  /**
   * Mark announcement as read by user
   */
  async markAsRead(id: string, userId: string) {
    try {
      await this.announcementModel.findByIdAndUpdate(
        id,
        { $addToSet: { readBy: userId } },
        { new: true }
      );
      this.logger.log(`Announcement ${id} marked as read by ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Error marking announcement as read', error.stack);
      throw error;
    }
  }

  /**
   * Toggle pin status
   */
  async togglePin(id: string, userId: string) {
    try {
      const announcement = await this.announcementModel.findById(id);
      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      if (announcement.createdBy !== userId) {
        throw new ForbiddenException('Only the creator can pin/unpin this announcement');
      }

      const updated = await this.announcementModel.findByIdAndUpdate(
        id,
        { isPinned: !announcement.isPinned },
        { new: true }
      ).lean();

      this.logger.log(`Announcement ${id} pin toggled to ${updated?.isPinned}`);
      return updated;
    } catch (error) {
      this.logger.error('Error toggling pin', error.stack);
      throw error;
    }
  }

  /**
   * Get unread count for a user in a society
   */
  async getUnreadCount(societyId: string, userId: string) {
    try {
      const count = await this.announcementModel.countDocuments({
        societyId,
        status: 'active',
        readBy: { $ne: userId },
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });
      return { count };
    } catch (error) {
      this.logger.error('Error getting unread count', error.stack);
      throw error;
    }
  }
}
