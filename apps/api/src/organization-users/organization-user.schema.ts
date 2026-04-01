import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrganizationUserDocument = OrganizationUser & Document;

@Schema({ timestamps: true })
export class OrganizationUser extends Document {
  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  organizationName: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'org-user' })
  userType: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: '' })
  profilePhoto: string;

  @Prop({ required: false })
  mobileNo?: string;

  @Prop({ required: false })
  position?: string;
}

export const OrganizationUserSchema = SchemaFactory.createForClass(OrganizationUser);
