'use client';

import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useGeoAnalytics } from '@/hooks/use-geo-analytics';
import { AdminErrorBoundary } from '@/components/admin/admin-error-boundary';
import { AdminResponsiveGrid } from '@/components/admin/admin-responsive';
import { Button } from '@/components/ui/button';
import { LocationStatsCard } from './LocationStatsCard';
import { DistributionMap } from './DistributionMap';
import { IndexManagement } from './IndexManagement';

// ===================== Style Constants =====================

const DISABLED_CONTAINER_STYLES = 'flex flex-col items-center justify-center text-center py-12 px-6 text-gray-500 dark:text-gray-400';
const LOADING_SKELETON_STYLES = 'animate-pulse space-y-6';
const SKELETON_CARD_STYLES = 'bg-gray-200 dark:bg-gray-700 rounded-xl h-80';
const SKELETON_BAR_STYLES = 'bg-gray-200 dark:bg-gray-700 rounded-xl h-40';
const ERROR_CONTAINER_STYLES = 'text-center py-8';
const ERROR_TEXT_STYLES = 'text-sm text-red-600 dark:text-red-400 mb-4';

// ===================== Component =====================

export function GeographicSection() {
	const t = useTranslations('admin.DASHBOARD.GEO');
	const { settings } = useLocationSettings();
	const { data, isLoading, isError, error, refetch } = useGeoAnalytics();

	// Don't render if location features are disabled
	if (!settings.enabled) {
		return (
			<div className={DISABLED_CONTAINER_STYLES}>
				<MapPin className="w-10 h-10 mb-3 text-gray-300 dark:text-gray-600" />
				<p className="text-sm">{t('LOCATION_DISABLED')}</p>
			</div>
		);
	}

	// Loading skeleton
	if (isLoading) {
		return (
			<div className={LOADING_SKELETON_STYLES}>
				<AdminResponsiveGrid cols={2}>
					<div className={SKELETON_CARD_STYLES} />
					<div className={SKELETON_CARD_STYLES} />
				</AdminResponsiveGrid>
				<div className={SKELETON_BAR_STYLES} />
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className={ERROR_CONTAINER_STYLES}>
				<p className={ERROR_TEXT_STYLES}>
					{error instanceof Error ? error.message : t('ACTION_FAILED')}
				</p>
				<Button variant="outline" size="sm" onClick={() => refetch()}>
					{t('REBUILD_INDEX')}
				</Button>
			</div>
		);
	}

	// No data
	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6">
			<AdminResponsiveGrid cols={2}>
				<AdminErrorBoundary>
					<LocationStatsCard stats={data.stats} distributions={data.distributions} />
				</AdminErrorBoundary>
				<AdminErrorBoundary>
					<DistributionMap locations={data.locations} />
				</AdminErrorBoundary>
			</AdminResponsiveGrid>

			<AdminErrorBoundary>
				<IndexManagement
					lastRebuildAt={data.stats.lastRebuildAt}
					totalIndexed={data.stats.totalIndexed}
				/>
			</AdminErrorBoundary>
		</div>
	);
}
