import { Injectable, Logger } from '@nestjs/common';
import { OrgsService } from '../orgs/orgs.service';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  constructor(private orgs: OrgsService) {}

  /**
   * Pick organization based on category and location
   */
  async pickOrg(params: { category: string; location?: { lat: number; lng: number } }) {
    try {
      const preferTypes = ['Gov','Utility','NGO']; // order of preference
      const org = await this.orgs.resolveByCategoryAndLocation(params.category, params.location, preferTypes);
      this.logger.log(`Org picked for category ${params.category}: ${org?._id || 'none'}`);
      return org || null; // null => society head must assign manually
    } catch (error) {
      this.logger.error('Error picking org', error.stack);
      throw error;
    }
  }
}