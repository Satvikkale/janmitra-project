import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true }) name!: string;
  @Prop({ unique: true, sparse: true, index: true }) email?: string;
  @Prop({ unique: true, sparse: true, index: true }) phone?: string;

  // Local auth
  @Prop() passwordHash?: string;

  // Keep roles and org/society references
  @Prop({ type: [String], default: ['resident'] })
  roles!: ('resident'|'society_head'|'org_staff'|'org_admin'|'platform_admin')[];

  @Prop({ type: [String], default: [] }) societyIds!: string[];
  @Prop({ type: [String], default: [] }) orgIds!: string[];

  // Legacy optional field (unused now)
  @Prop({ unique: true, sparse: true, index: true }) auth0Sub?: string;
}
export const UserSchema = SchemaFactory.createForClass(User);