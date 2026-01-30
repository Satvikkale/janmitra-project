import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('v1/analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('society/:societyId')
  async getSocietyAnalytics(@Param('societyId') societyId: string) {
    return this.analyticsService.getSocietyStats(societyId);
  }

  @Get('society/:societyId/category-breakdown')
  async getCategoryBreakdown(@Param('societyId') societyId: string) {
    return this.analyticsService.getCategoryBreakdown(societyId);
  }

  @Get('society/:societyId/recent-activity')
  async getRecentActivity(
    @Param('societyId') societyId: string,
  ) {
    return this.analyticsService.getRecentActivity(societyId, 7);
  }
}
