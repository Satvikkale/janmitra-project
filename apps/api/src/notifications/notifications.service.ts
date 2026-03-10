import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';

export interface CreateNotificationDto {
  recipientId: string;
  recipientType: 'ngo' | 'ngo-user' | 'user';
  type: 'complaint_received' | 'complaint_assigned' | 'complaint_updated' | 'complaint_resolved';
  title: string;
  message: string;
  data?: {
    complaintId?: string;
    category?: string;
    status?: string;
    assignedBy?: string;
    orgId?: string;
  };
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
  ) {}

  async create(dto: CreateNotificationDto) {
    return this.notificationModel.create(dto);
  }

  async createMany(dtos: CreateNotificationDto[]) {
    return this.notificationModel.insertMany(dtos);
  }

  async getByRecipient(recipientId: string, limit = 50) {
    return this.notificationModel
      .find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getUnreadByRecipient(recipientId: string) {
    return this.notificationModel
      .find({ recipientId, isRead: false })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getUnreadCount(recipientId: string) {
    return this.notificationModel.countDocuments({ recipientId, isRead: false });
  }

  async markAsRead(notificationId: string) {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(recipientId: string) {
    return this.notificationModel.updateMany(
      { recipientId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async deleteNotification(notificationId: string) {
    return this.notificationModel.findByIdAndDelete(notificationId);
  }

  async notifyNgoComplaintReceived(orgId: string, complaint: any) {
    return this.create({
      recipientId: orgId,
      recipientType: 'ngo',
      type: 'complaint_received',
      title: 'New Complaint Received',
      message: `A new ${complaint.category} complaint has been received and assigned to your organization.`,
      data: {
        complaintId: complaint._id?.toString() || complaint.id,
        category: complaint.category,
        status: complaint.status,
        orgId: orgId,
      },
    });
  }

  async notifyNgoUserAssigned(ngoUserId: string, complaint: any, assignedBy?: string) {
    return this.create({
      recipientId: ngoUserId,
      recipientType: 'ngo-user',
      type: 'complaint_assigned',
      title: 'Complaint Assigned to You',
      message: `You have been assigned a ${complaint.category} complaint. Please review and take action.`,
      data: {
        complaintId: complaint._id?.toString() || complaint.id,
        category: complaint.category,
        status: complaint.status,
        assignedBy: assignedBy,
        orgId: complaint.orgId,
      },
    });
  }
}
