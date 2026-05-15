'use client';

import { useState } from 'react';
import { Session } from 'next-auth';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { MessageSquare, ThumbsUp, TrendingUp, Activity, MapPinOff, AlertCircle } from 'lucide-react';
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
import { DashboardHeader } from './dashboard-header';
import { QuickActions } from './quick-actions';
import { DashboardAlertBanner } from './dashboard-alert-banner';
import { DashboardMobileSummary } from './dashboard-mobile-summary';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { PageContainer } from '../ui/container';

interface DashboardContentProps {
	session: Session | null;
}

type Tab = 'overview' | 'content' | 'engagement' | 'geographic';

interface TabDef {
	id: Tab;
	labelKey: string;
}

const TABS: TabDef[] = [
	{ id: 'overview', labelKey: 'TABS.OVERVIEW' },
	{ id: 'content', labelKey: 'TABS.CONTENT' },
	{ id: 'engagement', labelKey: 'TABS.ENGAGEMENT' },
	{ id: 'geographic', labelKey: 'TABS.GEOGRAPHIC' },
];

export function DashboardContent({ session }: DashboardContentProps) {
	const t = useTranslations('client.dashboard');
	const locale = useLocale();

	const [activeTab, setActiveTab] = useState<Tab>('overview');

	const {
		data: stats,
		refetch: refetchStats,
		isFetching,
		error: statsError,
	} = useDashboardStats();

	const { settings: locationSettings } = useLocationSettings();

	const handleRefresh = async () => {
		try {
			await refetchStats();
		} catch {
			// error surfaced via statsError
		}
	};

	// Derive trend deltas from periodComparison
	const pc = stats?.periodComparison;
	const submissionsTrend = pc
		? { value: Math.abs(pc.change.submissions), isPositive: pc.change.submissions >= 0 }
		: undefined;
	const viewsTrend = pc
		? { value: Math.abs(pc.change.views), isPositive: pc.change.views >= 0 }
		: undefined;
	const votesTrend = pc
		? { value: Math.abs(pc.change.votes), isPositive: pc.change.votes >= 0 }
		: undefined;
	const commentsTrend = pc
		? { value: Math.abs(pc.change.comments), isPositive: pc.change.comments >= 0 }
		: undefined;

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-[#0a0a0a]">
			{/* Sticky mobile KPI bar */}
			<DashboardMobileSummary stats={stats} />

			<PageContainer className="py-6">
				{/* Error banner */}
				{statsError && (
					<div
						role="alert"
						className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-lg border border-red-200 dark:border-red-800/40"
					>
						<AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
						<span>
							{t('FAILED_TO_LOAD')}: {statsError.message}
						</span>
					</div>
				)}

				{/* Header: avatar + greeting + actions */}
				<DashboardHeader
					session={session}
					onRefresh={handleRefresh}
					isRefreshing={isFetching}
				/>

				{/* Alert banners (pending items, zero state prompts) */}
				<DashboardAlertBanner stats={stats} />

				{/* Quick action cards */}
				<QuickActions />

				{/* Stats KPI grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<StatsCard
						title={t('STATS.TOTAL_SUBMISSIONS')}
						value={stats?.totalSubmissions ?? 0}
						description={t('STATS.CONTENT_CREATED')}
						icon={MessageSquare}
						trend={submissionsTrend}
						emptyState={{
							message: t('EMPTY.SUBMISSIONS'),
							href: `/${locale}/submit`,
							linkLabel: t('EMPTY.SUBMIT_NOW'),
						}}
						isLoading={!stats}
					/>
					<StatsCard
						title={t('STATS.TOTAL_VIEWS')}
						value={stats?.totalViews ?? 0}
						description={t('STATS.VIEWS_ON_CONTENT')}
						icon={TrendingUp}
						trend={viewsTrend}
						emptyState={{ message: t('EMPTY.VIEWS') }}
						isLoading={!stats}
					/>
					<StatsCard
						title={t('STATS.VOTES_RECEIVED')}
						value={stats?.totalVotesReceived ?? 0}
						description={t('STATS.VOTES_ON_CONTENT')}
						icon={ThumbsUp}
						trend={votesTrend}
						emptyState={{ message: t('EMPTY.VOTES') }}
						isLoading={!stats}
					/>
					<StatsCard
						title={t('STATS.COMMENTS_RECEIVED')}
						value={stats?.totalCommentsReceived ?? 0}
						description={t('STATS.COMMENTS_ON_CONTENT')}
						icon={Activity}
						trend={commentsTrend}
						emptyState={{ message: t('EMPTY.COMMENTS') }}
						isLoading={!stats}
					/>
				</div>

				{/* Tab navigation */}
				<div
					role="tablist"
					aria-label={t('TABS.LABEL')}
					className="flex items-center gap-1 mb-6 border-b border-neutral-200 dark:border-white/8"
				>
					{TABS.map(({ id, labelKey }) => (
						<button
							key={id}
							role="tab"
							id={`tab-${id}`}
							aria-selected={activeTab === id}
							aria-controls={`tabpanel-${id}`}
							onClick={() => setActiveTab(id)}
							className={`
								relative px-4 py-2.5 text-xs font-medium transition-colors duration-150
								${
									activeTab === id
										? 'text-neutral-900 dark:text-white'
										: 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
								}
							`}
						>
							{t(labelKey)}
							{activeTab === id && (
								<span
									className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-white rounded-full"
									aria-hidden="true"
								/>
							)}
						</button>
					))}
				</div>

				{/* Tab panels */}

				{/* OVERVIEW */}
				<div
					id="tabpanel-overview"
					role="tabpanel"
					aria-labelledby="tab-overview"
					hidden={activeTab !== 'overview'}
				>
					<div className="space-y-6">
						<PeriodComparison data={stats?.periodComparison} isLoading={!stats} />

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<SubmissionTimeline data={stats?.submissionTimeline ?? []} isLoading={!stats} />
							<StatusBreakdown data={stats?.statusBreakdown ?? []} isLoading={!stats} />
						</div>

						<ActivityChart data={stats?.activityChartData ?? []} isLoading={!stats} />
					</div>
				</div>

				{/* CONTENT */}
				<div
					id="tabpanel-content"
					role="tabpanel"
					aria-labelledby="tab-content"
					hidden={activeTab !== 'content'}
				>
					<div className="space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							<div className="lg:col-span-2">
								<TopItems items={stats?.topItems ?? []} isLoading={!stats} />
							</div>
							<div>
								<EngagementChart data={stats?.engagementChartData ?? []} isLoading={!stats} />
							</div>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<CategoryPerformance data={stats?.categoryPerformance ?? []} isLoading={!stats} />
							<ApprovalTrend data={stats?.approvalTrend ?? []} isLoading={!stats} />
						</div>

						<SubmissionCalendar data={stats?.submissionCalendar ?? []} isLoading={!stats} />
					</div>
				</div>

				{/* ENGAGEMENT */}
				<div
					id="tabpanel-engagement"
					role="tabpanel"
					aria-labelledby="tab-engagement"
					hidden={activeTab !== 'engagement'}
				>
					<div className="space-y-6">
						<EngagementOverview data={stats?.engagementOverview ?? []} isLoading={!stats} />
						<EngagementDistribution data={stats?.engagementDistribution ?? []} isLoading={!stats} />
						<EngagementRateChart
							engagementOverview={stats?.engagementOverview ?? []}
							totalSubmissions={stats?.totalSubmissions ?? 0}
							isLoading={!stats}
						/>
					</div>
				</div>

				{/* GEOGRAPHIC */}
				<div
					id="tabpanel-geographic"
					role="tabpanel"
					aria-labelledby="tab-geographic"
					hidden={activeTab !== 'geographic'}
				>
					{locationSettings.enabled ? (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
							<ItemsMapCard />
							<GeoStatsCard />
						</div>
					) : (
						<div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 dark:border-white/10 bg-white dark:bg-white/3 p-6">
							<div className="p-2.5 bg-neutral-100 dark:bg-white/8 rounded-lg">
								<MapPinOff className="h-5 w-5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
							</div>
							<div>
								<p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
									{t('LOCATION_DISABLED_TITLE')}
								</p>
								<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
									{t('LOCATION_DISABLED_DESC')}
								</p>
							</div>
						</div>
					)}
				</div>
			</PageContainer>
		</div>
	);
}
