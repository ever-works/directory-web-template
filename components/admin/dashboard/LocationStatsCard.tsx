'use client';

import { MapPin, Globe, Building2, Wifi, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { GeoAnalyticsStats, CountryDistribution, ServiceAreaDistribution } from '@/hooks/use-geo-analytics';

// ===================== Style Constants =====================

const CARD_STYLES = 'bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 p-4 md:p-6';
const HEADER_STYLES = 'flex items-center justify-between mb-4';
const TITLE_STYLES = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
const BADGE_BASE_STYLES = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium';
const BADGE_SYNCED_STYLES = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
const BADGE_OUT_OF_SYNC_STYLES = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
const PROGRESS_TRACK_STYLES = 'w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden';
const STAT_ITEM_STYLES = 'flex items-center gap-2 text-sm';
const STAT_LABEL_STYLES = 'text-gray-600 dark:text-gray-400';
const STAT_VALUE_STYLES = 'ml-auto font-medium text-gray-900 dark:text-gray-100';
const SECTION_TITLE_STYLES = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2';
const DISTRIBUTION_ROW_STYLES = 'flex justify-between text-sm';
const DISTRIBUTION_LABEL_STYLES = 'text-gray-600 dark:text-gray-400 capitalize';
const DISTRIBUTION_VALUE_STYLES = 'font-medium text-gray-900 dark:text-gray-100';
const WARNING_STYLES = 'text-xs text-yellow-700 dark:text-yellow-300 p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800';

// ===================== Props =====================

interface LocationStatsCardProps {
	stats: GeoAnalyticsStats;
	distributions: {
		byCountry: CountryDistribution[];
		byServiceArea: ServiceAreaDistribution[];
	};
}

// ===================== Service Area Label Map =====================

const SERVICE_AREA_KEYS: Record<string, 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'GLOBAL'> = {
	local: 'LOCAL',
	regional: 'REGIONAL',
	national: 'NATIONAL',
	global: 'GLOBAL',
};

// ===================== Component =====================

export function LocationStatsCard({ stats, distributions }: LocationStatsCardProps) {
	const t = useTranslations('admin.DASHBOARD.GEO');

	const isSynced = stats.totalIndexed === stats.totalItems || stats.totalIndexed >= stats.totalItems;

	return (
		<div className={CARD_STYLES}>
			{/* Header */}
			<div className={HEADER_STYLES}>
				<h3 className={TITLE_STYLES}>{t('LOCATION_COVERAGE')}</h3>
				<span
					className={cn(
						BADGE_BASE_STYLES,
						isSynced ? BADGE_SYNCED_STYLES : BADGE_OUT_OF_SYNC_STYLES
					)}
				>
					{isSynced ? (
						<CheckCircle className="w-3 h-3" />
					) : (
						<AlertTriangle className="w-3 h-3" />
					)}
					{isSynced ? t('INDEX_SYNCED') : t('INDEX_OUT_OF_SYNC')}
				</span>
			</div>

			<div className="space-y-4">
				{/* Coverage Progress */}
				<div>
					<div className="flex justify-between text-sm mb-1.5">
						<span className={STAT_LABEL_STYLES}>
							{t('ITEMS_OF_TOTAL', { indexed: stats.totalIndexed, total: stats.totalItems })}
						</span>
						<span className="font-medium text-gray-900 dark:text-gray-100">
							{t('COVERAGE_PERCENT', { percent: stats.coveragePercent })}
						</span>
					</div>
					<div className={PROGRESS_TRACK_STYLES}>
						<div
							className="h-full bg-theme-primary rounded-full transition-all duration-500"
							style={{ width: `${Math.min(stats.coveragePercent, 100)}%` }}
						/>
					</div>
				</div>

				{/* Stat Grid */}
				<div className="grid grid-cols-2 gap-3">
					<div className={STAT_ITEM_STYLES}>
						<MapPin className="w-4 h-4 text-blue-500" />
						<span className={STAT_LABEL_STYLES}>{t('TOTAL_INDEXED')}</span>
						<span className={STAT_VALUE_STYLES}>{stats.totalIndexed}</span>
					</div>
					<div className={STAT_ITEM_STYLES}>
						<Building2 className="w-4 h-4 text-purple-500" />
						<span className={STAT_LABEL_STYLES}>{t('CITIES')}</span>
						<span className={STAT_VALUE_STYLES}>{stats.citiesCount}</span>
					</div>
					<div className={STAT_ITEM_STYLES}>
						<Globe className="w-4 h-4 text-green-500" />
						<span className={STAT_LABEL_STYLES}>{t('COUNTRIES')}</span>
						<span className={STAT_VALUE_STYLES}>{stats.countriesCount}</span>
					</div>
					<div className={STAT_ITEM_STYLES}>
						<Wifi className="w-4 h-4 text-orange-500" />
						<span className={STAT_LABEL_STYLES}>{t('REMOTE_ITEMS')}</span>
						<span className={STAT_VALUE_STYLES}>{stats.remoteCount}</span>
					</div>
				</div>

				{/* Service Area Breakdown */}
				{distributions.byServiceArea.length > 0 && (
					<div>
						<h4 className={SECTION_TITLE_STYLES}>{t('SERVICE_AREA_BREAKDOWN')}</h4>
						<div className="grid grid-cols-2 gap-1.5">
							{distributions.byServiceArea.map(({ area, count }) => (
								<div key={area} className={DISTRIBUTION_ROW_STYLES}>
									<span className={DISTRIBUTION_LABEL_STYLES}>
										{SERVICE_AREA_KEYS[area] ? t(SERVICE_AREA_KEYS[area]) : area}
									</span>
									<span className={DISTRIBUTION_VALUE_STYLES}>{count}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Top Countries */}
				{distributions.byCountry.length > 0 && (
					<div>
						<h4 className={SECTION_TITLE_STYLES}>{t('TOP_COUNTRIES')}</h4>
						<div className="space-y-1">
							{distributions.byCountry.slice(0, 5).map(({ name, count }) => (
								<div key={name} className={DISTRIBUTION_ROW_STYLES}>
									<span className={DISTRIBUTION_LABEL_STYLES}>{name}</span>
									<span className={DISTRIBUTION_VALUE_STYLES}>{count}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Sync Warning */}
				{!isSynced && (
					<div className={WARNING_STYLES}>
						{t('INDEX_SYNC_WARNING', {
							actual: stats.totalIndexed,
							expected: stats.totalItems,
						})}
					</div>
				)}
			</div>
		</div>
	);
}
