import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Complaint } from '../complaints/complaint.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Complaint.name) private complaintModel: Model<Complaint>,
  ) {}

  async getSocietyStats(societyId: string) {
    const complaints = await this.complaintModel.find({ societyId }).exec();
    
    const totalComplaints = complaints.length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const pending = complaints.filter(c => c.status === 'open').length;
    const closed = complaints.filter(c => c.status === 'closed').length;
    
    const resolutionRate = totalComplaints > 0 
      ? Math.round((resolved / totalComplaints) * 100) 
      : 0;

    // Calculate average resolution time
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved');
    let avgResolutionTime = '0 days';
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce((sum, complaint: any) => {
        const createdAt = new Date(complaint.createdAt).getTime();
        const updatedAt = new Date(complaint.updatedAt).getTime();
        return sum + (updatedAt - createdAt);
      }, 0);
      const avgMs = totalTime / resolvedComplaints.length;
      const avgDays = Math.round(avgMs / (1000 * 60 * 60 * 24));
      avgResolutionTime = `${avgDays} days`;
    }

    // Category breakdown
    const categoryMap = new Map<string, number>();
    complaints.forEach(c => {
      const count = categoryMap.get(c.category) || 0;
      categoryMap.set(c.category, count + 1);
    });
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Recent activity (last 7 days)
    const recentActivity = await this.getRecentActivity(societyId, 7);

    return {
      totalComplaints,
      resolved,
      inProgress,
      pending,
      closed,
      resolutionRate,
      avgResolutionTime,
      byCategory,
      recentActivity,
    };
  }

  async getCategoryBreakdown(societyId: string) {
    const result = await this.complaintModel.aggregate([
      { $match: { societyId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    return result;
  }

  async getRecentActivity(societyId: string, days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const complaints = await this.complaintModel
      .find({
        societyId,
        createdAt: { $gte: startDate },
      })
      .exec();

    // Group by date
    const activityMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      activityMap.set(dateStr, 0);
    }

    complaints.forEach((c: any) => {
      const dateStr = new Date(c.createdAt).toISOString().split('T')[0];
      const count = activityMap.get(dateStr) || 0;
      activityMap.set(dateStr, count + 1);
    });

    return Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
