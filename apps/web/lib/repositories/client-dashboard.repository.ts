import { ItemRepository } from './item.repository';
import { getClientProfileByUserId } from '@/lib/db/queries/client.queries';
import {
    getVotesReceivedCount,
    getCommentsReceivedCount,
    getUniqueItemsInteractedCount,
    getUserTotalActivityCount,
    getWeeklyEngagementData,
    getDailyActivityData,
    getTopItemsEngagement,
} from '@/lib/db/queries/dashboard.queries';
import {
    getTotalViewsCount,
    getRecentViewsCount,
    getDailyViewsData,
    getViewsPerItem,
} from '@/lib/db/queries/item-view.queries';
import type { ItemData } from '@/lib/types/item';

// ===================== Types =====================

interface ActivityData {
    date: string;
    submissions: number;
    views: number;
    engagement: number;
}

interface SubmissionTimelineData {
    month: string;
    submissions: number;
}

interface EngagementOverviewData {
    week: string;
    votes: number;
    comments: number;
}

interface StatusBreakdownData {
    status: 'Approved' | 'Pending' | 'Rejected';
    value: number;
    color: string;
}

interface TopItem {
    id: string;
    title: string;
    views: number;
    votes: number;
    comments: number;
}

// ===================== New Chart Types =====================

interface PeriodComparisonData {
    thisWeek: { votes: number; comments: number; submissions: number; views: number };
    lastWeek: { votes: number; comments: number; submissions: number; views: number };
    change: { votes: number; comments: number; submissions: number; views: number };
}

interface CategoryPerformanceData {
    category: string;
    itemCount: number;
    totalEngagement: number;
    avgEngagement: number;
}

interface ApprovalTrendData {
    month: string;
    approved: number;
    total: number;
    rate: number;
}

interface SubmissionCalendarData {
    date: string;
    count: number;
}

export interface EngagementDistributionData {
    id: string;
    title: string;
    slug: string;
    engagement: number;
    percentage: number;
}

export interface PeriodComparisonDataExport {
    thisWeek: { votes: number; comments: number; submissions: number; views: number };
    lastWeek: { votes: number; comments: number; submissions: number; views: number };
    change: { votes: number; comments: number; submissions: number; views: number };
}

export interface CategoryPerformanceDataExport {
    category: string;
    itemCount: number;
    totalEngagement: number;
    avgEngagement: number;
}

export interface ApprovalTrendDataExport {
    month: string;
    approved: number;
    total: number;
    rate: number;
}

export interface SubmissionCalendarDataExport {
    date: string;
    count: number;
}

export interface DashboardStats {
    totalSubmissions: number;
    totalViews: number;
    totalVotesReceived: number;
    totalCommentsReceived: number;
    viewsAvailable: boolean;
    recentActivity: {
        newSubmissions: number;
        newViews: number;
    };
    uniqueItemsInteracted: number;
    totalActivity: number;
    activityChartData: ActivityData[];
    engagementChartData: Array<{ name: string; value: number; color: string }>;
    submissionTimeline: SubmissionTimelineData[];
    engagementOverview: EngagementOverviewData[];
    statusBreakdown: StatusBreakdownData[];
    topItems: TopItem[];
    // New chart data
    periodComparison: PeriodComparisonData;
    categoryPerformance: CategoryPerformanceData[];
    approvalTrend: ApprovalTrendData[];
    submissionCalendar: SubmissionCalendarData[];
    engagementDistribution: EngagementDistributionData[];
}

// ===================== Constants =====================

const STATUS_COLORS = {
    Approved: '#10B981',
    Pending: '#F59E0B',
    Rejected: '#EF4444',
} as const;

const ENGAGEMENT_COLORS = {
    views: '#3B82F6',
    votes: '#10B981',
    comments: '#F59E0B',
    shares: '#8B5CF6',
} as const;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ===================== Repository =====================

/**
 * Repository for client dashboard statistics and analytics.
 * Aggregates data from Git-based items and database (votes/comments).
 */
export class ClientDashboardRepository {
    private itemRepository: ItemRepository;

    constructor() {
        this.itemRepository = new ItemRepository();
    }

    /**
     * Get comprehensive dashboard statistics for a user
     * @param userId - User ID (from session)
     * @returns Dashboard statistics
     */
    async getStats(userId: string): Promise<DashboardStats> {
        // Get client profile to get the clientProfileId for DB queries
        const clientProfile = await getClientProfileByUserId(userId);

        if (!clientProfile) {
            // Return empty stats for users without a client profile
            return this.getEmptyStats();
        }

        // Fetch user's items from Git repository
        const userItems = await this.itemRepository.findAll({
            submittedBy: userId,
            includeDeleted: false,
        });

        // Extract item slugs for database queries
        const itemSlugs = userItems.map(item => item.slug);

        // Run parallel queries for efficiency
        const [
            votesReceived,
            commentsReceived,
            uniqueItemsInteracted,
            totalActivity,
            engagementOverview,
            activityChartData,
            topItemsEngagement,
            // View queries
            totalViews,
            recentViews,
            dailyViewsMap,
            viewsPerItemMap,
        ] = await Promise.all([
            getVotesReceivedCount(itemSlugs),
            getCommentsReceivedCount(itemSlugs),
            getUniqueItemsInteractedCount(clientProfile.id),
            getUserTotalActivityCount(clientProfile.id),
            getWeeklyEngagementData(itemSlugs, 12),
            getDailyActivityData(clientProfile.id, itemSlugs, 7),
            getTopItemsEngagement(itemSlugs, 10), // Increased to 10 for engagement distribution
            // View queries
            getTotalViewsCount(itemSlugs),
            getRecentViewsCount(itemSlugs, 7),
            getDailyViewsData(itemSlugs, 14), // Increased to 14 for period comparison
            getViewsPerItem(itemSlugs),
        ]);

        // Calculate submission-based metrics from Git items
        const statusBreakdown = this.calculateStatusBreakdown(userItems);
        const submissionTimeline = this.calculateSubmissionTimeline(userItems);
        const recentSubmissions = this.calculateRecentSubmissions(userItems, 7);

        // Map top items with titles from Git data and view counts (limit to 5 for display)
        const topItems = this.mapTopItems(topItemsEngagement.slice(0, 5), userItems, viewsPerItemMap);

        // Inject views into activity chart data
        const activityChartDataWithViews = this.injectViewsIntoActivityData(activityChartData, dailyViewsMap);

        // Build engagement chart data
        const engagementChartData = [
            { name: 'Views', value: totalViews, color: ENGAGEMENT_COLORS.views },
            { name: 'Votes Received', value: votesReceived, color: ENGAGEMENT_COLORS.votes },
            { name: 'Comments Received', value: commentsReceived, color: ENGAGEMENT_COLORS.comments },
            { name: 'Shares', value: 0, color: ENGAGEMENT_COLORS.shares }, // Shares not tracked
        ];

        // Calculate new chart data
        const periodComparison = this.calculatePeriodComparison(engagementOverview, userItems, dailyViewsMap);
        const categoryPerformance = this.calculateCategoryPerformance(userItems, topItemsEngagement, viewsPerItemMap);
        const approvalTrend = this.calculateApprovalTrend(userItems);
        const submissionCalendar = this.calculateSubmissionCalendar(userItems);
        const engagementDistribution = this.calculateEngagementDistribution(userItems, topItemsEngagement, viewsPerItemMap);

        return {
            totalSubmissions: userItems.length,
            totalViews,
            totalVotesReceived: votesReceived,
            totalCommentsReceived: commentsReceived,
            viewsAvailable: true,
            recentActivity: {
                newSubmissions: recentSubmissions,
                newViews: recentViews,
            },
            uniqueItemsInteracted,
            totalActivity,
            activityChartData: activityChartDataWithViews,
            engagementChartData,
            submissionTimeline,
            engagementOverview,
            statusBreakdown,
            topItems,
            // New chart data
            periodComparison,
            categoryPerformance,
            approvalTrend,
            submissionCalendar,
            engagementDistribution,
        };
    }

    /**
     * Calculate status breakdown from user's items
     */
    private calculateStatusBreakdown(items: ItemData[]): StatusBreakdownData[] {
        const counts = {
            approved: 0,
            pending: 0,
            rejected: 0,
        };

        items.forEach(item => {
            if (item.status === 'approved') counts.approved++;
            else if (item.status === 'pending') counts.pending++;
            else if (item.status === 'rejected') counts.rejected++;
        });

        return [
            { status: 'Approved', value: counts.approved, color: STATUS_COLORS.Approved },
            { status: 'Pending', value: counts.pending, color: STATUS_COLORS.Pending },
            { status: 'Rejected', value: counts.rejected, color: STATUS_COLORS.Rejected },
        ];
    }

    /**
     * Calculate submission timeline (last 6 months)
     */
    private calculateSubmissionTimeline(items: ItemData[]): SubmissionTimelineData[] {
        const now = new Date();
        const monthlySubmissions = new Map<string, number>();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthlySubmissions.set(monthKey, 0);
        }

        // Count submissions per month
        items.forEach(item => {
            if (item.submitted_at) {
                const submittedDate = new Date(item.submitted_at);
                const monthKey = `${submittedDate.getFullYear()}-${submittedDate.getMonth()}`;
                if (monthlySubmissions.has(monthKey)) {
                    monthlySubmissions.set(monthKey, (monthlySubmissions.get(monthKey) ?? 0) + 1);
                }
            }
        });

        // Convert to array with month names
        const result: SubmissionTimelineData[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            result.push({
                month: MONTH_NAMES[date.getMonth()],
                submissions: monthlySubmissions.get(monthKey) ?? 0,
            });
        }

        return result;
    }

    /**
     * Calculate recent submissions count (last N days)
     */
    private calculateRecentSubmissions(items: ItemData[], days: number): number {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return items.filter(item => {
            if (!item.submitted_at) return false;
            const submittedDate = new Date(item.submitted_at);
            return submittedDate >= cutoffDate;
        }).length;
    }

    /**
     * Map top items engagement data with item titles and view counts
     */
    private mapTopItems(
        engagement: Array<{ itemId: string; votes: number; comments: number }>,
        items: ItemData[],
        viewsPerItem: Map<string, number>
    ): TopItem[] {
        const itemMap = new Map(items.map(item => [item.slug, item]));

        return engagement
            .map(eng => {
                const item = itemMap.get(eng.itemId);
                if (!item) return null;

                return {
                    id: item.id,
                    title: item.name,
                    views: viewsPerItem.get(eng.itemId) ?? 0,
                    votes: eng.votes,
                    comments: eng.comments,
                };
            })
            .filter((item): item is TopItem => item !== null);
    }

    /**
     * Inject view counts into activity chart data
     * Maps daily views (keyed by YYYY-MM-DD) to the activity data array (keyed by day name)
     */
    private injectViewsIntoActivityData(
        activityData: ActivityData[],
        dailyViewsMap: Map<string, number>
    ): ActivityData[] {
        return activityData.map((day, index) => {
            // Calculate the date for this entry (oldest to newest: index 0 = 6 days ago)
            const date = new Date();
            date.setDate(date.getDate() - (activityData.length - 1 - index));
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

            return {
                ...day,
                views: dailyViewsMap.get(dateStr) ?? 0,
            };
        });
    }

    // ===================== New Chart Calculation Methods =====================

    /**
     * Calculate period comparison (this week vs last week)
     * Uses engagementOverview (W1 = current week, W2 = last week) and recent submissions
     */
    private calculatePeriodComparison(
        engagementOverview: EngagementOverviewData[],
        items: ItemData[],
        dailyViewsMap: Map<string, number>
    ): PeriodComparisonData {
        // W1 is the most recent week (index 0), W2 is last week (index 1)
        const thisWeekEngagement = engagementOverview[0] ?? { votes: 0, comments: 0 };
        const lastWeekEngagement = engagementOverview[1] ?? { votes: 0, comments: 0 };

        // Calculate submissions for this week and last week
        const now = new Date();
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
        thisWeekStart.setHours(0, 0, 0, 0);

        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        const lastWeekEnd = new Date(thisWeekStart);
        lastWeekEnd.setMilliseconds(-1); // End of last week

        let thisWeekSubmissions = 0;
        let lastWeekSubmissions = 0;

        items.forEach(item => {
            if (!item.submitted_at) return;
            const submittedDate = new Date(item.submitted_at);

            if (submittedDate >= thisWeekStart) {
                thisWeekSubmissions++;
            } else if (submittedDate >= lastWeekStart && submittedDate <= lastWeekEnd) {
                lastWeekSubmissions++;
            }
        });

        // Calculate views for this week and last week from dailyViewsMap
        let thisWeekViews = 0;
        let lastWeekViews = 0;

        for (let i = 0; i < 7; i++) {
            const thisWeekDate = new Date(thisWeekStart);
            thisWeekDate.setDate(thisWeekStart.getDate() + i);
            const thisWeekDateStr = thisWeekDate.toISOString().split('T')[0];
            thisWeekViews += dailyViewsMap.get(thisWeekDateStr) ?? 0;

            const lastWeekDate = new Date(lastWeekStart);
            lastWeekDate.setDate(lastWeekStart.getDate() + i);
            const lastWeekDateStr = lastWeekDate.toISOString().split('T')[0];
            lastWeekViews += dailyViewsMap.get(lastWeekDateStr) ?? 0;
        }

        // Calculate percentage changes (avoid division by zero)
        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        return {
            thisWeek: {
                votes: thisWeekEngagement.votes,
                comments: thisWeekEngagement.comments,
                submissions: thisWeekSubmissions,
                views: thisWeekViews,
            },
            lastWeek: {
                votes: lastWeekEngagement.votes,
                comments: lastWeekEngagement.comments,
                submissions: lastWeekSubmissions,
                views: lastWeekViews,
            },
            change: {
                votes: calculateChange(thisWeekEngagement.votes, lastWeekEngagement.votes),
                comments: calculateChange(thisWeekEngagement.comments, lastWeekEngagement.comments),
                submissions: calculateChange(thisWeekSubmissions, lastWeekSubmissions),
                views: calculateChange(thisWeekViews, lastWeekViews),
            },
        };
    }

    /**
     * Calculate category performance (items grouped by category with engagement)
     * Items with multiple categories are counted for each category (Option B)
     */
    private calculateCategoryPerformance(
        items: ItemData[],
        topItemsEngagement: Array<{ itemId: string; votes: number; comments: number }>,
        viewsPerItem: Map<string, number>
    ): CategoryPerformanceData[] {
        // Create a map of slug -> engagement
        const engagementMap = new Map<string, number>();
        topItemsEngagement.forEach(eng => {
            const views = viewsPerItem.get(eng.itemId) ?? 0;
            engagementMap.set(eng.itemId, eng.votes + eng.comments + views);
        });

        // Group items by category
        const categoryStats = new Map<string, { itemCount: number; totalEngagement: number }>();

        items.forEach(item => {
            const categories = Array.isArray(item.category) ? item.category : [item.category];
            const itemEngagement = engagementMap.get(item.slug) ?? 0;

            categories.forEach(category => {
                if (!category) return;
                const existing = categoryStats.get(category) ?? { itemCount: 0, totalEngagement: 0 };
                categoryStats.set(category, {
                    itemCount: existing.itemCount + 1,
                    totalEngagement: existing.totalEngagement + itemEngagement,
                });
            });
        });

        // Convert to array and calculate average
        const result: CategoryPerformanceData[] = [];
        categoryStats.forEach((stats, category) => {
            result.push({
                category,
                itemCount: stats.itemCount,
                totalEngagement: stats.totalEngagement,
                avgEngagement: stats.itemCount > 0
                    ? Math.round((stats.totalEngagement / stats.itemCount) * 10) / 10
                    : 0,
            });
        });

        // Sort by average engagement (descending) and return top 5
        return result
            .sort((a, b) => b.avgEngagement - a.avgEngagement)
            .slice(0, 5);
    }

    /**
     * Calculate approval rate trend (last 6 months)
     */
    private calculateApprovalTrend(items: ItemData[]): ApprovalTrendData[] {
        const now = new Date();
        const monthlyStats = new Map<string, { approved: number; total: number }>();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthlyStats.set(monthKey, { approved: 0, total: 0 });
        }

        // Count items per month
        items.forEach(item => {
            if (!item.submitted_at) return;
            const submittedDate = new Date(item.submitted_at);
            const monthKey = `${submittedDate.getFullYear()}-${submittedDate.getMonth()}`;

            if (monthlyStats.has(monthKey)) {
                const stats = monthlyStats.get(monthKey)!;
                stats.total++;
                if (item.status === 'approved') {
                    stats.approved++;
                }
            }
        });

        // Convert to array with month names and rates
        const result: ApprovalTrendData[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const stats = monthlyStats.get(monthKey) ?? { approved: 0, total: 0 };

            result.push({
                month: MONTH_NAMES[date.getMonth()],
                approved: stats.approved,
                total: stats.total,
                rate: stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0,
            });
        }

        return result;
    }

    /**
     * Calculate submission calendar (last 90 days)
     */
    private calculateSubmissionCalendar(items: ItemData[]): SubmissionCalendarData[] {
        const now = new Date();
        const dailySubmissions = new Map<string, number>();

        // Initialize last 90 days
        for (let i = 89; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            dailySubmissions.set(dateStr, 0);
        }

        // Count submissions per day
        items.forEach(item => {
            if (!item.submitted_at) return;
            const submittedDate = new Date(item.submitted_at);
            const dateStr = submittedDate.toISOString().split('T')[0];

            if (dailySubmissions.has(dateStr)) {
                dailySubmissions.set(dateStr, (dailySubmissions.get(dateStr) ?? 0) + 1);
            }
        });

        // Convert to array
        const result: SubmissionCalendarData[] = [];
        dailySubmissions.forEach((count, date) => {
            result.push({ date, count });
        });

        // Sort by date ascending
        return result.sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Calculate engagement distribution (top 10 items by engagement)
     */
    private calculateEngagementDistribution(
        items: ItemData[],
        topItemsEngagement: Array<{ itemId: string; votes: number; comments: number }>,
        viewsPerItem: Map<string, number>
    ): EngagementDistributionData[] {
        const itemMap = new Map(items.map(item => [item.slug, item]));

        // Calculate total engagement for each item
        const itemsWithEngagement = topItemsEngagement
            .map(eng => {
                const item = itemMap.get(eng.itemId);
                if (!item) return null;

                const views = viewsPerItem.get(eng.itemId) ?? 0;
                const engagement = eng.votes + eng.comments + views;

                return {
                    id: item.id,
                    title: item.name,
                    slug: item.slug,
                    engagement,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 10);

        // Calculate total engagement for percentage
        const totalEngagement = itemsWithEngagement.reduce((sum, item) => sum + item.engagement, 0);

        // Add percentage to each item
        return itemsWithEngagement.map(item => ({
            ...item,
            percentage: totalEngagement > 0
                ? Math.round((item.engagement / totalEngagement) * 100)
                : 0,
        }));
    }

    /**
     * Return empty stats for users without data
     */
    private getEmptyStats(): DashboardStats {
        return {
            totalSubmissions: 0,
            totalViews: 0,
            totalVotesReceived: 0,
            totalCommentsReceived: 0,
            viewsAvailable: true,
            recentActivity: {
                newSubmissions: 0,
                newViews: 0,
            },
            uniqueItemsInteracted: 0,
            totalActivity: 0,
            activityChartData: this.getEmptyActivityChartData(),
            engagementChartData: [
                { name: 'Views', value: 0, color: ENGAGEMENT_COLORS.views },
                { name: 'Votes Received', value: 0, color: ENGAGEMENT_COLORS.votes },
                { name: 'Comments Received', value: 0, color: ENGAGEMENT_COLORS.comments },
                { name: 'Shares', value: 0, color: ENGAGEMENT_COLORS.shares },
            ],
            submissionTimeline: this.getEmptySubmissionTimeline(),
            engagementOverview: Array.from({ length: 12 }, (_, i) => ({
                week: `W${i + 1}`,
                votes: 0,
                comments: 0,
            })),
            statusBreakdown: [
                { status: 'Approved', value: 0, color: STATUS_COLORS.Approved },
                { status: 'Pending', value: 0, color: STATUS_COLORS.Pending },
                { status: 'Rejected', value: 0, color: STATUS_COLORS.Rejected },
            ],
            topItems: [],
            // New chart data (empty)
            periodComparison: {
                thisWeek: { votes: 0, comments: 0, submissions: 0, views: 0 },
                lastWeek: { votes: 0, comments: 0, submissions: 0, views: 0 },
                change: { votes: 0, comments: 0, submissions: 0, views: 0 },
            },
            categoryPerformance: [],
            approvalTrend: this.getEmptyApprovalTrend(),
            submissionCalendar: this.getEmptySubmissionCalendar(),
            engagementDistribution: [],
        };
    }

    /**
     * Generate empty approval trend (6 months)
     */
    private getEmptyApprovalTrend(): ApprovalTrendData[] {
        const now = new Date();
        const result: ApprovalTrendData[] = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({
                month: MONTH_NAMES[date.getMonth()],
                approved: 0,
                total: 0,
                rate: 0,
            });
        }

        return result;
    }

    /**
     * Generate empty submission calendar (90 days)
     */
    private getEmptySubmissionCalendar(): SubmissionCalendarData[] {
        const now = new Date();
        const result: SubmissionCalendarData[] = [];

        for (let i = 89; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            result.push({
                date: date.toISOString().split('T')[0],
                count: 0,
            });
        }

        return result;
    }

    /**
     * Generate empty activity chart data (7 days)
     */
    private getEmptyActivityChartData(): ActivityData[] {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const result: ActivityData[] = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            result.push({
                date: dayNames[date.getDay()],
                submissions: 0,
                views: 0,
                engagement: 0,
            });
        }

        return result;
    }

    /**
     * Generate empty submission timeline (6 months)
     */
    private getEmptySubmissionTimeline(): SubmissionTimelineData[] {
        const now = new Date();
        const result: SubmissionTimelineData[] = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            result.push({
                month: MONTH_NAMES[date.getMonth()],
                submissions: 0,
            });
        }

        return result;
    }
}

// ===================== Singleton =====================

let clientDashboardRepositoryInstance: ClientDashboardRepository | null = null;

/**
 * Get singleton instance of ClientDashboardRepository
 */
export function getClientDashboardRepository(): ClientDashboardRepository {
    if (!clientDashboardRepositoryInstance) {
        clientDashboardRepositoryInstance = new ClientDashboardRepository();
    }
    return clientDashboardRepositoryInstance;
}
