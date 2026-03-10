import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Event } from './event.schema';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
  ) {}

  async createEvent(ngoId: string, eventData: any) {
    const event = await this.eventModel.create({
      ...eventData,
      ngoId: new Types.ObjectId(ngoId),
      date: new Date(eventData.date),
    });
    return event;
  }

  async getEventsByNgo(ngoId: string) {
    return this.eventModel
      .find({ ngoId: new Types.ObjectId(ngoId), isActive: true })
      .sort({ date: -1 })
      .populate('ngoId', 'name type city')
      .exec();
  }

  async getAllEvents(filters?: any) {
    const query: any = { isActive: true };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    return this.eventModel
      .find(query)
      .sort({ date: -1 })
      .populate('ngoId', 'name type city contactEmail contactPhone')
      .exec();
  }

  async getEventById(eventId: string) {
    const event = await this.eventModel
      .findById(eventId)
      .populate('ngoId', 'name type city contactEmail contactPhone address website')
      .exec();

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async updateEvent(eventId: string, ngoId: string, updateData: any) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ngoId.toString() !== ngoId) {
      throw new ForbiddenException('You can only update your own events');
    }

    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    return this.eventModel.findByIdAndUpdate(eventId, updateData, { new: true });
  }

  async deleteEvent(eventId: string, ngoId: string) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ngoId.toString() !== ngoId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    return this.eventModel.findByIdAndUpdate(eventId, { isActive: false }, { new: true });
  }

  async updateEventStatus(eventId: string, ngoId: string, status: string) {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.ngoId.toString() !== ngoId) {
      throw new ForbiddenException('You can only update your own events');
    }

    return this.eventModel.findByIdAndUpdate(eventId, { status }, { new: true });
  }

  async getUpcomingEvents(limit = 10) {
    return this.eventModel
      .find({
        isActive: true,
        status: 'upcoming',
        date: { $gte: new Date() },
      })
      .sort({ date: 1 })
      .limit(limit)
      .populate('ngoId', 'name type city')
      .exec();
  }

  async getEventStats(ngoId: string) {
    await this.updateExpiredEvents();

    const stats = await this.eventModel.aggregate([
      {
        $match: {
          ngoId: new Types.ObjectId(ngoId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalEvents = await this.eventModel.countDocuments({
      ngoId: new Types.ObjectId(ngoId),
      isActive: true,
    });

    return {
      totalEvents,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
    };
  }

  async getEventsByNgoWithUpdatedStatus(ngoId: string) {
    await this.updateExpiredEvents();
    return this.getEventsByNgo(ngoId);
  }

  async updateExpiredEvents() {
    const now = new Date();

    const result = await this.eventModel.updateMany(
      {
        date: { $lt: now },
        status: { $in: ['upcoming', 'ongoing'] },
        isActive: true,
      },
      {
        $set: { status: 'completed' },
      },
    );

    if (result.modifiedCount > 0) {
      console.log(`Updated ${result.modifiedCount} expired events to completed status`);
    }

    return result;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredEventsScheduled() {
    console.log('Running scheduled task to update expired events...');
    await this.updateExpiredEvents();
  }

  async triggerStatusUpdate() {
    return this.updateExpiredEvents();
  }
}
