import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { OptionalPlatformUserGuard } from '../auth/optional-platform-user.guard';
import { Society } from './society.schema';
import { SocietyMembership } from './membership.schema';
import { Announcement } from './announcement.schema';
import { User } from '../users/user.schema';

@Controller('societies')
export class SocietiesController {
  private readonly logger = new Logger(SocietiesController.name);
  constructor(
    @InjectModel(Society.name) private soc: Model<Society>,
    @InjectModel(SocietyMembership.name) private mem: Model<SocietyMembership>,
    @InjectModel(Announcement.name) private announcements: Model<Announcement>,
    @InjectModel(User.name) private user: Model<User>,
  ) {}

  /**
   * List societies, optionally filtered by name
   * Public endpoint - shows only approved societies
   * Authenticated admin with includePending=true can see pending societies
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard, OptionalPlatformUserGuard)
  async list(@Req() req: any, @Query('q') q?: string, @Query('includePending') includePending?: string) {
    try {
      const filter: any = {};
      if (q) filter.name = { $regex: q, $options: 'i' };
      
      // Check if user is platform_admin for includePending
      const isAdmin = req.platform?.roles?.includes('platform_admin');
      
      if (includePending === 'true' && isAdmin) {
        // Admin can see all societies including pending
        this.logger.log(`Admin ${req.user?.sub} fetching all societies including pending`);
      } else {
        // Public or non-admin: show only approved societies
        filter.$or = [{ status: 'approved' }, { status: { $exists: false } }];
      }
      
      const result = await this.soc.find(filter).sort({ createdAt: -1 }).limit(100).lean();
      this.logger.log(`Societies listed: ${result.length} items (authenticated: ${!!req.user}, admin: ${isAdmin})`);
      return result;
    } catch (error) {
      this.logger.error('Error listing societies', error.stack);
      throw error;
    }
  }

  /**
   * List memberships for current user with society info
   * MUST come before :id route to avoid route conflict
   */
  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Get('my-memberships')
  async myMemberships(@Req() req: any) {
    try {
      const list = await this.mem.find({ userSub: req.user.sub }).sort({ createdAt: -1 }).lean();
      const socIds = list.map((m) => m.societyId);
      const socs = await this.soc.find({ _id: { $in: socIds } }).lean();
      const socMap = new Map(socs.map((s: any) => [String(s._id), s]));
      return list.map((m) => ({ ...m, society: socMap.get(m.societyId) }));
    } catch (error) {
      this.logger.error('Error listing my memberships', error.stack);
      throw error;
    }
  }

  /**
   * Get a society by ID
   * Public endpoint - shows only approved societies
   */
  @Get(':id')
  async get(@Param('id') id: string) {
    try {
      if (!id) throw new Error('Society ID is required');
      const result = await this.soc.findById(id).lean();
      if (!result) throw new Error('Society not found');
      if (result.status && result.status !== 'approved') throw new Error('Society not approved yet');
      return result;
    } catch (error) {
      this.logger.error('Error getting society', error.stack);
      throw error;
    }
  }

  /**
   * Create a new society
   */
  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Post()
  async create(@Req() req: any, @Body() body: { name: string }) {
    try {
      if (!body.name) throw new Error('Society name is required');
      const s = await this.soc.create({ name: body.name, headUserSub: req.user.sub, status: 'pending', createdBy: req.user.sub });
      // head membership stays pending until admin approval
      await this.mem.create({ societyId: String(s._id), userSub: req.user.sub, role: 'society_head', status: 'pending' });
      this.logger.log(`Society creation requested: ${s._id} by ${req.user.sub}`);
      return { ...s.toObject(), status: 'pending' };
    } catch (error) {
      this.logger.error('Error creating society', error.stack);
      throw error;
    }
  }

  /** Request to join a society */
  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Post(':id/join')
  async requestJoin(@Req() req: any, @Param('id') id: string) {
    try {
      this.logger.log(`Join request for society ${id}, user: ${req.user?.sub || 'undefined'}`);
      
      if (!req.user?.sub) {
        throw new Error('User not authenticated');
      }
      
      if (!id) throw new Error('Society ID is required');
      const soc = await this.soc.findById(id).lean();
      if (!soc) throw new Error('Society not found');
      if (soc.status && soc.status !== 'approved') throw new Error('Society not approved yet');
      const existing = await this.mem.findOne({ societyId: id, userSub: req.user.sub });
      if (existing) return existing;
      const membership = await this.mem.create({ societyId: id, userSub: req.user.sub, role: 'resident', status: 'pending' });
      this.logger.log(`Join request: user ${req.user.sub} to society ${id}`);
      return membership;
    } catch (error) {
      this.logger.error('Error requesting join', error.stack);
      throw error;
    }
  }

  /** List memberships for a society (head only) */
  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Get(':id/memberships')
  async listMembers(@Req() req: any, @Param('id') id: string, @Query('status') status?: string) {
    try {
      this.logger.log(`Listing memberships for society ${id} by user ${req.user?.sub}, status filter: ${status || 'all'}`);
      
      if (!req.user?.sub) throw new Error('User not authenticated');
      if (!id) throw new Error('Society ID is required');
      
      const soc = await this.soc.findById(id).lean();
      if (soc?.headUserSub !== req.user.sub) {
        this.logger.warn(`User ${req.user.sub} is not head of society ${id}`);
        return [];
      }
      const q: any = { societyId: id };
      if (status) q.status = status;
      const memberships = await this.mem.find(q).sort({ createdAt: -1 }).lean();
      
      // Populate user details for each membership
      const result = await Promise.all(
        memberships.map(async (m: any) => {
          const user = await this.user.findById(m.userSub).select('name email phone').lean();
          return {
            ...m,
            user: user ? { name: user.name, email: user.email, phone: user.phone } : null,
          };
        })
      );
      
      this.logger.log(`Memberships listed for society ${id}: ${result.length} items`);
      return result;
    } catch (error) {
      this.logger.error('Error listing memberships', error.stack);
      throw error;
    }
  }

  /** Approve a membership request (head only) */
  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  @Post(':id/memberships/:userSub/approve')
  async approve(@Req() req: any, @Param('id') id: string, @Param('userSub') userSub: string) {
    try {
      this.logger.log(`Approving membership: society ${id}, user ${userSub} by ${req.user?.sub}`);
      
      if (!req.user?.sub) throw new Error('User not authenticated');
      if (!id || !userSub) throw new Error('Society ID and userSub are required');
      
      const soc = await this.soc.findById(id).lean();
      if (soc?.headUserSub !== req.user.sub) {
        this.logger.warn(`User ${req.user.sub} is not head of society ${id}`);
        return { ok: false, error: 'Not authorized' };
      }
      
      // Approve membership
      const m = await this.mem.findOneAndUpdate({ societyId: id, userSub }, { status: 'approved' }, { new: true });
      
      // Update user: add societyId
      const member = await this.user.findById(userSub);
      if (member && !member.societyIds.includes(String(id))) {
        member.societyIds.push(String(id));
        await member.save();
      }
      
      this.logger.log(`Membership approved: user ${userSub} for society ${id}`);
      return { ok: true, membership: m };
    } catch (error) {
      this.logger.error('Error approving membership', error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  /** Admin approves a society */
  @Post(':id/approve')
  async approveSociety(@Req() req: any, @Param('id') id: string) {
    try {
      if (!req.platform?.roles?.includes('platform_admin')) throw new Error('Forbidden');
      const soc = await this.soc.findById(id);
      if (!soc) throw new Error('Society not found');
      soc.status = 'approved';
      await soc.save();
      
      // Approve head membership
      await this.mem.findOneAndUpdate({ societyId: id, role: 'society_head' }, { status: 'approved' });
      
      // Update user: add society_head role and societyId
      const headUser = await this.user.findById(soc.headUserSub);
      if (headUser) {
        if (!headUser.roles.includes('society_head')) {
          headUser.roles.push('society_head');
        }
        if (!headUser.societyIds.includes(String(id))) {
          headUser.societyIds.push(String(id));
        }
        await headUser.save();
      }
      
      this.logger.log(`Society approved: ${id} by admin ${req.user.sub}`);
      return { ok: true, society: soc };
    } catch (error) {
      this.logger.error('Error approving society', error.stack);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, PlatformUserGuard)
  /** Admin rejects a society */
  @Post(':id/reject')
  async rejectSociety(@Req() req: any, @Param('id') id: string, @Body() body: { reason?: string }) {
    try {
      if (!req.platform?.roles?.includes('platform_admin')) throw new Error('Forbidden');
      const soc = await this.soc.findById(id);
      if (!soc) throw new Error('Society not found');
      soc.status = 'rejected';
      await soc.save();
      await this.mem.deleteMany({ societyId: id });
      this.logger.log(`Society rejected: ${id} by admin ${req.user.sub} reason: ${body?.reason || 'n/a'}`);
      return { ok: true };
    } catch (error) {
      this.logger.error('Error rejecting society', error.stack);
      throw error;
    }
  }


  /** Get society announcements */
  @Get(':id/announcements')
  async getAnnouncements(@Param('id') id: string) {
    try {
      const result = await this.announcements
        .find({ societyId: id })
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(50)
        .lean();
      return result;
    } catch (error) {
      this.logger.error('Error fetching announcements', error.stack);
      throw error;
    }
  }

  /** Create society announcement (society head only) */
  @Post(':id/announcements')
  async createAnnouncement(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { title: string; message: string; type?: string; isPinned?: boolean },
  ) {
    try {
      const soc = await this.soc.findById(id).lean();
      if (soc?.headUserSub !== req.user.sub) throw new Error('Only society head can create announcements');
      
      const announcement = await this.announcements.create({
        societyId: id,
        title: body.title,
        message: body.message,
        type: body.type || 'general',
        isPinned: body.isPinned || false,
        createdBy: req.user.sub,
      });
      this.logger.log(`Announcement created: ${announcement._id} for society ${id}`);
      return announcement;
    } catch (error) {
      this.logger.error('Error creating announcement', error.stack);
      throw error;
    }
  }
}
