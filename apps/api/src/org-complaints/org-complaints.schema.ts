import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrgComplaintDocument = OrgComplaint & Document;

@Schema({ _id: false, timestamps: false })
export class AuditTrailEntry {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ required: true })
  action: 'created' | 'assigned' | 'rejected' | 'updated' | 'resolved';

  @Prop({ default: () => new Date() })
  timestamp: Date;

  @Prop()
  note?: string;
}

export const AuditTrailEntrySchema = SchemaFactory.createForClass(AuditTrailEntry);

@Schema({ _id: false, timestamps: false })
export class BookingRequestPayload {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop()
  societyName?: string;

  @Prop({ required: true })
  serviceNeeded: string;

  @Prop()
  notes?: string;

  @Prop({ required: true })
  requestedByUserId: string;

  @Prop({ default: () => new Date() })
  requestedAt: Date;
}

export const BookingRequestPayloadSchema = SchemaFactory.createForClass(BookingRequestPayload);

@Schema({ timestamps: true })
export class OrgComplaint extends Document {
  @Prop({ index: true, sparse: true })
  complaintId?: string;

  @Prop({ default: 'complaint', index: true })
  sourceType: 'complaint' | 'booking';

  @Prop({ required: true, index: true })
  orgId: string;

  @Prop()
  assignedToUserId?: string;

  @Prop()
  assignedToUserName?: string;

  @Prop({ default: 'pending', index: true })
  status: 'pending' | 'assigned' | 'rejected' | 'resolved';

  @Prop()
  rejectionReason?: string;

  @Prop({ type: [AuditTrailEntrySchema], default: [] })
  auditTrail: AuditTrailEntry[];

  @Prop()
  complaintCategory?: string;

  @Prop()
  complaintDescription?: string;

  @Prop()
  reporterName?: string;

  @Prop()
  reporterSociety?: string;

  @Prop({ type: { lat: Number, lng: Number } })
  location?: { lat: number; lng: number };

  @Prop({ type: BookingRequestPayloadSchema })
  bookingRequest?: BookingRequestPayload;
}

export const OrgComplaintSchema = SchemaFactory.createForClass(OrgComplaint);
OrgComplaintSchema.index({ orgId: 1, status: 1, createdAt: -1 });
OrgComplaintSchema.index({ complaintId: 1 }, { sparse: true });
OrgComplaintSchema.index({ assignedToUserId: 1 });
OrgComplaintSchema.index({ sourceType: 1, orgId: 1, createdAt: -1 });
