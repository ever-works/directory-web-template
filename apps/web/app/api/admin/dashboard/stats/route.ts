import { NextResponse } from 'next/server';
import { AdminStatsRepository } from '@/lib/repositories/admin-stats.repository';
import { AdminAnalyticsOptimizedRepository } from '@/lib/repositories/admin-analytics-optimized.repository';
import { checkAdminAuth } from '@/lib/auth/admin-guard';

// Disable caching for authenticated dynamic data
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const adminStatsRepository = new AdminStatsRepository();
const analyticsRepository = new AdminAnalyticsOptimizedRepository();

/**
 * @swagger
 * /api/admin/dashboard/stats:
 *   get:
 *     tags: ["Admin - Dashboard"]
 *     summary: "Get comprehensive dashboard statistics"
 *     description: "Returns complete dashboard statistics including user metrics, activity data, newsletter stats, submission analytics, and chart data for the admin dashboard. Includes user growth trends, activity patterns, top items, and recent activity. Requires admin privileges."
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: "Dashboard statistics retrieved successfully"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: "Total number of users in the system"
 *                       example: 1247
 *                     registeredUsers:
 *                       type: integer
 *                       description: "Number of registered users"
 *                       example: 1156
 *                     newUsersToday:
 *                       type: integer
 *                       description: "New users registered today"
 *                       example: 5
 *                     newUsersLast7Days:
 *                       type: integer
 *                       description: "New users registered in the last 7 days"
 *                       example: 23
 *                     newUsersLast30Days:
 *                       type: integer
 *                       description: "New users registered in the last 30 days"
 *                       example: 89
 *                     totalViews:
 *                       type: integer
 *                       description: "Total page views across the platform"
 *                       example: 45678
 *                     totalVotes:
 *                       type: integer
 *                       description: "Total votes cast on items"
 *                       example: 3456
 *                     totalComments:
 *                       type: integer
 *                       description: "Total comments posted"
 *                       example: 789
 *                     totalSubscribers:
 *                       type: integer
 *                       description: "Total newsletter subscribers"
 *                       example: 2345
 *                     recentSubscribers:
 *                       type: integer
 *                       description: "Recent newsletter subscribers"
 *                       example: 45
 *                     totalSubmissions:
 *                       type: integer
 *                       description: "Total item submissions"
 *                       example: 567
 *                     pendingSubmissions:
 *                       type: integer
 *                       description: "Submissions awaiting review"
 *                       example: 23
 *                     approvedSubmissions:
 *                       type: integer
 *                       description: "Approved submissions"
 *                       example: 456
 *                     rejectedSubmissions:
 *                       type: integer
 *                       description: "Rejected submissions"
 *                       example: 88
 *                     submissionStatusData:
 *                       type: array
 *                       description: "Submission status data for charts"
 *                       items:
 *                         type: object
 *                         properties:
 *                           status:
 *                             type: string
 *                             example: "Approved"
 *                           count:
 *                             type: integer
 *                             example: 456
 *                           color:
 *                             type: string
 *                             example: "#10B981"
 *                     userGrowthData:
 *                       type: array
 *                       description: "User growth data for the last 12 months"
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             example: "2024-01"
 *                           users:
 *                             type: integer
 *                             example: 123
 *                     activityTrendData:
 *                       type: array
 *                       description: "Activity trend data for the last 14 days"
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2024-01-20"
 *                           views:
 *                             type: integer
 *                             example: 234
 *                           votes:
 *                             type: integer
 *                             example: 45
 *                           comments:
 *                             type: integer
 *                             example: 12
 *                     topItemsData:
 *                       type: array
 *                       description: "Top 10 most popular items"
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "item_123abc"
 *                           name:
 *                             type: string
 *                             example: "Awesome Tool"
 *                           views:
 *                             type: integer
 *                             example: 1234
 *                           votes:
 *                             type: integer
 *                             example: 89
 *                     recentActivity:
 *                       type: array
 *                       description: "Recent activity feed (last 20 activities)"
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "activity_456def"
 *                           type:
 *                             type: string
 *                             example: "comment"
 *                           user:
 *                             type: string
 *                             example: "John Doe"
 *                           item:
 *                             type: string
 *                             example: "Awesome Tool"
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-20T14:30:00.000Z"
 *               required: ["success", "data"]
 *             example:
 *               success: true
 *               data:
 *                 totalUsers: 1247
 *                 registeredUsers: 1156
 *                 newUsersToday: 5
 *                 newUsersLast7Days: 23
 *                 newUsersLast30Days: 89
 *                 totalViews: 45678
 *                 totalVotes: 3456
 *                 totalComments: 789
 *                 totalSubscribers: 2345
 *                 recentSubscribers: 45
 *                 totalSubmissions: 567
 *                 pendingSubmissions: 23
 *                 approvedSubmissions: 456
 *                 rejectedSubmissions: 88
 *                 submissionStatusData:
 *                   - status: "Approved"
 *                     count: 456
 *                     color: "#10B981"
 *                   - status: "Pending"
 *                     count: 23
 *                     color: "#F59E0B"
 *                   - status: "Rejected"
 *                     count: 88
 *                     color: "#EF4444"
 *                 userGrowthData:
 *                   - month: "2024-01"
 *                     users: 123
 *                   - month: "2024-02"
 *                     users: 145
 *                 activityTrendData:
 *                   - date: "2024-01-20"
 *                     views: 234
 *                     votes: 45
 *                     comments: 12
 *                   - date: "2024-01-21"
 *                     views: 267
 *                     votes: 52
 *                     comments: 15
 *                 topItemsData:
 *                   - id: "item_123abc"
 *                     name: "Awesome Tool"
 *                     views: 1234
 *                     votes: 89
 *                   - id: "item_456def"
 *                     name: "Great App"
 *                     views: 987
 *                     votes: 76
 *                 recentActivity:
 *                   - id: "activity_456def"
 *                     type: "comment"
 *                     user: "John Doe"
 *                     item: "Awesome Tool"
 *                     timestamp: "2024-01-20T14:30:00.000Z"
 *                   - id: "activity_789ghi"
 *                     type: "vote"
 *                     user: "Jane Smith"
 *                     item: "Great App"
 *                     timestamp: "2024-01-20T14:25:00.000Z"
 *       401:
 *         description: "Unauthorized - Admin access required"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: "Internal server error"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */
export async function GET() {
  try {
    // Check admin authentication
    const authError = await checkAdminAuth();
    if (authError) {
      return authError;
    }

    const stats = await adminStatsRepository.getAllStats();

    // Fetch analytics data for charts
    const analytics = await analyticsRepository.getBatchAnalytics({
      userGrowthMonths: 12,
      activityTrendDays: 14,
      topItemsLimit: 10,
      recentActivityLimit: 20
    });

    // Transform the data to match the expected frontend format
    const adminStats = {
      // User statistics
      totalUsers: stats.users.totalUsers,
      registeredUsers: stats.users.registeredUsers, // Renamed from activeUsers for clarity
      newUsersToday: stats.users.newUsersToday,
      newUsersLast7Days: stats.users.newUsersThisWeek, // Backend still uses old names
      newUsersLast30Days: stats.users.newUsersThisMonth, // Backend still uses old names

      // Activity statistics
      totalViews: stats.activity.totalViews,
      totalVotes: stats.activity.totalVotes,
      totalComments: stats.activity.totalComments,

      // Newsletter statistics
      totalSubscribers: stats.newsletter.totalSubscribers,
      recentSubscribers: stats.newsletter.recentSubscribers,

      // Submission statistics
      totalSubmissions: stats.submissions.totalSubmissions,
      pendingSubmissions: stats.submissions.pendingSubmissions,
      approvedSubmissions: stats.submissions.approvedSubmissions,
      rejectedSubmissions: stats.submissions.rejectedSubmissions,

      // Submission status data for charts
      submissionStatusData: [
        { status: 'Approved', count: stats.submissions.approvedSubmissions, color: '#10B981' },
        { status: 'Pending', count: stats.submissions.pendingSubmissions, color: '#F59E0B' },
        { status: 'Rejected', count: stats.submissions.rejectedSubmissions, color: '#EF4444' },
      ],

      // Analytics data for charts
      userGrowthData: analytics.userGrowth,
      activityTrendData: analytics.activityTrends,
      topItemsData: analytics.topItems,
      recentActivity: analytics.recentActivity,
    };

    return NextResponse.json({ success: true, data: adminStats });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
