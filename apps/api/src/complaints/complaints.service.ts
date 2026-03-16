import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Complaint, ComplaintEvent } from './complaint.schema';
import { AddCommentDto, AddProgressDto, AssignComplaintDto, CreateComplaintDto, HeadReviewDto, ListQueryDto, UpdateStatusDto } from './dto';
import { RoutingService } from '../routing/routing.service';
import { EventsGateway } from '../realtime/events.gateway';
import { UsersService } from '../users/users.service';
import { Society } from '../societies/society.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);
  constructor(
    @InjectModel(Complaint.name) private complaintModel: Model<Complaint>,
    @InjectModel(ComplaintEvent.name) private eventModel: Model<ComplaintEvent>,
    @InjectModel(Society.name) private readonly societyModel: Model<Society>,
    private routing: RoutingService,
    private events: EventsGateway,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
  ) {}

  private canUpdateProgress(
    complaint: Complaint,
    ctx: { actorId: string; isAdmin: boolean; isNgo: boolean; isNgoUser: boolean; orgIds: string[] },
  ) {
    if (ctx.isAdmin) return true;

    const complaintOrgId = complaint.orgId ? String(complaint.orgId) : undefined;
    const actorOrgIds = new Set((ctx.orgIds || []).map(String));

    if (ctx.isNgo) {
      return Boolean(complaintOrgId && actorOrgIds.has(complaintOrgId));
    }

    if (ctx.isNgoUser) {
      const isAssignedToActor = complaint.assignedTo && String(complaint.assignedTo) === String(ctx.actorId);
      const belongsToActorOrg = complaintOrgId ? actorOrgIds.has(complaintOrgId) : false;
      return Boolean(isAssignedToActor || belongsToActorOrg);
    }

    return false;
  }

  private buildComplaintDescription(params: {
    category: string;
    baseDescription?: string;
    societyName?: string;
    location?: { lat: number; lng: number };
    ngoName?: string;
    ngoSubtype?: string;
  }) {
    const parts = [params.baseDescription?.trim() || `${params.category} complaint reported by resident.`];

    if (params.societyName) {
      parts.push(`Source society: ${params.societyName}.`);
    }

    if (params.location) {
      parts.push(`Location: ${params.location.lat}, ${params.location.lng}.`);
    }

    if (params.ngoName) {
      const ngoLabel = params.ngoSubtype ? `${params.ngoName} (${params.ngoSubtype})` : params.ngoName;
      parts.push(`Routed to NGO: ${ngoLabel}.`);
    }

    return parts.join(' ');
  }

  async backfillLegacyAssignments(limit = 200) {
    const autoManagedComplaints = await this.complaintModel
      .find({
        status: { $in: ['open', 'assigned', 'in_progress'] },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    if (autoManagedComplaints.length === 0) {
      return 0;
    }

    const societyIds = Array.from(new Set(autoManagedComplaints.map((complaint: any) => complaint.societyId).filter(Boolean)));
    const societies = await this.societyModel.find({ _id: { $in: societyIds } }).lean();
    const societyMap = new Map(societies.map((society: any) => [String(society._id), society]));

    let updatedCount = 0;

    for (const complaint of autoManagedComplaints) {
      const route = await this.routing.pickOrg({
        category: complaint.category,
        subcategory: complaint.subcategory,
        description: complaint.description,
        location: complaint.location,
      });

      const targetOrg = route.org;
      const routedOrgId = targetOrg?._id?.toString();
      const society = societyMap.get(String(complaint.societyId));

      if (!routedOrgId) {
        if (complaint.orgId || complaint.orgName || complaint.orgSubtype || complaint.assignedTo) {
          await this.complaintModel.updateOne(
            { _id: complaint._id },
            {
              $set: {
                routingReason: route.reason,
                sourceSocietyName: society?.name,
                status: 'open',
                updatedAt: new Date(),
              },
              $unset: {
                orgId: 1,
                orgName: 1,
                orgSubtype: 1,
                assignedTo: 1,
              },
            },
          );
          updatedCount += 1;
        }
        continue;
      }

      const description = this.buildComplaintDescription({
        category: complaint.category,
        baseDescription: complaint.description,
        societyName: society?.name,
        location: complaint.location,
        ngoName: targetOrg?.name,
        ngoSubtype: targetOrg?.subtype,
      });

      const nextStatus = complaint.status === 'open' ? 'assigned' : complaint.status;
      const orgChanged = complaint.orgId !== routedOrgId;

      const isChanged =
        orgChanged ||
        complaint.orgName !== targetOrg?.name ||
        complaint.orgSubtype !== targetOrg?.subtype ||
        complaint.status !== nextStatus ||
        complaint.routingReason !== route.reason ||
        complaint.sourceSocietyName !== society?.name;

      if (!isChanged) {
        continue;
      }

      await this.complaintModel.updateOne(
        { _id: complaint._id },
        orgChanged
          ? {
              $set: {
                orgId: routedOrgId,
                orgName: targetOrg?.name,
                orgSubtype: targetOrg?.subtype,
                sourceSocietyName: society?.name,
                routingReason: route.reason,
                description,
                status: nextStatus,
                updatedAt: new Date(),
              },
              $unset: {
                assignedTo: 1,
              },
            }
          : {
              $set: {
                orgId: routedOrgId,
                orgName: targetOrg?.name,
                orgSubtype: targetOrg?.subtype,
                sourceSocietyName: society?.name,
                routingReason: route.reason,
                description,
                assignedTo: complaint.assignedTo,
                status: nextStatus,
                updatedAt: new Date(),
              },
            },
      );

      updatedCount += 1;
    }

    if (updatedCount > 0) {
      this.logger.log(`Legacy complaint routing backfill updated ${updatedCount} complaint(s)`);
    }

    return updatedCount;
  }

  private async attachReporter<T extends { reporterId?: string }>(rows: T[]) {
    const reporterIds = Array.from(
      new Set((rows || []).map((r) => r?.reporterId).filter((v): v is string => Boolean(v))),
    );
    if (reporterIds.length === 0) return rows;

    // In this project, JWT `sub` is the DB user id (see jwt.strategy.ts), so reporterId is a Mongo ObjectId string.
    const users = await Promise.all(
      reporterIds.map(async (id) => {
        try {
          return await this.users.getById(id);
        } catch {
          return null;
        }
      }),
    );
    const byId = new Map(users.filter(Boolean).map((u: any) => [String(u._id), u]));

    return (rows || []).map((r: any) => {
      const u = r?.reporterId ? byId.get(String(r.reporterId)) : null;
      return {
        ...r,
        reporter: u ? { name: u.name, email: u.email ?? null, phone: u.phone ?? null } : null,
      };
    });
  }

  /**
   * Create a new complaint
   * @param dto Complaint creation data
   */
  async create(dto: CreateComplaintDto) {
    try {
      if (!dto.reporterId) throw new Error('reporterId is required');
      const [society, reporter, route] = await Promise.all([
        this.societyModel.findById(dto.societyId).lean(),
        this.users.getById(dto.reporterId),
        this.routing.pickOrg({
          category: dto.category,
          subcategory: dto.subcategory,
          description: dto.description,
          location: dto.location,
        }),
      ]);

      const targetOrg = route.org;
      const description = this.buildComplaintDescription({
        category: dto.category,
        baseDescription: dto.description,
        societyName: society?.name,
        location: dto.location,
        ngoName: targetOrg?.name,
        ngoSubtype: targetOrg?.subtype,
      });

      const status = targetOrg ? 'assigned' : 'open';
      const doc = await this.complaintModel.create({
        reporterId: dto.reporterId,
        societyId: dto.societyId,
        orgId: targetOrg?._id?.toString(),
        orgName: targetOrg?.name,
        orgSubtype: targetOrg?.subtype,
        category: dto.category,
        subcategory: dto.subcategory,
        description,
        sourceSocietyName: society?.name,
        routingReason: route.reason,
        media: dto.media,
        location: dto.location,
        status,
        priority: 'med',
      });
      await this.eventModel.create({
        complaintId: String(doc._id),
        type: 'created',
        actorId: dto.reporterId,
        payload: {
          category: doc.category,
          orgId: doc.orgId || null,
          orgName: doc.orgName || null,
          sourceSocietyName: doc.sourceSocietyName || null,
          routingReason: doc.routingReason || null,
          reporterName: reporter?.name || null,
        },
      });
      if (targetOrg) {
        const routedOrgId = targetOrg._id?.toString();

        await this.eventModel.create({
          complaintId: String(doc._id),
          type: 'assigned',
          actorId: dto.reporterId,
          payload: {
            orgId: doc.orgId,
            orgName: doc.orgName,
            orgSubtype: doc.orgSubtype,
            routingReason: doc.routingReason,
          },
        });

        if (routedOrgId) {
          await this.notifications.notifyNgoComplaintReceived(routedOrgId, {
            ...doc.toObject(),
            description: doc.description,
            sourceSocietyName: doc.sourceSocietyName,
            routingReason: doc.routingReason,
          });
        }
      }
      this.events.emitComplaintCreated(doc as any);
      this.logger.log(`Complaint created: ${doc._id} by ${dto.reporterId}`);
      return doc;
    } catch (error) {
      this.logger.error('Error creating complaint', error.stack);
      throw error;
    }
  }

  /**
   * List complaints based on query
   * @param q ListQueryDto
   */
  async list(q: ListQueryDto) {
    try {
      const filter: any = {};
      if (q.id) filter._id = q.id;
      if (q.societyId) filter.societyId = q.societyId;
      if (q.orgId) filter.orgId = q.orgId;
      if (q.assignedTo) filter.assignedTo = q.assignedTo;
      if (q.status) filter.status = q.status;
      if (q.reporterId) filter.reporterId = q.reporterId;
      const result = await this.complaintModel.find(filter).sort({ createdAt: -1 }).limit(100).lean();
      const enriched = await this.attachReporter(result as any);
      this.logger.log(`Complaints listed: ${result.length} items with filter: ${JSON.stringify(filter)}`);
      return enriched;
    } catch (error) {
      this.logger.error('Error listing complaints', error.stack);
      throw error;
    }
  }

  async get(id: string) {
    const doc = await this.complaintModel.findById(id).lean();
    if (!doc) return doc;
    const enriched = await this.attachReporter([doc as any]);
    return enriched[0];
  }

  async eventsFor(id: string) { return this.eventModel.find({ complaintId: id }).sort({ createdAt: 1 }).lean(); }

  async getProgress(id: string) {
    const events = await this.eventModel.find({ complaintId: id }).sort({ createdAt: 1 }).lean();
    return events
      .filter((event: any) => ['assigned', 'status_changed', 'comment', 'note'].includes(event.type))
      .map((event: any) => {
        let description = 'Internal note added';

        if (event.type === 'assigned') {
          description = 'Complaint assigned';
          if (event.payload?.assignedTo) {
            description += ` to ${event.payload.assignedTo}`;
          }
        } else if (event.type === 'status_changed') {
          const status = event.payload?.status || 'updated';
          description = `Status changed to ${status}`;
          if (event.payload?.note) {
            description += `: ${event.payload.note}`;
          }
        } else if (event.type === 'comment') {
          description = event.payload?.message || 'Comment added';
        } else if (event.payload?.pinnedNote || event.payload?.reason) {
          description = event.payload?.pinnedNote || event.payload?.reason;
        }

        return {
          _id: String(event._id),
          date: event.createdAt,
          description,
          photos: Array.isArray(event.payload?.photos) ? event.payload.photos : [],
          updatedBy: event.actorId,
          updatedByName: event.actorId,
        };
      });
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const doc = await this.complaintModel.findByIdAndUpdate(id, { status: dto.status, updatedAt: new Date() }, { new: true });
    if (!doc) return null;
    await this.eventModel.create({ complaintId: String(doc._id), type: 'status_changed', actorId: dto.actorId ?? 'u-dev-1', payload: { status: dto.status, note: dto.note } });
    this.events.emitComplaintUpdated(doc as any);
    return doc;
  }

  async addComment(id: string, dto: AddCommentDto) {
    const doc = await this.complaintModel.findById(id);
    if (!doc) return null;
    await this.eventModel.create({ complaintId: String(doc._id), type: 'comment', actorId: dto.actorId ?? 'u-dev-1', payload: { message: dto.message, visibility: dto.visibility } });
    this.events.emitComplaintUpdated(doc as any);
    return { ok: true };
  }

  async addProgress(
    id: string,
    dto: AddProgressDto,
    ctx: { actorId: string; isAdmin: boolean; isNgo: boolean; isNgoUser: boolean; orgIds: string[] },
  ) {
    const complaint = await this.complaintModel.findById(id);
    if (!complaint) return null;

    if (!this.canUpdateProgress(complaint, ctx)) {
      throw new Error('Forbidden');
    }

    const photos = Array.isArray(dto.photos) ? dto.photos.filter(Boolean) : [];
    const status = complaint.status === 'open' || complaint.status === 'assigned' ? 'in_progress' : complaint.status;

    const updated = await this.complaintModel.findByIdAndUpdate(
      id,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updated) return null;

    await this.eventModel.create({
      complaintId: String(updated._id),
      type: 'comment',
      actorId: ctx.actorId,
      payload: {
        kind: 'progress',
        message: dto.description,
        photos,
        visibility: 'internal',
      },
    });

    this.events.emitComplaintUpdated(updated as any);
    return updated;
  }

  async assignComplaint(
    id: string,
    dto: AssignComplaintDto,
    ctx: { actorId: string; isAdmin: boolean; orgId?: string },
  ) {
    const complaint = await this.complaintModel.findById(id);
    if (!complaint) return null;

    if (!ctx.isAdmin && complaint.orgId !== ctx.orgId) {
      throw new Error('Forbidden');
    }

    const updated = await this.complaintModel.findByIdAndUpdate(
      id,
      {
        assignedTo: dto.assignedTo,
        status: complaint.status === 'open' ? 'assigned' : complaint.status,
        updatedAt: new Date(),
      },
      { new: true },
    );

    if (!updated) return null;

    await this.eventModel.create({
      complaintId: String(updated._id),
      type: 'assigned',
      actorId: ctx.actorId,
      payload: { assignedTo: dto.assignedTo, orgId: updated.orgId || null },
    });

    await this.notifications.notifyNgoUserAssigned(dto.assignedTo, updated.toObject(), ctx.actorId);
    this.events.emitComplaintUpdated(updated as any);
    return updated;
  }

  async headReview(
    id: string,
    dto: HeadReviewDto,
    ctx: { actorId: string; roles: string[]; headSocietyIds: string[] },
  ) {
    const isAdmin = ctx.roles?.includes('platform_admin');
    const doc = await this.complaintModel.findById(id);
    if (!doc) return null;

    const isHeadOfThisSociety = (ctx.headSocietyIds || []).includes(String(doc.societyId));
    if (!isAdmin && !isHeadOfThisSociety) throw new Error('Forbidden');

    const update: any = { updatedAt: new Date() };
    if (typeof dto.flagged === 'boolean') {
      update.headFlagged = dto.flagged;
      update.headFlagReason = dto.flagged ? (dto.reason || doc.headFlagReason || undefined) : undefined;
      if (!dto.flagged) update.headPinnedNote = doc.headPinnedNote; // keep note unless explicitly changed
    }
    if (dto.reason !== undefined) {
      update.headFlagReason = dto.reason || undefined;
    }
    if (dto.pinnedNote !== undefined) {
      const note = (dto.pinnedNote || '').trim();
      update.headPinnedNote = note
        ? { message: note, actorId: ctx.actorId, createdAt: new Date() }
        : undefined;
    }

    const updated = await this.complaintModel.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return null;

    await this.eventModel.create({
      complaintId: String(updated._id),
      type: 'note',
      actorId: ctx.actorId,
      payload: {
        kind: 'head_review',
        flagged: updated.headFlagged || false,
        reason: updated.headFlagReason || null,
        pinnedNote: updated.headPinnedNote?.message || null,
      },
    });
    this.events.emitComplaintUpdated(updated as any);
    return updated;
  }
}