import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async createEvent(@Request() req: any, @Body() eventData: any) {
    return this.eventsService.createEvent(req.user.sub, eventData);
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async getMyEvents(@Request() req: any) {
    return this.eventsService.getEventsByNgoWithUpdatedStatus(req.user.sub);
  }

  @Get('my-stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async getMyEventStats(@Request() req: any) {
    return this.eventsService.getEventStats(req.user.sub);
  }

  @Get('public')
  async getPublicEvents(@Query() filters: any) {
    return this.eventsService.getAllEvents(filters);
  }

  @Get('upcoming')
  async getUpcomingEvents(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 10;
    return this.eventsService.getUpcomingEvents(limitNumber);
  }

  @Get(':id')
  async getEventById(@Param('id') id: string) {
    return this.eventsService.getEventById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async updateEvent(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateData: any,
  ) {
    return this.eventsService.updateEvent(id, req.user.sub, updateData);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async updateEventStatus(
    @Param('id') id: string,
    @Request() req: any,
    @Body() { status }: { status: string },
  ) {
    return this.eventsService.updateEventStatus(id, req.user.sub, status);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ngo')
  async deleteEvent(@Param('id') id: string, @Request() req: any) {
    return this.eventsService.deleteEvent(id, req.user.sub);
  }

  @Post('update-statuses')
  async updateEventStatuses() {
    const result = await this.eventsService.triggerStatusUpdate();
    return {
      message: `Updated ${result.modifiedCount} events to completed status`,
      modifiedCount: result.modifiedCount,
    };
  }
}
