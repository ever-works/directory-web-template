'use client';

import { useFilters } from '@/components/filters/context/filter-context';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';

const SLIDER_TRACK_CLASS = 'w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-theme-primary';

export function RadiusSlider() {
	const { locationFilter, setLocationRadius } = useFilters();
	const { settings } = useLocationSettings();
	const t = useTranslations('listing');

	const nearMe = locationFilter.nearMe;

	if (!settings.enabled || !settings.distanceFilterEnabled || !nearMe) {
		return null;
	}

	const percentage = ((nearMe.radius - 10) / (500 - 10)) * 100;

	return (
		<div className="flex items-center gap-3 min-w-[180px] max-w-[220px]">
			<div className="flex-1">
				<div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
					<span>{t('RADIUS')}</span>
					<span className="font-medium text-theme-primary">{nearMe.radius} km</span>
				</div>
				<input
					type="range"
					min={10}
					max={500}
					step={10}
					value={nearMe.radius}
					onChange={(e) => setLocationRadius(Number(e.target.value))}
					className={SLIDER_TRACK_CLASS}
					style={{
						background: `linear-gradient(to right, var(--color-primary, #3b82f6) 0%, var(--color-primary, #3b82f6) ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`,
					}}
					aria-label={t('RADIUS')}
				/>
			</div>
		</div>
	);
}
