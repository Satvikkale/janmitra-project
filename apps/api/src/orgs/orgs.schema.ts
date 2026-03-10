import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type OrgType = 'Gov' | 'NGO' | 'Utility' | 'Private';
type GeoJsonMultiPolygon = { type: 'MultiPolygon'; coordinates: number[][][][] };
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };
type GeoJson = GeoJsonPolygon | GeoJsonMultiPolygon;

@Schema({ timestamps: true })
export class Org extends Document {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, enum: ['Gov','NGO','Utility','Private'] }) type!: OrgType;
  @Prop() subtype?: string;
  @Prop() city?: string;
  @Prop({ type: [String], default: [] }) categories!: string[];
  @Prop({ type: Object }) jurisdiction?: GeoJson;
  @Prop({ type: Object, default: {} }) settings?: any;
  @Prop() escalateToOrgId?: string;

  // NGO specific fields
  @Prop() contactPersonName?: string;
  @Prop() contactEmail?: string;
  @Prop() contactPhone?: string;
  @Prop() address?: string;
  @Prop() registrationNumber?: string;
  @Prop() establishedYear?: number;
  @Prop() website?: string;
  @Prop() passwordHash?: string;
  @Prop({ default: false }) isVerified?: boolean;
  @Prop({ type: [String], default: [] }) roles?: string[];
  @Prop() workingHours?: string;
  @Prop({ type: [String], default: [] }) escalationContacts?: string[];
  @Prop() description?: string;
}
export const OrgSchema = SchemaFactory.createForClass(Org);
OrgSchema.index({ jurisdiction: '2dsphere' });
OrgSchema.index({ city: 1, type: 1 });
OrgSchema.index({ categories: 1 });
OrgSchema.index({ type: 1 });
OrgSchema.index({ contactEmail: 1 }, { sparse: true });
OrgSchema.index({ contactPhone: 1 }, { sparse: true });
OrgSchema.index({ registrationNumber: 1 }, { sparse: true, unique: true });