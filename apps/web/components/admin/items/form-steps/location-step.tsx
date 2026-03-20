"use client";

import { useState, useEffect, useCallback } from 'react';
import { StepContainer } from '@/components/ui/multi-step-form';
import { LocationPicker } from '@/components/maps/location-picker';
import { useLocationSettings } from '@/hooks/use-location-settings';
import { useTranslations } from 'next-intl';
import { MapPin, Wifi } from 'lucide-react';
import type { LocationPickerValue } from '@/lib/maps/types';
import type { MapProvider } from '@/lib/types/location';

export interface LocationStepData {
	address?: string;
	city?: string;
	state?: string;
	country?: string;
	postal_code?: string;
	latitude?: number;
	longitude?: number;
	service_area?: string;
	is_remote?: boolean;
	geocoded_by?: MapProvider;
}

interface LocationStepProps {
	data: LocationStepData;
	onChange: (data: LocationStepData) => void;
	onValidationChange: (isValid: boolean) => void;
}

/**
 * Convert LocationStepData (snake_case) to LocationPickerValue (camelCase)
 */
function toPickerValue(data: LocationStepData): LocationPickerValue {
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
 * Convert LocationPickerValue (camelCase) to LocationStepData (snake_case)
 */
function fromPickerValue(value: LocationPickerValue, existing: LocationStepData): LocationStepData {
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

export function LocationStep({
	data,
	onChange,
	onValidationChange,
}: LocationStepProps) {
	const t = useTranslations('admin.ITEM_FORM');
	const { settings } = useLocationSettings();
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

	const validateData = useCallback((): Record<string, string> => {
		const newErrors: Record<string, string> = {};

		// If location is required and item is not remote, latitude/longitude must be set
		if (settings.requireLocationOnSubmit && !data.is_remote) {
			if (data.latitude === undefined || data.longitude === undefined) {
				newErrors.location = t('STEPS.LOCATION.REQUIRED_ERROR');
			}
		}

		return newErrors;
	}, [data, settings.requireLocationOnSubmit, t]);

	// Validate on data change
	useEffect(() => {
		const allErrors = validateData();

		// Only show errors for touched fields
		const visibleErrors: Record<string, string> = {};
		Object.keys(allErrors).forEach(field => {
			if (touchedFields.has(field)) {
				visibleErrors[field] = allErrors[field];
			}
		});

		setErrors(visibleErrors);
		onValidationChange(Object.keys(allErrors).length === 0);
	}, [data, touchedFields, onValidationChange, validateData]);

	const handlePickerChange = useCallback((pickerValue: LocationPickerValue) => {
		const newData = fromPickerValue(pickerValue, data);
		onChange(newData);
		setTouchedFields(prev => new Set(prev).add('location'));
	}, [data, onChange]);

	const pickerValue = toPickerValue(data);
	const hasLocation = data.is_remote || (data.latitude !== undefined && data.longitude !== undefined);

	return (
		<StepContainer
			title={t('STEPS.LOCATION.TITLE')}
			description={t('STEPS.LOCATION.DESCRIPTION')}
		>
			<div className="space-y-6">
				{/* Location Picker */}
				<LocationPicker
					value={pickerValue}
					onChange={handlePickerChange}
					showMap={!data.is_remote}
					showServiceArea={true}
					showRemoteOption={true}
					mapHeight={300}
					errors={errors.location ? { address: errors.location } : undefined}
				/>

				{/* Location Summary */}
				{hasLocation && (
					<div className="bg-gray-50 dark:bg-white/5 rounded-lg p-4 space-y-2">
						<h4 className="font-medium flex items-center text-gray-900 dark:text-gray-100 text-sm">
							<MapPin className="w-4 h-4 mr-2" />
							{t('STEPS.LOCATION.SUMMARY_TITLE')}
						</h4>
						{data.is_remote ? (
							<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
								<Wifi className="w-4 h-4" />
								<span>{t('STEPS.LOCATION.SUMMARY_REMOTE')}</span>
							</div>
						) : (
							<div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
								{data.address && (
									<p>
										<span className="font-medium">{t('STEPS.LOCATION.SUMMARY_ADDRESS')}:</span>{' '}
										{data.address}
									</p>
								)}
								{(data.city || data.state || data.country) && (
									<p>
										<span className="font-medium">{t('STEPS.LOCATION.SUMMARY_LOCATION')}:</span>{' '}
										{[data.city, data.state, data.country].filter(Boolean).join(', ')}
									</p>
								)}
								{data.latitude !== undefined && data.longitude !== undefined && (
									<p>
										<span className="font-medium">{t('STEPS.LOCATION.SUMMARY_COORDINATES')}:</span>{' '}
										{data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}
									</p>
								)}
								{data.service_area && (
									<p>
										<span className="font-medium">{t('STEPS.LOCATION.SUMMARY_SERVICE_AREA')}:</span>{' '}
										{t(`STEPS.LOCATION.SERVICE_AREA_OPTIONS.${data.service_area.toUpperCase()}`)}
									</p>
								)}
							</div>
						)}
					</div>
				)}
			</div>
		</StepContainer>
	);
}
