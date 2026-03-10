import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  date!: Date;

  @Prop({ required: true })
  location!: string;

  @Prop({ type: Types.ObjectId, ref: 'Org', required: true })
  ngoId!: Types.ObjectId;

  @Prop({ default: 'upcoming', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] })
  status!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop()
  maxParticipants?: number;

  @Prop({ default: 0 })
  currentParticipants!: number;

  @Prop()
  contactEmail?: string;

  @Prop()
  contactPhone?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: true })
  isActive!: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ ngoId: 1, date: -1 });
EventSchema.index({ status: 1, date: 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ location: 1 });
