import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Announcement extends Document {
  @Prop({ required: true })
  societyId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    type: String, 
    enum: ['general', 'maintenance', 'event', 'emergency', 'meeting', 'notice'],
    default: 'general'
  })
  category: string;

  @Prop({ 
    type: String, 
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  })
  priority: string;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Date, default: null })
  expiresAt: Date | null;

  @Prop({ 
    type: String, 
    enum: ['active', 'archived'],
    default: 'active'
  })
  status: string;

  @Prop({ type: [String], default: [] })
  readBy: string[];

  @Prop({ required: true })
  createdBy: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
