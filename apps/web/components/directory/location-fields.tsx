'use client';

import React, { useCallback } from 'react';
import { LocationPicker } from '@/components/maps/location-picker';
import { useLocationSettings } from '@/hooks/use-location-settings';
import type { LocationPickerValue } from '@/lib/maps/types';
import type { ItemLocationData } from '@/lib/types/item';

interface LocationFieldsProps {
	location?: ItemLocationData;
	onLocationChange: (location: ItemLocationData | undefined) => void;
}

/**
 * Convert ItemLocationData (snake_case) to LocationPickerValue (camelCase)
 */
function toPickerValue(data?: ItemLocationData): LocationPickerValue | undefined {
	if (!data) return undefined;
	return {
		address: data.address,
		city: data.city,
		state: data.state,
		country: data.country,
		postalCode: data.postal_code,
		latitude: data.latitude,
		longitude: data.longitude,
		serviceArea: data.service_area as LocationPickerValue['serviceArea'],
		isRemote: data.is_remote,
	};
}

/**
 * Convert LocationPickerValue (camelCase) to ItemLocationData (snake_case)
 */
function fromPickerValue(value: LocationPickerValue, existing?: ItemLocationData): ItemLocationData {
	return {
		...existing,
		address: value.address,
		city: value.city,
		state: value.state,
		country: value.country,
		postal_code: value.postalCode,
		latitude: value.latitude,
		longitude: value.longitude,
		service_area: value.serviceArea,
		is_remote: value.isRemote,
	};
}

/**
 * Location fields for the client directory submission form.
 * Renders within the Basic Info step when location is enabled in settings.
 */
export function LocationFields({ location, onLocationChange }: LocationFieldsProps) {
	const { settings } = useLocationSettings();

	const handlePickerChange = useCallback(
		(pickerValue: LocationPickerValue) => {
			onLocationChange(fromPickerValue(pickerValue, location));
		},
		[onLocationChange, location]
	);

	if (!settings.enabled) {
		return null;
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2 mb-2">
				<h3 className="text-lg font-bold text-gray-900 dark:text-white">Location</h3>
				{!settings.requireLocationOnSubmit && (
					<span className="text-xs text-gray-500 dark:text-gray-400">(Optional)</span>
				)}
			</div>

			<LocationPicker
				value={toPickerValue(location)}
				onChange={handlePickerChange}
				showMap={!location?.is_remote}
				showServiceArea={true}
				showRemoteOption={true}
				mapHeight={200}
			/>

			{!settings.showExactAddress && location?.address && (
				<p className="text-xs text-gray-500 dark:text-gray-400">
					Your exact address won&apos;t be shown publicly, only the city.
				</p>
			)}
		</div>
	);
}
