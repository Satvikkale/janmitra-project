import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

type OrgType = 'Gov' | 'NGO' | 'Utility' | 'Private';
type GeoJsonMultiPolygon = { type: 'MultiPolygon'; coordinates: number[][][][] };
type GeoJsonPolygon = { type: 'Polygon'; coordinates: number[][][] };
type GeoJson = GeoJsonPolygon | GeoJsonMultiPolygon;

@Schema({ timestamps: true })
export class Org {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, enum: ['Gov','NGO','Utility','Private'] }) type!: OrgType;
  @Prop() subtype?: string; // e.g., 'Municipal Corporation', 'Water Board', 'Sanitation NGO'
  @Prop() city?: string;
  @Prop({ type: [String], default: [] }) categories!: string[]; // handled categories
  @Prop({ type: Object }) jurisdiction?: GeoJson; // optional GeoJSON area (2dsphere)
  @Prop({ type: Object, default: {} }) settings?: any; // workingHours, escalation contacts, etc.
  @Prop() escalateToOrgId?: string; // optional cross-org escalation
}
export const OrgSchema = SchemaFactory.createForClass(Org);
// Geospatial index (only if jurisdiction present)
OrgSchema.index({ jurisdiction: '2dsphere' });
OrgSchema.index({ city: 1, type: 1 });
OrgSchema.index({ categories: 1 });