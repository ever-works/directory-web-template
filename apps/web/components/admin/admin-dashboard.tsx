'use client';

import { useEffect, useState } from 'react';
import { useAdminStats } from '@/hooks/use-admin-stats';
import { RefreshCw } from 'lucide-react';
import { AdminErrorBoundary } from './admin-error-boundary';
import { AdminStatsOverview } from './admin-stats-overview';
import { AdminActivityChart } from './admin-activity-chart';
import { AdminSubmissionStatus } from './admin-submission-status';
import { AdminRecentActivity } from './admin-recent-activity';
import { AdminTopItems } from './admin-top-items';
import { AdminFeaturesGrid } from './admin-features-grid';
import { AdminPerformanceMonitor } from './admin-performance-monitor';
import { AdminDataExport } from './admin-data-export';
import { GeographicSection } from './dashboard/GeographicSection';
import {
	AdminSkipLink,
	AdminLandmark,
	AdminHeading,
	AdminStatusAnnouncer,
	AdminAccessibleButton
} from './admin-accessibility';
import { AdminResponsiveGrid } from './admin-responsive';
import { AdminPullToRefresh } from './admin-touch-interactions';
import { AdminWelcomeGradient } from './admin-welcome-section';
import { AdminNotifications } from './admin-notifications';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

// Design system constants
const ERROR_BOX_STYLES =
	'mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg';
const ERROR_CONTENT_STYLES = 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4';
const ADMIN_TOOLS_TITLE_STYLES = 'mb-6';

export function AdminDashboard() {
	const t = useTranslations('admin.DASHBOARD');
	const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'performance' | 'reports' | 'tools'>(
		'overview'
	);
	const { data: stats, isLoading, isError, error, refetch, isFetching } = useAdminStats();

	// Screen reader announcements (driven by fetch transitions)
	const [srMessage, setSrMessage] = useState('');
	useEffect(() => {
		if (isFetching) {
			setSrMessage(t('REFRESHING_DASHBOARD_DATA'));
		} else if (isError) {
			setSrMessage(t('ERROR_LOADING_DASHBOARD_DATA'));
		} else if (stats) {
			setSrMessage(t('DASHBOARD_DATA_LOADED_SUCCESSFULLY'));
		}
	}, [isFetching, isError, stats, t]);

	// Show loading state while fetching data
	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">{t('LOADING_DASHBOARD_DATA')}</p>
				</div>
			</div>
		);
	}

	// Dynamic refresh icon class
	const refreshIconClass = isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4';

	// Wrapper function for pull-to-refresh
	const handleRefresh = async () => {
		await refetch();
	};

	return (
		<>
			{/* Skip navigation for keyboard users */}
			<AdminSkipLink href="#main-content">{t('SKIP_TO_MAIN_CONTENT')}</AdminSkipLink>
			<AdminSkipLink href="#dashboard-stats">{t('SKIP_TO_STATISTICS')}</AdminSkipLink>
			<AdminSkipLink href="#dashboard-charts">{t('SKIP_TO_CHARTS')}</AdminSkipLink>
			<AdminSkipLink href="#admin-tools">{t('SKIP_TO_ADMIN_TOOLS')}</AdminSkipLink>
      <div className="space-y-8">
      {/* Welcome Section */}
      <AdminWelcomeGradient
        title={t('TITLE')}
        subtitle={t('SUBTITLE')}
        rightActions={(
          <div className="flex items-center gap-3">
            <AdminNotifications />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={refreshIconClass} />
              <span>{t('REFRESH')}</span>
            </Button>
          </div>
        )}
      />
			{/* Status announcements for screen readers */}
			<AdminStatusAnnouncer message={srMessage} priority={isError ? 'assertive' : 'polite'} />

			<div className="p-6 max-w-7xl mx-auto" id="main-content">
				{/* Gradient header moved into AdminWelcomeGradient */}

				{/* Tabs */}
				<div className="mb-6">
					<div role="tablist" aria-label={t('ARIA_LABELS.DASHBOARD_SECTIONS')} className="flex flex-wrap gap-2">
						{[
							{ key: 'overview', label: t('TABS.OVERVIEW') },
							{ key: 'analytics', label: t('TABS.ANALYTICS') },
							{ key: 'performance', label: t('TABS.PERFORMANCE') },
							{ key: 'reports', label: t('TABS.REPORTS') },
							{ key: 'tools', label: t('TABS.TOOLS') }
						].map((tab) => (
							<button
                                type="button"
								key={tab.key}
								role="tab"
								aria-selected={activeTab === (tab.key as any)}
								aria-controls={`section-${tab.key}`}
								onClick={() => setActiveTab(tab.key as any)}
								className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
									activeTab === (tab.key as any)
										? 'bg-theme-primary text-white border-theme-primary'
										: 'bg-white dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.06]'
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>

				{/* Error State */}
				{isError && (
					<AdminLandmark
						as="section"
						label={t('ARIA_LABELS.ERROR_NOTIFICATION')}
						role="alert"
						aria-live="assertive"
						className={ERROR_BOX_STYLES}
					>
						<div className={ERROR_CONTENT_STYLES}>
							<p className="text-sm">
								{error instanceof Error ? error.message : t('FAILED_TO_LOAD_ADMIN_STATISTICS')}
							</p>
							<AdminAccessibleButton
								variant="secondary"
								size="sm"
								onClick={() => refetch()}
								disabled={isFetching}
								aria-label={t('RETRY_LOADING_DASHBOARD_DATA')}
							>
								{t('RETRY')}
							</AdminAccessibleButton>
						</div>
					</AdminLandmark>
				)}

				{!isError && (
					<AdminPullToRefresh onRefresh={handleRefresh}>
						{/* Overview Tab */}
						{activeTab === 'overview' && (
							<section id="section-overview" aria-label={t('ARIA_LABELS.OVERVIEW')} className="space-y-8">
								<AdminLandmark as="section" label={t('SECTIONS.DASHBOARD_STATISTICS')} id="dashboard-stats">
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.DASHBOARD_STATISTICS')}
									</AdminHeading>
									<AdminErrorBoundary>
										<AdminStatsOverview stats={stats} isLoading={false} />
									</AdminErrorBoundary>
								</AdminLandmark>

								<AdminLandmark as="section" label={t('SECTIONS.SUBMISSIONS_STATUS')}>
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.SUBMISSIONS_STATUS')}
									</AdminHeading>
									<AdminErrorBoundary>
										<AdminSubmissionStatus
											data={stats?.submissionStatusData || []}
											isLoading={false}
										/>
									</AdminErrorBoundary>
								</AdminLandmark>
							</section>
						)}

						{/* Analytics Tab */}
						{activeTab === 'analytics' && (
							<section id="section-analytics" aria-label={t('ARIA_LABELS.ANALYTICS')} className="space-y-8">
								<AdminLandmark as="section" label={t('SECTIONS.ANALYTICS_OVERVIEW')} id="dashboard-charts">
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.ANALYTICS_OVERVIEW')}
									</AdminHeading>
									<AdminResponsiveGrid cols={2} gap="lg">
										<AdminErrorBoundary>
											<AdminActivityChart
												data={stats?.activityTrendData || []}
												isLoading={false}
											/>
										</AdminErrorBoundary>
										<AdminErrorBoundary>
											<AdminTopItems data={stats?.topItemsData || []} isLoading={false} />
										</AdminErrorBoundary>
									</AdminResponsiveGrid>
								</AdminLandmark>

								<AdminLandmark as="section" label={t('SECTIONS.RECENT_ACTIVITY')}>
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.RECENT_ACTIVITY')}
									</AdminHeading>
									<AdminErrorBoundary>
										<AdminRecentActivity data={stats?.recentActivity || []} isLoading={false} />
									</AdminErrorBoundary>
								</AdminLandmark>

								<AdminLandmark as="section" label={t('SECTIONS.GEOGRAPHIC_DISTRIBUTION')}>
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.GEOGRAPHIC_DISTRIBUTION')}
									</AdminHeading>
									<AdminErrorBoundary>
										<GeographicSection />
									</AdminErrorBoundary>
								</AdminLandmark>
							</section>
						)}

						{/* Performance Tab */}
						{activeTab === 'performance' && (
							<section id="section-performance" aria-label={t('ARIA_LABELS.PERFORMANCE')} className="space-y-8">
								<AdminLandmark as="section" label={t('SECTIONS.PERFORMANCE')} id="performance-monitor">
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.PERFORMANCE')}
									</AdminHeading>
									<AdminErrorBoundary>
										<AdminPerformanceMonitor />
									</AdminErrorBoundary>
								</AdminLandmark>
							</section>
						)}

						{/* Reports Tab */}
						{activeTab === 'reports' && (
							<section id="section-reports" aria-label={t('ARIA_LABELS.REPORTS')} className="space-y-8">
								<AdminLandmark as="section" label={t('SECTIONS.DATA_EXPORT_REPORTS')} id="data-export">
									<AdminHeading level={2} visualLevel={3} className="mb-4 md:mb-6">
										{t('SECTIONS.DATA_EXPORT_REPORTS')}
									</AdminHeading>
									<AdminErrorBoundary>
										<AdminDataExport />
									</AdminErrorBoundary>
								</AdminLandmark>
							</section>
						)}

						{/* Tools Tab */}
						{activeTab === 'tools' && (
							<section id="section-tools" aria-label={t('ARIA_LABELS.TOOLS')} className="space-y-8">
								<AdminLandmark as="section" label={t('SECTIONS.ADMIN_TOOLS')} id="admin-tools">
									<AdminHeading level={2} visualLevel={3} className={ADMIN_TOOLS_TITLE_STYLES}>
										{t('SECTIONS.ADMIN_TOOLS')}
									</AdminHeading>
									<AdminFeaturesGrid />
								</AdminLandmark>
							</section>
						)}
					</AdminPullToRefresh>
				)}
			</div>
      </div>
		</>
    );
  }
