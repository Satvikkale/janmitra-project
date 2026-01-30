import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Org } from './orgs.schema';

@Injectable()
export class OrgsService {
  private readonly logger = new Logger(OrgsService.name);
  constructor(@InjectModel(Org.name) private model: Model<Org>) {}

  /**
   * Create a new organization
   */
  async create(data: Partial<Org>) {
    try {
      if (!data.name || !data.type) throw new Error('Org name and type are required');
      const org = await this.model.create(data);
      this.logger.log(`Org created: ${org._id}`);
      return org;
    } catch (error) {
      this.logger.error('Error creating org', error.stack);
      throw error;
    }
  }

  /**
   * Find organization by ID
   */
  async findById(id: string) {
    try {
      if (!id) throw new Error('Org ID is required');
      const org = await this.model.findById(id).lean();
      if (!org) throw new Error('Org not found');
      return org;
    } catch (error) {
      this.logger.error('Error finding org', error.stack);
      throw error;
    }
  }

  /**
   * Resolve org by category and location
   */
  async resolveByCategoryAndLocation(category: string, loc?: { lat: number; lng: number }, preferTypes: string[] = ['Gov','Utility','NGO']) {
    try {
      if (!category) throw new Error('Category is required');
      if (loc) {
        const point = { type: 'Point', coordinates: [loc.lng, loc.lat] } as any;
        const byGeo = await this.model.findOne({
          categories: category,
          type: { $in: preferTypes },
          jurisdiction: { $geoIntersects: { $geometry: point } },
        }).lean();
        if (byGeo) {
          this.logger.log(`Org resolved by geo: ${byGeo._id}`);
          return byGeo;
        }
      }
      const org = await this.model.findOne({ categories: category, type: { $in: preferTypes } }).lean();
      if (org) this.logger.log(`Org resolved by category: ${org._id}`);
      return org;
    } catch (error) {
      this.logger.error('Error resolving org', error.stack);
      throw error;
    }
  }

  /**
   * List all organizations
   */
  async listAll() {
    try {
      const result = await this.model.find().lean();
      this.logger.log(`Orgs listed: ${result.length} items`);
      return result;
    } catch (error) {
      this.logger.error('Error listing orgs', error.stack);
      throw error;
    }
  }
}