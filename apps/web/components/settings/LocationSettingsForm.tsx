'use client';

import { useState, useCallback } from 'react';
import { MapPin, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocationPicker } from '@/components/maps/location-picker';
import { useUserLocation } from '@/hooks/use-user-location';
import { useLocationSettings } from '@/hooks/use-location-settings';
import type { LocationPickerValue } from '@/lib/maps/types';
import type { LocationPrivacy } from '@/lib/validations/user-location';

const PRIVACY_OPTIONS: Array<{ value: LocationPrivacy; labelKey: string; descriptionKey: string }> = [
	{ value: 'private', labelKey: 'PRIVACY_PRIVATE', descriptionKey: 'PRIVACY_PRIVATE_DESC' },
	{ value: 'city', labelKey: 'PRIVACY_CITY', descriptionKey: 'PRIVACY_CITY_DESC' },
	{ value: 'exact', labelKey: 'PRIVACY_EXACT', descriptionKey: 'PRIVACY_EXACT_DESC' },
];

const SELECT_CLASS = cn(
	'w-full h-12 px-4 text-base rounded-lg outline-hidden',
	'bg-white dark:bg-white/[0.05]',
	'border-2 border-gray-200 dark:border-white/[0.06]',
	'focus:ring-2 focus:ring-theme-primary-500 focus:border-theme-primary-500 dark:focus:border-theme-primary-400',
	'text-gray-900 dark:text-white',
);

/**
 * Form for managing user default location and privacy settings.
 * Only renders when location features are enabled in site settings.
 */
export function LocationSettingsForm() {
	const t = useTranslations('settings.LOCATION_SETTINGS');
	const { settings } = useLocationSettings();
	const { profileLocation, saveProfileLocation, clearProfileLocation, isSaving, isLoading } = useUserLocation();

	const [pickerValue, setPickerValue] = useState<LocationPickerValue | undefined>(() => {
		if (profileLocation?.defaultLatitude != null && profileLocation?.defaultLongitude != null) {
			return {
				latitude: profileLocation.defaultLatitude,
				longitude: profileLocation.defaultLongitude,
				city: profileLocation.defaultCity ?? undefined,
				country: profileLocation.defaultCountry ?? undefined,
			};
		}
		return undefined;
	});

	const [privacy, setPrivacy] = useState<LocationPrivacy>(profileLocation?.locationPrivacy ?? 'private');

	// Sync when profile data loads for the first time
	const [hasInitialized, setHasInitialized] = useState(false);
	if (!hasInitialized && profileLocation && !isLoading) {
		if (profileLocation.defaultLatitude != null && profileLocation.defaultLongitude != null) {
			setPickerValue({
				latitude: profileLocation.defaultLatitude,
				longitude: profileLocation.defaultLongitude,
				city: profileLocation.defaultCity ?? undefined,
				country: profileLocation.defaultCountry ?? undefined,
			});
		}
		setPrivacy(profileLocation.locationPrivacy ?? 'private');
		setHasInitialized(true);
	}

	const handlePickerChange = useCallback((value: LocationPickerValue) => {
		setPickerValue(value);
	}, []);

	const handleSave = async () => {
		try {
			await saveProfileLocation({
				defaultLatitude: pickerValue?.latitude ?? null,
				defaultLongitude: pickerValue?.longitude ?? null,
				defaultCity: pickerValue?.city ?? null,
				defaultCountry: pickerValue?.country ?? null,
				locationPrivacy: privacy,
			});
			toast.success(t('SAVED'));
		} catch {
			toast.error(t('SAVE_ERROR'));
		}
	};

	const handleClear = async () => {
		try {
			await clearProfileLocation();
			setPickerValue(undefined);
			toast.success(t('CLEARED'));
		} catch {
			toast.error(t('SAVE_ERROR'));
		}
	};

	if (!settings.enabled) {
		return null;
	}

	const hasLocation = pickerValue?.latitude != null && pickerValue?.longitude != null;

	return (
		<Card className="border border-gray-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#141414]/95 backdrop-blur-sm shadow-lg max-w-3xl mx-auto">
			<CardHeader className="pb-4 border-b border-gray-100 dark:border-white/[0.06]">
				<CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
					<MapPin className="w-5 h-5 text-theme-primary-500" />
					{t('DEFAULT_LOCATION')}
				</CardTitle>
				<p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
					{t('DEFAULT_LOCATION_HELP')}
				</p>
			</CardHeader>

			<CardContent className="space-y-6 pt-6">
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-6 h-6 animate-spin text-gray-400" />
					</div>
				) : (
					<>
						{/* Location Picker */}
						<LocationPicker
							value={pickerValue}
							onChange={handlePickerChange}
							showServiceArea={false}
							showRemoteOption={false}
							showMap={true}
							mapHeight={240}
						/>

						{/* Privacy Setting */}
						<div>
							<label
								htmlFor="location-privacy"
								className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
							>
								{t('PRIVACY')}
							</label>
							<select
								id="location-privacy"
								value={privacy}
								onChange={(e) => setPrivacy(e.target.value as LocationPrivacy)}
								className={SELECT_CLASS}
							>
								{PRIVACY_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{t(option.labelKey)} - {t(option.descriptionKey)}
									</option>
								))}
							</select>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
								{t('PRIVACY_HELP')}
							</p>
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3 pt-2">
							<Button
								onClick={handleSave}
								disabled={isSaving}
							>
								{isSaving ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin mr-2" />
										{t('SAVING')}
									</>
								) : (
									t('SAVE')
								)}
							</Button>

							{hasLocation && (
								<Button
									variant="destructive"
									onClick={handleClear}
									disabled={isSaving}
								>
									<Trash2 className="w-4 h-4 mr-2" />
									{t('CLEAR')}
								</Button>
							)}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
