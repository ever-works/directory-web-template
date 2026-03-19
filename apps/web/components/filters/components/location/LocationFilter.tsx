'use client';

import { NearMeButton } from './NearMeButton';
import { RadiusSlider } from './RadiusSlider';
import { CityFilter } from './CityFilter';
import { CountryFilter } from './CountryFilter';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useFilters } from '@/components/filters/context/filter-context';

export function LocationFilter() {
	const { settings } = useLocationSettings();
	const { locationFilter } = useFilters();

	if (!settings.enabled) {
		return null;
	}

	const hasNearMe = !!locationFilter.nearMe;

	return (
		<div className="flex flex-wrap items-center gap-3">
			{settings.distanceFilterEnabled && (
				<>
					<NearMeButton />
					{hasNearMe && <RadiusSlider />}
				</>
			)}

			{!hasNearMe && (
				<>
					<CityFilter />
					<CountryFilter />
				</>
			)}
		</div>
	);
}
