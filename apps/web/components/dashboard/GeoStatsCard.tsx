'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Globe, MapPin, Building, Navigation, Layers } from 'lucide-react';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { CARD_BASE_STYLES, TITLE_STYLES, SUBTITLE_STYLES } from './styles';

interface GeoStats {
	total_items: number;
	items_with_location: number;
	items_remote: number;
	service_area_breakdown: { area: string; count: number }[];
	top_cities: { city: string; count: number }[];
	top_countries: { country: string; count: number }[];
}

interface GeoStatsResponse extends GeoStats {
	success: boolean;
}

async function fetchGeoStats(): Promise<GeoStats> {
	const response = await fetch('/api/client/geo-stats');
	if (!response.ok) throw new Error('Failed to fetch stats');
	const { success: _success, ...stats }: GeoStatsResponse = await response.json();
	return stats;
}

// Known service area values get specific icons; unknown values get a fallback
const KNOWN_AREA_ICONS: Record<string, React.ReactNode> = {
	local: <Building className="h-4 w-4" />,
	regional: <MapPin className="h-4 w-4" />,
	national: <Navigation className="h-4 w-4" />,
	global: <Globe className="h-4 w-4" />,
};

const FALLBACK_AREA_ICON = <Layers className="h-4 w-4" />;

// Known area keys that have translation entries
const TRANSLATED_AREAS = new Set(['local', 'regional', 'national', 'global']);

const SKELETON_CONTAINER_STYLES = 'animate-pulse';
const SKELETON_TITLE_STYLES = 'h-4 bg-gray-200 dark:bg-white/8 rounded-sm mb-4 w-1/3';
const SKELETON_BODY_STYLES = 'h-64 bg-gray-200 dark:bg-white/8 rounded-sm';
const PROGRESS_BG_STYLES = 'w-full h-2 bg-gray-200 dark:bg-white/8 rounded-full overflow-hidden';
const PROGRESS_FILL_STYLES = 'h-full bg-blue-500 rounded-full transition-all duration-300';
const SECTION_HEADER_STYLES = 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-3';
const STAT_ROW_STYLES = 'flex justify-between text-sm';
const STAT_LABEL_STYLES = 'flex items-center gap-2 text-gray-600 dark:text-gray-400';
const STAT_VALUE_STYLES = 'font-medium text-gray-900 dark:text-gray-100';
const LIST_ROW_STYLES = 'flex justify-between text-sm text-gray-600 dark:text-gray-400';

export function GeoStatsCard() {
	const t = useTranslations('client.dashboard.GEO_STATS');
	const { settings } = useLocationSettings();

	const { data: stats, isLoading } = useQuery({
		queryKey: ['client-geo-stats'],
		queryFn: fetchGeoStats,
		enabled: settings.enabled,
		staleTime: 5 * 60 * 1000,
	});

	if (!settings.enabled) {
		return null;
	}

	if (isLoading) {
		return (
			<div className={CARD_BASE_STYLES}>
				<div className={SKELETON_CONTAINER_STYLES}>
					<div className={SKELETON_TITLE_STYLES} />
					<div className={SKELETON_BODY_STYLES} />
				</div>
			</div>
		);
	}

	if (!stats) {
		return null;
	}

	const locationPercent =
		stats.total_items > 0 ? Math.round((stats.items_with_location / stats.total_items) * 100) : 0;

	return (
		<section className={CARD_BASE_STYLES} aria-labelledby="geo-stats-title">
			<div className="flex items-center gap-2 mb-6">
				<BarChart3 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
				<h3 id="geo-stats-title" className={TITLE_STYLES}>
					{t('TITLE')}
				</h3>
			</div>

			<div className="space-y-6">
				{/* Location Coverage */}
				<div>
					<div className="flex justify-between text-sm mb-2">
						<span className="text-gray-600 dark:text-gray-400">{t('ITEMS_WITH_LOCATION')}</span>
						<span className={STAT_VALUE_STYLES}>
							{stats.items_with_location} / {stats.total_items} ({locationPercent}%)
						</span>
					</div>
					<div className={PROGRESS_BG_STYLES}>
						<div className={PROGRESS_FILL_STYLES} style={{ width: `${locationPercent}%` }} />
					</div>
				</div>

				{/* Remote Items */}
				{stats.items_remote > 0 && (
					<div className={STAT_ROW_STYLES}>
						<span className={STAT_LABEL_STYLES}>
							<Globe className="h-4 w-4" />
							{t('REMOTE_SERVICES')}
						</span>
						<span className={STAT_VALUE_STYLES}>{stats.items_remote}</span>
					</div>
				)}

				{/* Service Area Breakdown */}
				{stats.service_area_breakdown.length > 0 && (
					<div>
						<h4 className={SECTION_HEADER_STYLES}>{t('SERVICE_AREAS')}</h4>
						<div className="grid grid-cols-2 gap-3">
							{stats.service_area_breakdown.map(({ area, count }) => (
								<div key={area} className={STAT_LABEL_STYLES}>
									{KNOWN_AREA_ICONS[area] ?? FALLBACK_AREA_ICON}
									<span className="capitalize">
										{TRANSLATED_AREAS.has(area)
											? t(area.toUpperCase() as 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'GLOBAL')
											: area}
									</span>
									<span className="ml-auto font-medium text-gray-900 dark:text-gray-100">
										{count}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Top Cities */}
				{stats.top_cities.length > 0 && (
					<div>
						<h4 className={SECTION_HEADER_STYLES}>{t('TOP_CITIES')}</h4>
						<div className="space-y-1">
							{stats.top_cities.slice(0, 3).map((city) => (
								<div key={city.city} className={LIST_ROW_STYLES}>
									<span>{city.city}</span>
									<span className={STAT_VALUE_STYLES}>{city.count}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Top Countries */}
				{stats.top_countries.length > 0 && (
					<div>
						<h4 className={SECTION_HEADER_STYLES}>{t('TOP_COUNTRIES')}</h4>
						<div className="space-y-1">
							{stats.top_countries.slice(0, 3).map((country) => (
								<div key={country.country} className={LIST_ROW_STYLES}>
									<span>{country.country}</span>
									<span className={STAT_VALUE_STYLES}>{country.count}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Empty state when no location data at all */}
				{stats.items_with_location === 0 && stats.total_items > 0 && (
					<div className="text-center py-4">
						<p className="text-gray-500 dark:text-gray-400">{t('NO_DATA')}</p>
						<p className={SUBTITLE_STYLES}>{t('NO_DATA_DESC')}</p>
					</div>
				)}
			</div>
		</section>
	);
}
