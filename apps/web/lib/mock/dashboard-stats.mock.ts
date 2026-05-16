import type { UserStats } from '@/hooks/use-dashboard-stats';

export const mockDashboardStats: UserStats = {
	totalSubmissions: 24,
	totalViews: 3842,
	totalVotesReceived: 187,
	totalCommentsReceived: 53,
	viewsAvailable: true,

	recentActivity: {
		newSubmissions: 3,
		newViews: 412,
	},

	uniqueItemsInteracted: 18,
	totalActivity: 240,

	periodComparison: {
		thisWeek: { votes: 34, comments: 9, submissions: 3, views: 610 },
		lastWeek: { votes: 21, comments: 6, submissions: 1, views: 480 },
		change: { votes: 62, comments: 50, submissions: 200, views: 27 },
	},

	submissionTimeline: [
		{ month: 'Nov', submissions: 2 },
		{ month: 'Dec', submissions: 5 },
		{ month: 'Jan', submissions: 4 },
		{ month: 'Feb', submissions: 7 },
		{ month: 'Mar', submissions: 3 },
		{ month: 'Apr', submissions: 6 },
	],

	statusBreakdown: [
		{ status: 'Approved', value: 18, color: '#10b981' },
		{ status: 'Pending', value: 4, color: '#f59e0b' },
		{ status: 'Rejected', value: 2, color: '#ef4444' },
	],

	engagementOverview: [
		{ week: 'W1', votes: 12, comments: 3 },
		{ week: 'W2', votes: 19, comments: 7 },
		{ week: 'W3', votes: 28, comments: 11 },
		{ week: 'W4', votes: 34, comments: 9 },
		{ week: 'W5', votes: 41, comments: 14 },
		{ week: 'W6', votes: 53, comments: 9 },
	],

	topItems: [
		{ id: 'item-001', title: 'Next.js Boilerplate with Auth', views: 1240, votes: 87, comments: 21 },
		{ id: 'item-002', title: 'Tailwind UI Component Pack', views: 980, votes: 64, comments: 17 },
		{ id: 'item-003', title: 'Drizzle ORM Starter Kit', views: 740, votes: 48, comments: 9 },
		{ id: 'item-004', title: 'React Query Best Practices', views: 520, votes: 31, comments: 4 },
		{ id: 'item-005', title: 'TypeScript Utility Types Guide', views: 362, votes: 22, comments: 2 },
	],

	activityChartData: [
		{ date: '2025-03-18', submissions: 1, views: 120, engagement: 8 },
		{ date: '2025-03-19', submissions: 0, views: 95, engagement: 5 },
		{ date: '2025-03-20', submissions: 2, views: 210, engagement: 14 },
		{ date: '2025-03-21', submissions: 1, views: 180, engagement: 11 },
		{ date: '2025-03-22', submissions: 0, views: 140, engagement: 7 },
		{ date: '2025-03-23', submissions: 3, views: 310, engagement: 22 },
		{ date: '2025-03-24', submissions: 1, views: 260, engagement: 18 },
	],

	engagementChartData: [
		{ key: 'views', value: 3842, color: '#3B82F6' },
		{ key: 'votesReceived', value: 187, color: '#10B981' },
		{ key: 'commentsReceived', value: 53, color: '#F59E0B' },
	],

	categoryPerformance: [
		{ category: 'Web Dev', itemCount: 8, avgEngagement: 14.2, totalEngagement: 114 },
		{ category: 'DevTools', itemCount: 6, avgEngagement: 11.5, totalEngagement: 69 },
		{ category: 'Design', itemCount: 5, avgEngagement: 9.8, totalEngagement: 49 },
		{ category: 'AI / ML', itemCount: 3, avgEngagement: 8.3, totalEngagement: 25 },
		{ category: 'Mobile', itemCount: 2, avgEngagement: 6.0, totalEngagement: 12 },
	],

	approvalTrend: [
		{ month: 'Nov', rate: 80, approved: 4, total: 5 },
		{ month: 'Dec', rate: 100, approved: 5, total: 5 },
		{ month: 'Jan', rate: 75, approved: 3, total: 4 },
		{ month: 'Feb', rate: 86, approved: 6, total: 7 },
		{ month: 'Mar', rate: 67, approved: 2, total: 3 },
		{ month: 'Apr', rate: 100, approved: 4, total: 4 },
	],

	submissionCalendar: [
		{ date: '2025-02-10', count: 1 },
		{ date: '2025-02-17', count: 2 },
		{ date: '2025-02-24', count: 1 },
		{ date: '2025-03-03', count: 3 },
		{ date: '2025-03-10', count: 1 },
		{ date: '2025-03-17', count: 2 },
		{ date: '2025-03-23', count: 4 },
		{ date: '2025-04-01', count: 1 },
		{ date: '2025-04-07', count: 2 },
		{ date: '2025-04-14', count: 3 },
	],

	engagementDistribution: [
		{ id: 'item-001', slug: 'nextjs-boilerplate', title: 'Next.js Boilerplate', engagement: 108, percentage: 44 },
		{ id: 'item-002', slug: 'tailwind-ui-pack', title: 'Tailwind UI Pack', engagement: 81, percentage: 33 },
		{ id: 'item-003', slug: 'drizzle-starter', title: 'Drizzle Starter', engagement: 57, percentage: 23 },
	],
};
