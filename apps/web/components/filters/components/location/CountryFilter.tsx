'use client';

import { useQuery } from '@tanstack/react-query';
import { Select, SelectItem } from '@/components/ui/select';
import { useFilters } from '@/components/filters/context/filter-context';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';

interface CountriesResponse {
	success: boolean;
	data: string[];
}

async function fetchCountries(): Promise<string[]> {
	const response = await fetch('/api/location/countries');
	if (!response.ok) throw new Error('Failed to fetch countries');
	const result = (await response.json()) as CountriesResponse;
	return result.data ?? [];
}

export function CountryFilter() {
	const { locationFilter, setLocationCountry } = useFilters();
	const { settings } = useLocationSettings();
	const t = useTranslations('listing');

	const { data: countries = [], isLoading } = useQuery({
		queryKey: ['location-countries'],
		queryFn: fetchCountries,
		enabled: settings.enabled,
		staleTime: 10 * 60 * 1000,
	});

	if (!settings.enabled || (!isLoading && countries.length === 0)) {
		return null;
	}

	return (
		<Select
			label={t('COUNTRY')}
			placeholder={t('ALL_COUNTRIES')}
			size="sm"
			selectedKeys={locationFilter.country ? [locationFilter.country] : []}
			onSelectionChange={(keys) => {
				const country = keys[0] ?? null;
				setLocationCountry(country);
			}}
			className="w-40"
		>
			{countries.map((country) => (
				<SelectItem key={country} value={country}>
					{country}
				</SelectItem>
			))}
		</Select>
	);
}
