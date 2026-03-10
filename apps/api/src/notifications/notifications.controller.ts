import { Controller, Delete, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformUserGuard } from '../auth/platform-user.guard';

@UseGuards(JwtAuthGuard, PlatformUserGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  async getNotifications(@Req() req: any, @Query('limit') limit?: string) {
    const recipientId = req.user.sub;
    return this.svc.getByRecipient(recipientId, limit ? parseInt(limit, 10) : 50);
  }

  @Get('unread')
  async getUnreadNotifications(@Req() req: any) {
    const recipientId = req.user.sub;
    return this.svc.getUnreadByRecipient(recipientId);
  }

  @Get('unread/count')
  async getUnreadCount(@Req() req: any) {
    const recipientId = req.user.sub;
    const count = await this.svc.getUnreadCount(recipientId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string) {
    return this.svc.markAsRead(id);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: any) {
    const recipientId = req.user.sub;
    return this.svc.markAllAsRead(recipientId);
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    return this.svc.deleteNotification(id);
  }
}
