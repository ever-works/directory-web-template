'use client';

import { useState, useCallback, useEffect } from 'react';
import { MapPin, Trash2, Loader2, EyeOff, Building2, Target } from 'lucide-react';
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

const PRIVACY_OPTIONS: Array<{
	value: LocationPrivacy;
	labelKey: string;
	descriptionKey: string;
	icon: React.ElementType;
}> = [
	{ value: 'private', labelKey: 'PRIVACY_PRIVATE', descriptionKey: 'PRIVACY_PRIVATE_DESC', icon: EyeOff },
	{ value: 'city', labelKey: 'PRIVACY_CITY', descriptionKey: 'PRIVACY_CITY_DESC', icon: Building2 },
	{ value: 'exact', labelKey: 'PRIVACY_EXACT', descriptionKey: 'PRIVACY_EXACT_DESC', icon: Target },
];

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

	useEffect(() => {
		if (isLoading || !profileLocation) return;

		if (profileLocation.defaultLatitude != null && profileLocation.defaultLongitude != null) {
			setPickerValue({
				latitude: profileLocation.defaultLatitude,
				longitude: profileLocation.defaultLongitude,
				city: profileLocation.defaultCity ?? undefined,
				country: profileLocation.defaultCountry ?? undefined,
			});
		} else {
			setPickerValue(undefined);
		}

		setPrivacy(profileLocation.locationPrivacy ?? 'private');
	}, [profileLocation, isLoading]);

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
		<Card className="border border-gray-200 dark:border-white/6 bg-white/95 dark:bg-[#141414]/95 backdrop-blur-sm shadow-lg max-w-3xl mx-auto">
			<CardHeader className="pb-4 border-b border-gray-100 dark:border-white/6">
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

						{/* Privacy Setting — visual radio cards */}
						<div>
							<p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
								{t('PRIVACY')}
							</p>
							<div className="grid grid-cols-3 gap-2">
								{PRIVACY_OPTIONS.map((option) => {
									const Icon = option.icon;
									const isSelected = privacy === option.value;
									return (
										<button
											key={option.value}
											type="button"
											onClick={() => setPrivacy(option.value)}
											aria-pressed={isSelected}
											className={cn(
												'flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all duration-150',
												'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-primary-500 focus-visible:ring-offset-2',
												isSelected
													? 'border-theme-primary-500 bg-theme-primary-50 dark:bg-theme-primary-900/20'
													: 'border-gray-200 dark:border-white/8 bg-white dark:bg-white/[0.02] hover:border-theme-primary-200 dark:hover:border-theme-primary-700/50 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
											)}
										>
											<div
												className={cn(
													'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
													isSelected
														? 'bg-theme-primary-100 dark:bg-theme-primary-800/50'
														: 'bg-gray-100 dark:bg-white/8'
												)}
											>
												<Icon
													className={cn(
														'w-4 h-4',
														isSelected
															? 'text-theme-primary-600 dark:text-theme-primary-400'
															: 'text-gray-500 dark:text-gray-400'
													)}
												/>
											</div>
											<div>
												<p
													className={cn(
														'text-xs font-semibold leading-tight',
														isSelected
															? 'text-theme-primary-700 dark:text-theme-primary-300'
															: 'text-gray-700 dark:text-gray-300'
													)}
												>
													{t(option.labelKey)}
												</p>
												<p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
													{t(option.descriptionKey)}
												</p>
											</div>
										</button>
									);
								})}
							</div>
							<p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('PRIVACY_HELP')}</p>
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
