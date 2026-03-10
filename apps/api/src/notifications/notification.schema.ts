import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, index: true })
  recipientId: string;

  @Prop({ required: true, enum: ['ngo', 'ngo-user', 'user'] })
  recipientType: 'ngo' | 'ngo-user' | 'user';

  @Prop({ required: true, enum: ['complaint_received', 'complaint_assigned', 'complaint_updated', 'complaint_resolved'] })
  type: 'complaint_received' | 'complaint_assigned' | 'complaint_updated' | 'complaint_resolved';

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object })
  data?: {
    complaintId?: string;
    category?: string;
    status?: string;
    assignedBy?: string;
    orgId?: string;
  };

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipientType: 1, createdAt: -1 });
