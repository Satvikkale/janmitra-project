import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

type OrgType = 'Gov' | 'NGO' | 'Utility' | 'Private' | 'Organization';
type GeoJsonMultiPolygon = { type: 'MultiPolygon'; coordinates: number[][][][] };
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };
type GeoJson = GeoJsonPolygon | GeoJsonMultiPolygon;

@Schema({ timestamps: true, _id: true })
export class Owner {
  @Prop() fullName?: string;
  @Prop() email?: string;
  @Prop() phoneNumber?: string;
  @Prop() panNumber?: string;
  @Prop() aadhaarNumber?: string;
}

@Schema({ _id: false })
export class Address {
  @Prop() addressLine1?: string;
  @Prop() addressLine2?: string;
  @Prop() city?: string;
  @Prop() state?: string;
  @Prop() pincode?: string;
  @Prop() country?: string;
}

@Schema({ _id: false })
export class BookingRequest {
  @Prop({ required: true }) fullName!: string;
  @Prop({ required: true }) phone!: string;
  @Prop() email?: string;
  @Prop() societyName?: string;
  @Prop({ required: true }) serviceNeeded!: string;
  @Prop() notes?: string;
  @Prop({ required: true }) requestedByUserId!: string;
  @Prop({ default: () => new Date() }) requestedAt!: Date;
}

@Schema({ timestamps: true })
export class Org extends Document {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, enum: ['Gov','NGO','Utility','Private','Organization'] }) type!: OrgType;
  @Prop() subtype?: string;
  @Prop() city?: string;
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
  @Prop() description?: string;
  @Prop({
    type: { type: String, enum: ['Point'], required: false },
    coordinates: { type: [Number], required: false }
  })
  location?: { type: 'Point'; coordinates: number[] };
  @Prop({ default: 10 })
  serviceRadiusKm?: number;

  // Organization business specific fields
  @Prop() businessName?: string;
  @Prop() businessType?: string;
  @Prop() industryType?: string;
  @Prop() gstNumber?: string;
  @Prop({ type: Owner }) owner?: Owner;
  @Prop({ type: Address }) businessAddress?: Address;
  @Prop({ type: [BookingRequest], default: [] }) bookingRequests?: BookingRequest[];
}
export const OrgSchema = SchemaFactory.createForClass(Org);
OrgSchema.index({ jurisdiction: '2dsphere' });
OrgSchema.index({ location: '2dsphere' });
OrgSchema.index({ city: 1, type: 1 });
OrgSchema.index({ type: 1 });
OrgSchema.index({ contactEmail: 1 }, { sparse: true });
OrgSchema.index({ contactPhone: 1 }, { sparse: true });
OrgSchema.index({ registrationNumber: 1 }, { sparse: true, unique: true });
OrgSchema.index({ 'owner.email': 1 }, { sparse: true });
OrgSchema.index({ gstNumber: 1 }, { sparse: true });