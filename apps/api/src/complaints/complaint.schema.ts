import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ComplaintDocument = HydratedDocument<Complaint>;
export type ComplaintEventDocument = HydratedDocument<ComplaintEvent>;

@Schema({ timestamps: true })
export class Complaint {
  @Prop({ required: true, index: true }) reporterId: string;
  @Prop({ required: true, index: true }) societyId: string;
  @Prop({ index: true }) orgId?: string;
  @Prop({ required: true }) category: string;
  @Prop() subcategory?: string;
  @Prop() description?: string;
  @Prop([String]) media?: string[];
  @Prop({ type: { lat: Number, lng: Number } }) location?: { lat: number; lng: number };
  @Prop({ default: 'open', index: true }) status: 'open'|'assigned'|'in_progress'|'resolved'|'closed';
  @Prop({ default: 'med' }) priority: 'low'|'med'|'high';
  @Prop() severityScore?: number;
  @Prop() assignedTo?: string;
  @Prop({ type: { level: String, dueAt: Date } }) sla?: { level: string; dueAt: Date };

  // Society head advisory signal (does not affect routing or lifecycle status)
  @Prop({ default: false, index: true }) headFlagged?: boolean;
  @Prop() headFlagReason?: string;
  @Prop({ type: { message: String, actorId: String, createdAt: Date }, _id: false })
  headPinnedNote?: { message: string; actorId: string; createdAt: Date };

  // Blockchain fields
  @Prop() blockchainTxHash?: string;
  @Prop() blockchainHash?: string;
}
export const ComplaintSchema = SchemaFactory.createForClass(Complaint);
ComplaintSchema.index({ societyId: 1, status: 1, createdAt: -1 });
ComplaintSchema.index({ orgId: 1, status: 1, priority: -1 });
ComplaintSchema.index({ description: 'text' });

@Schema({ timestamps: true })
export class ComplaintEvent {
  @Prop({ required: true, index: true }) complaintId: string;
  @Prop({ required: true }) type: 'created'|'assigned'|'status_changed'|'comment'|'escalated'|'note';
  @Prop({ type: Object }) payload?: any;
  @Prop({ required: true }) actorId: string;
}
export const ComplaintEventSchema = SchemaFactory.createForClass(ComplaintEvent);
ComplaintEventSchema.index({ complaintId: 1, createdAt: 1 });