import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class Society {
  @Prop({ required: true }) name!: string;
  @Prop({ type: { lat: Number, lng: Number } })
  location: { lat: number; lng: number };
  @Prop({ index: true }) headUserSub?: string;
  @Prop({ index: true, enum: ['pending','approved','rejected'], default: 'pending' }) status!: 'pending'|'approved'|'rejected';
  @Prop({ index: true }) createdBy?: string;
}
export const SocietySchema = SchemaFactory.createForClass(Society);