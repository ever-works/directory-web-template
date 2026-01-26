'use client';

import { useQuery } from '@tanstack/react-query';
import { Select, SelectItem } from '@/components/ui/select';
import { useFilters } from '@/components/filters/context/filter-context';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';

interface CitiesResponse {
	success: boolean;
	data: string[];
}

async function fetchCities(): Promise<string[]> {
	const response = await fetch('/api/location/cities');
	if (!response.ok) throw new Error('Failed to fetch cities');
	const result = (await response.json()) as CitiesResponse;
	return result.data ?? [];
}

export function CityFilter() {
	const { locationFilter, setLocationCity } = useFilters();
	const { settings } = useLocationSettings();
	const t = useTranslations('listing');

	const { data: cities = [], isLoading } = useQuery({
		queryKey: ['location-cities'],
		queryFn: fetchCities,
		enabled: settings.enabled,
		staleTime: 10 * 60 * 1000,
	});

	if (!settings.enabled || (!isLoading && cities.length === 0)) {
		return null;
	}

	return (
		<Select
			label={t('CITY')}
			placeholder={t('ALL_CITIES')}
			size="sm"
			selectedKeys={locationFilter.city ? [locationFilter.city] : []}
			onSelectionChange={(keys) => {
				const city = keys[0] ?? null;
				setLocationCity(city);
			}}
			className="w-40"
		>
			{cities.map((city) => (
				<SelectItem key={city} value={city}>
					{city}
				</SelectItem>
			))}
		</Select>
	);
}
