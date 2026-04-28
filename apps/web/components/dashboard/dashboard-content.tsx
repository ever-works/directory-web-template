'use client';

import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';
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
import { ItemsMapCard } from './ItemsMapCard';
import { GeoStatsCard } from './GeoStatsCard';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { Button } from '@/components/ui/button';
import { PageContainer } from '../ui/container';

interface DashboardContentProps {
	session: Session | null;
}

export function DashboardContent({ session }: DashboardContentProps) {
	const t = useTranslations('client.dashboard');
	const { data: stats, refetch: refetchStats, error: statsError } = useDashboardStats();
	const { settings: locationSettings } = useLocationSettings();

	const handleRefresh = async () => {
		try {
			await refetchStats();
		} catch (error) {
			console.error('Failed to refresh data:', error);
		}
	};

	// Auth handled at route level - all dashboard pages require authentication

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			<PageContainer className="py-6">
				{/* Error Handling */}
				{statsError && (
					<div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-800/40">
						{t('FAILED_TO_LOAD')}: {statsError.message}
					</div>
				)}
				{/* Header */}
				<div className="mb-6">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-lg font-semibold text-neutral-900 dark:text-white tracking-tight">{t('TITLE')}</h1>
							<p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
								{t('WELCOME_BACK', { name: session?.user?.name || 'User' })}
							</p>
						</div>
						<Button
							onClick={handleRefresh}
							variant="outline"
							size="sm"
							className="flex items-center gap-1.5 h-8 px-3 text-xs border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/6"
						>
							<RefreshCw className="h-3.5 w-3.5" />
							<span>{t('REFRESH')}</span>
						</Button>
					</div>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<StatsCard
						title={t('STATS.TOTAL_SUBMISSIONS')}
						value={stats?.totalSubmissions || 0}
						description={t('STATS.CONTENT_CREATED')}
						icon={MessageSquare}
						isLoading={!stats}
					/>
					<StatsCard
						title={t('STATS.TOTAL_VIEWS')}
						value={stats?.totalViews || 0}
						description={t('STATS.VIEWS_ON_CONTENT')}
						icon={TrendingUp}
						isLoading={!stats}
					/>
					<StatsCard
						title={t('STATS.VOTES_RECEIVED')}
						value={stats?.totalVotesReceived || 0}
						description={t('STATS.VOTES_ON_CONTENT')}
						icon={ThumbsUp}
						isLoading={!stats}
					/>
					<StatsCard
						title={t('STATS.COMMENTS_RECEIVED')}
						value={stats?.totalCommentsReceived || 0}
						description={t('STATS.COMMENTS_ON_CONTENT')}
						icon={Activity}
						isLoading={!stats}
					/>
				</div>

				{/* Period Comparison */}
				<div className="mb-6">
					<PeriodComparison data={stats?.periodComparison} isLoading={!stats} />
				</div>

				{/* Submission Timeline & Status */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
					<SubmissionTimeline data={stats?.submissionTimeline || []} isLoading={!stats} />
					<StatusBreakdown data={stats?.statusBreakdown || []} isLoading={!stats} />
				</div>

				{/* Engagement Overview */}
				<div className="mb-6">
					<EngagementOverview data={stats?.engagementOverview || []} isLoading={!stats} />
				</div>

				{/* Location Cards */}
				{locationSettings.enabled && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
						<ItemsMapCard />
						<GeoStatsCard />
					</div>
				)}

				{/* Category Performance & Approval Trend */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
					<CategoryPerformance data={stats?.categoryPerformance || []} isLoading={!stats} />
					<ApprovalTrend data={stats?.approvalTrend || []} isLoading={!stats} />
				</div>

				{/* Top Items Section */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
					<div className="lg:col-span-2">
						<TopItems items={stats?.topItems || []} isLoading={!stats} />
					</div>
					<div>
						<EngagementChart data={stats?.engagementChartData || []} isLoading={!stats} />
					</div>
				</div>

				{/* Submission Calendar - Full Width */}
				<div className="mb-6">
					<SubmissionCalendar data={stats?.submissionCalendar || []} isLoading={!stats} />
				</div>

				{/* Engagement Distribution */}
				<div className="mb-6">
					<EngagementDistribution data={stats?.engagementDistribution || []} isLoading={!stats} />
				</div>

				{/* Engagement Rate Chart */}
				<div className="mb-6">
					<EngagementRateChart
						engagementOverview={stats?.engagementOverview || []}
						totalSubmissions={stats?.totalSubmissions || 0}
						isLoading={!stats}
					/>
				</div>

				{/* Weekly Activity Chart */}
				<div className="mb-6">
					<ActivityChart data={stats?.activityChartData || []} isLoading={!stats} />
				</div>
			</PageContainer>
		</div>
	);
}
