import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class SocietyMembership {
  @Prop({ required: true, index: true }) societyId!: string;
  @Prop({ required: true, index: true }) userSub!: string;
  @Prop({ enum: ['resident','society_head'], default: 'resident' }) role!: 'resident'|'society_head';
  @Prop({ enum: ['pending','approved','denied'], default: 'pending', index: true }) status!: 'pending'|'approved'|'denied';
}
export const SocietyMembershipSchema = SchemaFactory.createForClass(SocietyMembership);
SocietyMembershipSchema.index({ societyId: 1, status: 1, createdAt: -1 });