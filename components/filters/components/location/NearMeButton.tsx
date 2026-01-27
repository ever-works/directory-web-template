'use client';

import { useState } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useFilters } from '@/components/filters/context/filter-context';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const BASE_BUTTON_CLASS = cn(
	'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full',
	'border transition-all duration-200 cursor-pointer',
	'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-theme-primary-500',
);

const ACTIVE_CLASS = cn(
	'bg-theme-primary-100 text-theme-primary-700 border-theme-primary-300',
	'dark:bg-theme-primary-900/30 dark:text-theme-primary-300 dark:border-theme-primary-700/50',
	'hover:bg-theme-primary-200 dark:hover:bg-theme-primary-900/50',
);

const INACTIVE_CLASS = cn(
	'bg-white text-gray-700 border-gray-300',
	'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
	'hover:bg-gray-50 dark:hover:bg-gray-700',
);

export function NearMeButton() {
	const { locationFilter, setNearMe } = useFilters();
	const { requestLocation, isLoading: isGeoLoading, error: geoError } = useGeolocation();
	const { settings } = useLocationSettings();
	const t = useTranslations('listing');
	const [isPending, setIsPending] = useState(false);

	const isActive = !!locationFilter.nearMe;

	if (!settings.enabled || !settings.distanceFilterEnabled) {
		return null;
	}

	const isLoading = isGeoLoading || isPending;

	const handleClick = async () => {
		if (isActive) {
			setNearMe(null);
			return;
		}

		setIsPending(true);
		const coords = await requestLocation();
		setIsPending(false);

		if (coords) {
			setNearMe({
				latitude: coords.latitude,
				longitude: coords.longitude,
				radius: settings.defaultRadiusKm,
			});
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			disabled={isLoading}
			className={cn(
				BASE_BUTTON_CLASS,
				isActive ? ACTIVE_CLASS : INACTIVE_CLASS,
				isLoading && 'opacity-70 cursor-wait',
			)}
			aria-label={t('NEAR_ME')}
			aria-pressed={isActive}
		>
			{isLoading ? (
				<Loader2 className="w-4 h-4 animate-spin" />
			) : (
				<MapPin className="w-4 h-4" />
			)}
			<span>{t('NEAR_ME')}</span>
			{isActive && !isLoading && (
				<X className="w-3 h-3 ml-0.5" />
			)}
			{geoError && !isActive && (
				<span className="sr-only">{t('LOCATION_ERROR')}</span>
			)}
		</button>
	);
}
