import { Controller, Get, Logger } from '@nestjs/common';
import { OrgsService } from './orgs.service';

@Controller('orgs')
export class OrgsController {
  private readonly logger = new Logger(OrgsController.name);
  constructor(private orgs: OrgsService) {}

  /**
   * List all organizations
   */
  @Get()
  async list() {
    try {
      const result = await this.orgs.listAll();
      this.logger.log(`Orgs listed: ${result.length} items`);
      return result;
    } catch (error) {
      this.logger.error('Error listing orgs', error.stack);
      throw error;
    }
  }
}