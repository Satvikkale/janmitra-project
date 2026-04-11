import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Complaint } from '../complaints/complaint.schema';
import { Org } from '../orgs/orgs.schema';
import { Society } from '../societies/society.schema';
import { User } from '../users/user.schema';
import { OrgComplaint } from '../org-complaints/org-complaints.schema';
import { Event } from '../events/event.schema';
import { Notification } from '../notifications/notification.schema';
import { SocietyMembership } from '../societies/membership.schema';
import { NgoUser } from '../ngo-users/ngo-user.schema';
import { OrganizationUser } from '../organization-users/organization-user.schema';

type CountRow = { _id: string; count: number };
type MonthCountRow = { _id: { year: number; month: number }; count: number };

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Complaint.name) private complaintModel: Model<Complaint>,
    @InjectModel(Org.name) private orgModel: Model<Org>,
    @InjectModel(Society.name) private societyModel: Model<Society>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(OrgComplaint.name) private orgComplaintModel: Model<OrgComplaint>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(SocietyMembership.name) private membershipModel: Model<SocietyMembership>,
    @InjectModel(NgoUser.name) private ngoUserModel: Model<NgoUser>,
    @InjectModel(OrganizationUser.name) private organizationUserModel: Model<OrganizationUser>,
  ) {}

  async getSocietyStats(societyId: string) {
    const complaints = await this.complaintModel.find({ societyId }).exec();

    const totalComplaints = complaints.length;
    const resolved = complaints.filter((c) => c.status === 'resolved').length;
    const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
    const pending = complaints.filter((c) => c.status === 'open').length;
    const closed = complaints.filter((c) => c.status === 'closed').length;

    const resolutionRate = totalComplaints > 0 ? Math.round((resolved / totalComplaints) * 100) : 0;

    const resolvedComplaints = complaints.filter((c) => c.status === 'resolved');
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

    const categoryMap = new Map<string, number>();
    complaints.forEach((c) => {
      const count = categoryMap.get(c.category) || 0;
      categoryMap.set(c.category, count + 1);
    });
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

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

  private getMonthBuckets(months = 6) {
    const buckets: Array<{ key: string; month: string; counts: Record<string, number> }> = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    cursor.setMonth(cursor.getMonth() - (months - 1));

    for (let index = 0; index < months; index += 1) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth() + index, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth() + 1}`,
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        counts: {},
      });
    }

    return buckets;
  }

  private async monthlyCounts(model: Model<any>, months = 6): Promise<Map<string, number>> {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMonth(startDate.getMonth() - (months - 1));

    const rows: MonthCountRow[] = await model.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    return new Map(rows.map((row) => [`${row._id.year}-${row._id.month}`, row.count]));
  }

  private async countByField(model: Model<any>, field: string): Promise<CountRow[]> {
    return model.aggregate([
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  private async countArrayField(model: Model<any>, field: string): Promise<CountRow[]> {
    return model.aggregate([
      { $unwind: { path: `$${field}`, preserveNullAndEmptyArrays: false } },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  private async recentDocuments(model: Model<any>, limit = 5, select?: string) {
    let query = model.find().sort({ createdAt: -1 }).limit(limit).lean();
    if (select) query = query.select(select);
    return query.exec();
  }

  async getAdminSummary() {
    const [
      totalOrgs,
      totalNgos,
      verifiedNgos,
      orgTypeBreakdown,
      orgCityBreakdown,
      totalSocieties,
      approvedSocieties,
      pendingSocieties,
      rejectedSocieties,
      totalUsers,
      userRoleBreakdown,
      totalComplaints,
      complaintStatusBreakdown,
      complaintPriorityBreakdown,
      complaintCategoryBreakdown,
      totalOrgComplaints,
      orgComplaintStatusBreakdown,
      orgComplaintSourceBreakdown,
      totalEvents,
      eventStatusBreakdown,
      upcomingEvents,
      totalNotifications,
      unreadNotifications,
      notificationTypeBreakdown,
      totalMemberships,
      membershipStatusBreakdown,
      membershipRoleBreakdown,
      totalNgoUsers,
      activeNgoUsers,
      totalOrganizationUsers,
      activeOrganizationUsers,
      monthlyOrgs,
      monthlySocieties,
      monthlyComplaints,
      monthlyOrgComplaints,
      monthlyEvents,
      monthlyUsers,
      monthlyNotifications,
      monthlyMemberships,
      recentOrgs,
      recentSocieties,
      recentComplaints,
      recentOrgComplaints,
      recentEvents,
      recentUsers,
    ] = await Promise.all([
      this.orgModel.countDocuments(),
      this.orgModel.countDocuments({ type: 'NGO' }),
      this.orgModel.countDocuments({ type: 'NGO', isVerified: true }),
      this.countByField(this.orgModel, 'type'),
      this.countByField(this.orgModel, 'city'),
      this.societyModel.countDocuments(),
      this.societyModel.countDocuments({ status: 'approved' }),
      this.societyModel.countDocuments({ status: 'pending' }),
      this.societyModel.countDocuments({ status: 'rejected' }),
      this.userModel.countDocuments(),
      this.countArrayField(this.userModel, 'roles'),
      this.complaintModel.countDocuments(),
      this.countByField(this.complaintModel, 'status'),
      this.countByField(this.complaintModel, 'priority'),
      this.countByField(this.complaintModel, 'category'),
      this.orgComplaintModel.countDocuments(),
      this.countByField(this.orgComplaintModel, 'status'),
      this.countByField(this.orgComplaintModel, 'sourceType'),
      this.eventModel.countDocuments(),
      this.countByField(this.eventModel, 'status'),
      this.eventModel.countDocuments({ isActive: true, status: 'upcoming', date: { $gte: new Date() } }),
      this.notificationModel.countDocuments(),
      this.notificationModel.countDocuments({ isRead: false }),
      this.countByField(this.notificationModel, 'type'),
      this.membershipModel.countDocuments(),
      this.countByField(this.membershipModel, 'status'),
      this.countByField(this.membershipModel, 'role'),
      this.ngoUserModel.countDocuments(),
      this.ngoUserModel.countDocuments({ isActive: true }),
      this.organizationUserModel.countDocuments(),
      this.organizationUserModel.countDocuments({ isActive: true }),
      this.monthlyCounts(this.orgModel),
      this.monthlyCounts(this.societyModel),
      this.monthlyCounts(this.complaintModel),
      this.monthlyCounts(this.orgComplaintModel),
      this.monthlyCounts(this.eventModel),
      this.monthlyCounts(this.userModel),
      this.monthlyCounts(this.notificationModel),
      this.monthlyCounts(this.membershipModel),
      this.recentDocuments(this.orgModel, 5, 'name type city isVerified createdAt'),
      this.recentDocuments(this.societyModel, 5, 'name status createdAt'),
      this.recentDocuments(this.complaintModel, 5, 'category status priority societyId orgId createdAt'),
      this.recentDocuments(this.orgComplaintModel, 5, 'orgId status sourceType complaintCategory createdAt'),
      this.recentDocuments(this.eventModel, 5, 'title status date location ngoId createdAt'),
      this.recentDocuments(this.userModel, 5, 'name email roles createdAt'),
    ]);

    const monthBuckets = this.getMonthBuckets(6);
    const monthlyMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

    const mergeMonthly = (modelCounts: Map<string, number>, targetKey: string) => {
      modelCounts.forEach((count, key) => {
        const bucket = monthlyMap.get(key);
        if (bucket) {
          bucket.counts[targetKey] = count;
        }
      });
    };

    mergeMonthly(monthlyOrgs, 'orgs');
    mergeMonthly(monthlySocieties, 'societies');
    mergeMonthly(monthlyComplaints, 'complaints');
    mergeMonthly(monthlyOrgComplaints, 'orgComplaints');
    mergeMonthly(monthlyEvents, 'events');
    mergeMonthly(monthlyUsers, 'users');
    mergeMonthly(monthlyNotifications, 'notifications');
    mergeMonthly(monthlyMemberships, 'memberships');

    const monthlyActivity = monthBuckets.map((bucket) => ({
      month: bucket.month,
      orgs: bucket.counts.orgs || 0,
      societies: bucket.counts.societies || 0,
      complaints: bucket.counts.complaints || 0,
      orgComplaints: bucket.counts.orgComplaints || 0,
      events: bucket.counts.events || 0,
      users: bucket.counts.users || 0,
      notifications: bucket.counts.notifications || 0,
      memberships: bucket.counts.memberships || 0,
    }));

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        orgs: totalOrgs,
        ngos: totalNgos,
        verifiedNgos,
        societies: totalSocieties,
        approvedSocieties,
        pendingSocieties,
        rejectedSocieties,
        users: totalUsers,
        complaints: totalComplaints,
        orgComplaints: totalOrgComplaints,
        events: totalEvents,
        upcomingEvents,
        notifications: totalNotifications,
        unreadNotifications,
        memberships: totalMemberships,
        ngoUsers: totalNgoUsers,
        activeNgoUsers,
        organizationUsers: totalOrganizationUsers,
        activeOrganizationUsers,
      },
      charts: {
        monthlyActivity,
        orgTypeBreakdown: orgTypeBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        orgCityBreakdown: orgCityBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        societyStatusBreakdown: [
          { name: 'approved', value: approvedSocieties },
          { name: 'pending', value: pendingSocieties },
          { name: 'rejected', value: rejectedSocieties },
        ],
        complaintStatusBreakdown: complaintStatusBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        complaintPriorityBreakdown: complaintPriorityBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        complaintCategoryBreakdown: complaintCategoryBreakdown.slice(0, 8).map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        orgComplaintStatusBreakdown: orgComplaintStatusBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        orgComplaintSourceBreakdown: orgComplaintSourceBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        eventStatusBreakdown: eventStatusBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        notificationTypeBreakdown: notificationTypeBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        membershipStatusBreakdown: membershipStatusBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        membershipRoleBreakdown: membershipRoleBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
        userRoleBreakdown: userRoleBreakdown.map((row) => ({ name: row._id ?? 'Unknown', value: row.count })),
      },
      recent: {
        orgs: recentOrgs,
        societies: recentSocieties,
        complaints: recentComplaints,
        orgComplaints: recentOrgComplaints,
        events: recentEvents,
        users: recentUsers,
      },
    };
  }
}
