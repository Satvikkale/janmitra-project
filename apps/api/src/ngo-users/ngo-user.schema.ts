import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NgoUserDocument = NgoUser & Document;

@Schema({ timestamps: true })
export class NgoUser extends Document {
  @Prop({ required: true })
  ngoName: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  position: string;

  @Prop({ required: true })
  mobileNo: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'ngo-user' })
  userType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: '' })
  profilePhoto: string;
}

export const NgoUserSchema = SchemaFactory.createForClass(NgoUser);
