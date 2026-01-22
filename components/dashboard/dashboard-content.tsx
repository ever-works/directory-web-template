'use client';

import { Session } from 'next-auth';
import { MessageSquare, ThumbsUp, TrendingUp, Activity, RefreshCw } from 'lucide-react';
import { StatsCard } from './stats-card';
import { ActivityChart } from './activity-chart';
import { EngagementChart } from './engagement-chart';
import { SubmissionTimeline } from './submission-timeline';
import { EngagementOverview } from './engagement-overview';
import { StatusBreakdown } from './status-breakdown';
import { TopItems } from './top-items';
import { PeriodComparison } from './period-comparison';
import { CategoryPerformance } from './category-performance';
import { ApprovalTrend } from './approval-trend';
import { SubmissionCalendar } from './submission-calendar';
import { EngagementDistribution } from './engagement-distribution';
import { EngagementRateChart } from './engagement-rate-chart';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Button } from '@/components/ui/button';
import { PageContainer } from '../ui/container';

interface DashboardContentProps {
	session: Session | null;
}

export function DashboardContent({ session }: DashboardContentProps) {
	const { data: stats, refetch: refetchStats, error: statsError } = useDashboardStats();

	const handleRefresh = async () => {
		try {
			await refetchStats();
		} catch (error) {
			console.error('Failed to refresh data:', error);
		}
	};

	// Auth handled at route level - all dashboard pages require authentication

	return (
		<div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
			<PageContainer className="py-8">
				{/* Error Handling */}
				{statsError && (
					<div className="mb-4 p-4 bg-red-100 text-red-800 rounded-sm">
						Failed to load dashboard stats: {statsError.message}
					</div>
				)}
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
							<p className="mt-2 text-gray-600 dark:text-gray-400">
								Welcome back, {session?.user?.name || 'User'}! Here&apos;s your activity overview.
							</p>
						</div>
						<Button
							onClick={handleRefresh}
							variant="outline"
							size="sm"
							className="flex items-center space-x-2"
						>
							<RefreshCw className="h-4 w-4" />
							<span>Refresh</span>
						</Button>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<StatsCard
						title="Total Submissions"
						value={stats?.totalSubmissions || 0}
						description="Content you've created"
						icon={MessageSquare}
						isLoading={!stats}
					/>
					<StatsCard
						title="Total Views"
						value={stats?.totalViews || 0}
						description="Views on your content"
						icon={TrendingUp}
						isLoading={!stats}
					/>
					<StatsCard
						title="Votes Received"
						value={stats?.totalVotesReceived || 0}
						description="Votes on your content"
						icon={ThumbsUp}
						isLoading={!stats}
					/>
					<StatsCard
						title="Comments Received"
						value={stats?.totalCommentsReceived || 0}
						description="Comments on your content"
						icon={Activity}
						isLoading={!stats}
					/>
				</div>

				{/* Period Comparison */}
				<div className="mb-8">
					<PeriodComparison data={stats?.periodComparison} isLoading={!stats} />
				</div>

				{/* Submission Timeline & Status */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					<SubmissionTimeline data={stats?.submissionTimeline || []} isLoading={!stats} />
					<StatusBreakdown data={stats?.statusBreakdown || []} isLoading={!stats} />
				</div>

				{/* Engagement Overview */}
				<div className="mb-8">
					<EngagementOverview data={stats?.engagementOverview || []} isLoading={!stats} />
				</div>

				{/* Category Performance & Approval Trend */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					<CategoryPerformance data={stats?.categoryPerformance || []} isLoading={!stats} />
					<ApprovalTrend data={stats?.approvalTrend || []} isLoading={!stats} />
				</div>

				{/* Top Items Section */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
					<div className="lg:col-span-2">
						<TopItems items={stats?.topItems || []} isLoading={!stats} />
					</div>
					<div>
						<EngagementChart data={stats?.engagementChartData || []} isLoading={!stats} />
					</div>
				</div>

				{/* Submission Calendar - Full Width */}
				<div className="mb-8">
					<SubmissionCalendar data={stats?.submissionCalendar || []} isLoading={!stats} />
				</div>

				{/* Engagement Distribution */}
				<div className="mb-8">
					<EngagementDistribution data={stats?.engagementDistribution || []} isLoading={!stats} />
				</div>

				{/* Engagement Rate Chart */}
				<div className="mb-8">
					<EngagementRateChart
						engagementOverview={stats?.engagementOverview || []}
						totalSubmissions={stats?.totalSubmissions || 0}
						isLoading={!stats}
					/>
				</div>

				{/* Weekly Activity Chart */}
				<div className="mb-8">
					<ActivityChart data={stats?.activityChartData || []} isLoading={!stats} />
				</div>
			</PageContainer>
		</div>
	);
}
