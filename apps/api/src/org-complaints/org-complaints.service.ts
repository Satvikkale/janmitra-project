import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrgComplaint } from './org-complaints.schema';
import { CreateOrgComplaintDto, AssignComplaintDto, RejectComplaintDto, UpdateOrgComplaintStatusDto } from './dto';
import { AuditTrailEntry } from './org-complaints.schema';

@Injectable()
export class OrgComplaintsService {
  private readonly logger = new Logger(OrgComplaintsService.name);

  constructor(
    @InjectModel(OrgComplaint.name)
    private orgComplaintModel: Model<OrgComplaint>,
  ) {}

  /**
   * Create a new OrgComplaint when a complaint is routed to a paid organization
   */
  async createOrgComplaint(createOrgComplaintDto: CreateOrgComplaintDto, actorId: string, actorName: string): Promise<OrgComplaint> {
    // Check if OrgComplaint already exists
    const existingComplaint = await this.orgComplaintModel.findOne({
      complaintId: createOrgComplaintDto.complaintId,
      orgId: createOrgComplaintDto.orgId,
    });

    if (existingComplaint) {
      this.logger.warn(`OrgComplaint already exists for complaint ${createOrgComplaintDto.complaintId} and org ${createOrgComplaintDto.orgId}`);
      return existingComplaint;
    }

    // Create audit trail entry
    const auditEntry: AuditTrailEntry = {
      userId: actorId,
      userName: actorName,
      action: 'created',
      timestamp: new Date(),
      note: 'Complaint routed to organization',
    };

    const newOrgComplaint = new this.orgComplaintModel({
      ...createOrgComplaintDto,
      sourceType: 'complaint',
      status: 'pending',
      auditTrail: [auditEntry],
    });

    return await newOrgComplaint.save();
  }

  /**
   * Get all complaints for an organization with filters
   */
  async getOrgComplaints(
    orgId: string,
    filters?: {
      status?: string;
      sourceType?: 'complaint' | 'booking';
      assignedToUserId?: string;
      skip?: number;
      limit?: number;
    },
  ): Promise<{ data: OrgComplaint[]; total: number }> {
    const requestedSourceType = filters?.sourceType || 'complaint';
    const query: any = { orgId };

    if (requestedSourceType === 'complaint') {
      // Include old complaint rows created before sourceType was introduced.
      query.$or = [{ sourceType: 'booking' }, { sourceType: { $exists: false } }];
    } else {
      query.sourceType = requestedSourceType;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.assignedToUserId) {
      query.assignedToUserId = filters.assignedToUserId;
    }

    const skip = filters?.skip || 0;
    const limit = filters?.limit || 10;

    const [data, total] = await Promise.all([
      this.orgComplaintModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orgComplaintModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async createBookingRequest(
    orgId: string,
    actorId: string,
    actorName: string,
    payload: {
      fullName: string;
      phone: string;
      email?: string;
      societyName?: string;
      serviceNeeded: string;
      notes?: string;
    },
  ): Promise<OrgComplaint> {
    const fullName = String(payload?.fullName || '').trim();
    const phone = String(payload?.phone || '').trim();
    const serviceNeeded = String(payload?.serviceNeeded || '').trim();

    if (!fullName || !phone || !serviceNeeded) {
      throw new BadRequestException('fullName, phone and serviceNeeded are required');
    }

    const auditEntry: AuditTrailEntry = {
      userId: actorId,
      userName: actorName,
      action: 'created',
      timestamp: new Date(),
      note: 'Booking request submitted to paid organization',
    };

    const bookingDoc = await this.orgComplaintModel.create({
      orgId,
      sourceType: 'booking',
      status: 'pending',
      reporterName: actorName,
      reporterSociety: String(payload?.societyName || '').trim(),
      complaintCategory: 'paid_organization_booking',
      complaintDescription: serviceNeeded,
      auditTrail: [auditEntry],
      bookingRequest: {
        fullName,
        phone,
        email: String(payload?.email || '').trim(),
        societyName: String(payload?.societyName || '').trim(),
        serviceNeeded,
        notes: String(payload?.notes || '').trim(),
        requestedByUserId: actorId,
        requestedAt: new Date(),
      },
    });

    this.logger.log(`Booking request saved in OrgComplaint schema for org ${orgId}`);
    return bookingDoc;
  }

  /**
   * Get a single org complaint by ID
   */
  async getOrgComplaintById(complaintId: string): Promise<OrgComplaint> {
    const complaint = await this.orgComplaintModel.findById(complaintId);

    if (!complaint) {
      throw new NotFoundException(`OrgComplaint with ID ${complaintId} not found`);
    }

    return complaint;
  }

  /**
   * Assign complaint to an org user
   */
  async assignComplaint(
    complaintId: string,
    assignDto: AssignComplaintDto,
    actorId: string,
    actorName: string,
  ): Promise<OrgComplaint> {
    const complaint = await this.getOrgComplaintById(complaintId);

    if (complaint.status === 'rejected') {
      throw new BadRequestException('Cannot assign a rejected complaint');
    }

    const auditEntry: AuditTrailEntry = {
      userId: actorId,
      userName: actorName,
      action: 'assigned',
      timestamp: new Date(),
      note: `Assigned to ${assignDto.assignedToUserName}`,
    };

    const updated = await this.orgComplaintModel.findByIdAndUpdate(
      complaintId,
      {
        $set: {
          assignedToUserId: assignDto.assignedToUserId,
          assignedToUserName: assignDto.assignedToUserName,
          status: 'assigned',
        },
        $push: { auditTrail: auditEntry },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Failed to update complaint ${complaintId}`);
    }

    return updated;
  }

  /**
   * Reject complaint with reason
   */
  async rejectComplaint(
    complaintId: string,
    rejectDto: RejectComplaintDto,
    actorId: string,
    actorName: string,
  ): Promise<OrgComplaint> {
    const complaint = await this.getOrgComplaintById(complaintId);

    const auditEntry: AuditTrailEntry = {
      userId: actorId,
      userName: actorName,
      action: 'rejected',
      timestamp: new Date(),
      note: `Reason: ${rejectDto.rejectionReason}`,
    };

    const updated = await this.orgComplaintModel.findByIdAndUpdate(
      complaintId,
      {
        $set: {
          status: 'rejected',
          rejectionReason: rejectDto.rejectionReason,
        },
        $push: { auditTrail: auditEntry },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Failed to update complaint ${complaintId}`);
    }

    return updated;
  }

  /**
   * Update complaint status with audit trail
   */
  async updateComplaintStatus(
    complaintId: string,
    updateDto: UpdateOrgComplaintStatusDto,
    actorId: string,
    actorName: string,
  ): Promise<OrgComplaint> {
    const complaint = await this.getOrgComplaintById(complaintId);

    const auditEntry: AuditTrailEntry = {
      userId: actorId,
      userName: actorName,
      action: updateDto.status as any,
      timestamp: new Date(),
      note: updateDto.note,
    };

    const updated = await this.orgComplaintModel.findByIdAndUpdate(
      complaintId,
      {
        $set: { status: updateDto.status },
        $push: { auditTrail: auditEntry },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Failed to update complaint ${complaintId}`);
    }

    return updated;
  }

  /**
   * Check if org complaint exists, if not create it
   */
  async findOrCreateOrgComplaint(
    complaintId: string,
    orgId: string,
    complaintData: any,
    actorId: string,
    actorName: string,
  ): Promise<OrgComplaint> {
    let orgComplaint = await this.orgComplaintModel.findOne({
      complaintId,
      orgId,
    });

    if (!orgComplaint) {
      const createDto: CreateOrgComplaintDto = {
        complaintId,
        orgId,
        complaintCategory: complaintData?.category,
        complaintDescription: complaintData?.description,
        reporterName: complaintData?.reporterName,
        reporterSociety: complaintData?.sourceSocietyName,
        location: complaintData?.location,
      };

      const newComplaint = await this.createOrgComplaint(createDto, actorId, actorName);
      return newComplaint;
    }

    return orgComplaint;
  }
}
