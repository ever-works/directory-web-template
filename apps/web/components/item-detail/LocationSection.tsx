'use client';

import { MapPin, Navigation, Globe, Building } from 'lucide-react';
import { Map } from '@/components/maps';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';
import type { ItemLocationData } from '@/lib/types/item';
import type { ServiceArea, MapMarkerData } from '@/lib/maps/types';

// ######################### Style Constants #########################

const sectionCardStyles =
	'bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/8 overflow-hidden';

const sectionHeaderStyles = 'px-5 py-4 border-b border-gray-100 dark:border-white/6 flex items-center justify-between';

const iconContainerStyles =
	'p-1.5 bg-orange-100 dark:bg-orange-900/20 rounded-lg';

const iconStyles = 'w-4 h-4 text-orange-600 dark:text-orange-400';

const sectionTitleStyles = 'text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400';

const serviceAreaBadgeStyles =
	'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700/30';

const remoteBadgeStyles =
	'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/8';

const directionsButtonStyles =
	'inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-semibold hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors duration-150 shadow-sm';

// ######################### Types #########################

interface LocationSectionProps {
	location?: ItemLocationData;
	itemName: string;
	itemSlug: string;
}

// ######################### Service Area Config #########################

const SERVICE_AREA_ICONS: Record<ServiceArea, React.ReactNode> = {
	local: <Building className="w-3 h-3" />,
	regional: <MapPin className="w-3 h-3" />,
	national: <Navigation className="w-3 h-3" />,
	global: <Globe className="w-3 h-3" />,
};

const SERVICE_AREA_TRANSLATION_KEYS: Record<ServiceArea, string> = {
	local: 'itemDetail.LOCAL_SERVICE',
	regional: 'itemDetail.REGIONAL_SERVICE',
	national: 'itemDetail.NATIONAL_SERVICE',
	global: 'itemDetail.GLOBAL_SERVICE',
};

const VALID_SERVICE_AREAS = new Set<string>(Object.keys(SERVICE_AREA_ICONS));

function isValidServiceArea(value: string | undefined): value is ServiceArea {
	return typeof value === 'string' && VALID_SERVICE_AREAS.has(value);
}

// ######################### Component #########################

export function LocationSection({ location, itemName, itemSlug }: LocationSectionProps) {
	const { settings } = useLocationSettings();
	const t = useTranslations();

	// Don't render if location features disabled or no location data
	if (!settings.enabled || !location) {
		return null;
	}

	// Handle remote services
	if (location.is_remote) {
		return (
			<div className={sectionCardStyles}>
				<div className={sectionHeaderStyles}>
				<div className="flex items-center gap-3">
					<div className={iconContainerStyles}>
						<Globe className={iconStyles} />
					</div>
					<h2 className={sectionTitleStyles}>{t('itemDetail.LOCATION')}</h2>
				</div>
			</div>
			<div className="px-5 py-4 flex items-center gap-3">
				<span className={remoteBadgeStyles}>
					<Globe className="w-3.5 h-3.5" />
					{t('itemDetail.REMOTE_SERVICE')}
				</span>
				<p className="text-xs text-gray-500 dark:text-gray-400">
						{t('itemDetail.REMOTE_SERVICE_DESC')}
					</p>
				</div>
			</div>
		);
	}

	const hasCoordinates = typeof location.latitude === 'number' && typeof location.longitude === 'number';

	// No coordinates and no city — nothing to show
	if (!hasCoordinates && !location.city) {
		return null;
	}

	// Build display address parts
	const locationLine = [location.city, location.state, location.country].filter(Boolean).join(', ');

	const displayAddress = settings.showExactAddress && location.address ? location.address : null;

	const serviceArea = isValidServiceArea(location.service_area) ? location.service_area : undefined;

	// Build map marker
	const marker: MapMarkerData | null = hasCoordinates
		? {
				id: 'item-location',
				coordinates: {
					latitude: location.latitude!,
					longitude: location.longitude!,
				},
				title: itemName,
				slug: itemSlug,
			}
		: null;

	// Build Google Maps directions URL
	const directionsUrl = hasCoordinates
		? `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`
		: null;

	return (
		<div className={sectionCardStyles}>
			{/* Header */}
			<div className={sectionHeaderStyles}>
				<div className="flex items-center gap-3">
					<div className={iconContainerStyles}>
						<MapPin className={iconStyles} />
					</div>
					<h2 className={sectionTitleStyles}>{t('itemDetail.LOCATION')}</h2>
				</div>
				{serviceArea && SERVICE_AREA_ICONS[serviceArea] && (
					<span className={serviceAreaBadgeStyles}>
						{SERVICE_AREA_ICONS[serviceArea]}
						{t(SERVICE_AREA_TRANSLATION_KEYS[serviceArea])}
					</span>
				)}
			</div>

			<div className="px-5 py-4 space-y-4">
				{/* Mini Map */}
				{marker && (
					<div className="h-44 rounded-xl overflow-hidden border border-gray-100 dark:border-white/6">
						<Map
							markers={[marker]}
							center={marker.coordinates}
							zoom={14}
							height={176}
							controls={{
								showZoomControls: false,
								showFullscreenControl: false,
							}}
							enableClustering={false}
							ariaLabel={`${itemName} location map`}
						/>
					</div>
				)}

				{/* Address Info */}
				<div className="space-y-0.5">
					{displayAddress && (
						<p className="text-sm font-medium text-gray-800 dark:text-gray-200">{displayAddress}</p>
					)}
					{locationLine && (
						<p className="text-xs text-gray-500 dark:text-gray-400">{locationLine}</p>
					)}
					{location.postal_code && (
						<p className="text-xs text-gray-400 dark:text-gray-500">{location.postal_code}</p>
					)}
				</div>

				{/* Get Directions Button */}
				{directionsUrl && (
					<a
						href={directionsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={directionsButtonStyles}
					>
						<Navigation className="w-3.5 h-3.5" />
						{t('itemDetail.GET_DIRECTIONS')}
					</a>
				)}
			</div>
		</div>
	);
}
