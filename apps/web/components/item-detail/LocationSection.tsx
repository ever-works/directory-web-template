'use client';

import { MapPin, Navigation, Globe, Building } from 'lucide-react';
import { Map } from '@/components/maps';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';
import type { ItemLocationData } from '@/lib/types/item';
import type { ServiceArea, MapMarkerData } from '@/lib/maps/types';

// ######################### Style Constants #########################

const sectionCardStyles =
	'bg-white/95 dark:bg-white/[0.03] rounded-2xl p-8 border border-gray-200/50 dark:border-white/[0.06] backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1';

const sectionHeaderStyles = 'flex items-center justify-between mb-6';

const iconContainerStyles =
	'p-3 bg-linear-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 rounded-xl';

const iconStyles = 'w-6 h-6 text-orange-600 dark:text-orange-400';

const sectionTitleStyles = 'text-2xl font-bold text-gray-800 dark:text-white';

const serviceAreaBadgeStyles =
	'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-linear-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50';

const remoteBadgeStyles =
	'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border bg-white/5 dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/[0.06]';

const directionsButtonStyles =
	'inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5';

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
					<div className="flex items-center gap-4">
						<div className={iconContainerStyles}>
							<Globe className={iconStyles} />
						</div>
						<h2 className={sectionTitleStyles}>{t('itemDetail.LOCATION')}</h2>
					</div>
				</div>
				<div className="flex items-center gap-3">
					<span className={remoteBadgeStyles}>
						<Globe className="w-4 h-4" />
						{t('itemDetail.REMOTE_SERVICE')}
					</span>
					<p className="text-sm text-gray-500 dark:text-gray-400">
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
				<div className="flex items-center gap-4">
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

			<div className="space-y-4">
				{/* Mini Map */}
				{marker && (
					<div className="h-48 rounded-xl overflow-hidden">
						<Map
							markers={[marker]}
							center={marker.coordinates}
							zoom={14}
							height={192}
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
				<div className="space-y-1">
					{displayAddress && (
						<p className="font-medium text-gray-800 dark:text-gray-200">{displayAddress}</p>
					)}
					{locationLine && (
						<p className="text-gray-600 dark:text-gray-400">{locationLine}</p>
					)}
					{location.postal_code && (
						<p className="text-sm text-gray-500 dark:text-gray-400">{location.postal_code}</p>
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
						<Navigation className="w-4 h-4" />
						{t('itemDetail.GET_DIRECTIONS')}
					</a>
				)}
			</div>
		</div>
	);
}
