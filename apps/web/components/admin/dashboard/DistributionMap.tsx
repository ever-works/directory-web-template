'use client';

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Map } from '@/components/maps/map';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useMapProvider } from '@/hooks/use-map-provider';
import type { MapMarkerData } from '@/lib/maps/types';
import type { GeoLocation } from '@/hooks/use-geo-analytics';

// ===================== Style Constants =====================

const CARD_STYLES = 'bg-white dark:bg-gray-900 rounded-xl shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden';
const HEADER_STYLES = 'flex items-center gap-2 px-4 pt-4 md:px-6 md:pt-6 pb-3';
const TITLE_STYLES = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
const MAP_CONTAINER_STYLES = 'px-4 pb-4 md:px-6 md:pb-6';
const MAP_WRAPPER_STYLES = 'h-80 rounded-lg overflow-hidden';
const EMPTY_STATE_STYLES = 'h-80 flex flex-col items-center justify-center text-center px-6 text-gray-500 dark:text-gray-400';

// ===================== Props =====================

interface DistributionMapProps {
	locations: GeoLocation[];
}

// ===================== Component =====================

export function DistributionMap({ locations }: DistributionMapProps) {
	const t = useTranslations('admin.DASHBOARD.GEO');
	const { settings } = useLocationSettings();
	const { isConfigured } = useMapProvider();

	// Transform GeoLocation[] to MapMarkerData[]
	const markers: MapMarkerData[] = useMemo(() => {
		return locations
			.filter((loc) => !loc.isRemote)
			.map((loc) => ({
				id: loc.itemSlug,
				coordinates: { latitude: loc.latitude, longitude: loc.longitude },
				title: loc.city || loc.country || loc.itemSlug,
				slug: loc.itemSlug,
			}));
	}, [locations]);

	// If location features are disabled, show disabled message
	if (!settings.enabled) {
		return (
			<div className={CARD_STYLES}>
				<div className={HEADER_STYLES}>
					<MapPin className="w-4 h-4 text-gray-400" />
					<h3 className={TITLE_STYLES}>{t('DISTRIBUTION_MAP')}</h3>
				</div>
				<div className={EMPTY_STATE_STYLES}>
					<MapPin className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
					<p className="text-sm">{t('LOCATION_DISABLED')}</p>
				</div>
			</div>
		);
	}

	// If map provider is not configured (no API keys)
	if (!isConfigured) {
		return (
			<div className={CARD_STYLES}>
				<div className={HEADER_STYLES}>
					<MapPin className="w-4 h-4 text-gray-400" />
					<h3 className={TITLE_STYLES}>{t('DISTRIBUTION_MAP')}</h3>
				</div>
				<div className={EMPTY_STATE_STYLES}>
					<MapPin className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
					<p className="text-sm">{t('MAP_NOT_CONFIGURED')}</p>
				</div>
			</div>
		);
	}

	// If no locations to show
	if (markers.length === 0) {
		return (
			<div className={CARD_STYLES}>
				<div className={HEADER_STYLES}>
					<MapPin className="w-4 h-4 text-gray-400" />
					<h3 className={TITLE_STYLES}>{t('DISTRIBUTION_MAP')}</h3>
				</div>
				<div className={EMPTY_STATE_STYLES}>
					<MapPin className="w-8 h-8 mb-2 text-gray-300 dark:text-gray-600" />
					<p className="text-sm">{t('NO_LOCATIONS')}</p>
				</div>
			</div>
		);
	}

	return (
		<div className={CARD_STYLES}>
			<div className={HEADER_STYLES}>
				<MapPin className="w-4 h-4 text-blue-500" />
				<h3 className={TITLE_STYLES}>{t('DISTRIBUTION_MAP')}</h3>
			</div>
			<div className={MAP_CONTAINER_STYLES}>
				<div className={MAP_WRAPPER_STYLES}>
					<Map
						markers={markers}
						enableClustering
						height={320}
						controls={{ showZoomControls: true, showFullscreenControl: true }}
						ariaLabel={t('DISTRIBUTION_MAP')}
					/>
				</div>
			</div>
		</div>
	);
}
