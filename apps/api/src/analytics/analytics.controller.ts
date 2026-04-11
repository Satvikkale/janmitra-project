import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('analytics')
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

  @Get('admin-summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin', 'admin')
  async getAdminSummary() {
    return this.analyticsService.getAdminSummary();
  }
}
