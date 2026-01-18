'use client';

import { createContext, useContext, useMemo, PropsWithChildren } from 'react';
import type { HeaderSettings, LocationConfigSettings } from '@/lib/content';
import {
	type LocationSettings,
	DEFAULT_LOCATION_SETTINGS,
	mapLocationConfigToRuntime
} from '@/lib/types/location';

const DEFAULT_HEADER_SETTINGS: HeaderSettings = {
	submitEnabled: true,
	pricingEnabled: true,
	layoutEnabled: true,
	languageEnabled: true,
	themeEnabled: true,
	moreEnabled: true,
	settingsEnabled: true,
	layoutDefault: 'home1',
	paginationDefault: 'standard',
	themeDefault: 'light'
};

interface SettingsContextValue {
	// Feature enabled flags (from config)
	categoriesEnabled: boolean;
	tagsEnabled: boolean;
	companiesEnabled: boolean;
	surveysEnabled: boolean;
	// Data existence flags (from database/content)
	hasCategories: boolean;
	hasTags: boolean;
	hasCollections: boolean;
	hasGlobalSurveys: boolean;
	// Header settings
	headerSettings: HeaderSettings;
	// Location settings (camelCase runtime type)
	locationSettings: LocationSettings;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps extends PropsWithChildren {
	categoriesEnabled: boolean;
	tagsEnabled: boolean;
	companiesEnabled: boolean;
	surveysEnabled: boolean;
	hasCategories: boolean;
	hasTags: boolean;
	hasCollections: boolean;
	hasGlobalSurveys: boolean;
	headerSettings: HeaderSettings;
	locationSettings?: LocationConfigSettings;
}

export function SettingsProvider({
	children,
	categoriesEnabled,
	tagsEnabled,
	companiesEnabled,
	surveysEnabled,
	hasCategories,
	hasTags,
	hasCollections,
	hasGlobalSurveys,
	headerSettings,
	locationSettings: locationConfigSettings
}: SettingsProviderProps) {
	// Map snake_case config to camelCase runtime settings
	const locationSettings = useMemo(
		() => mapLocationConfigToRuntime(locationConfigSettings),
		[locationConfigSettings]
	);

	return (
		<SettingsContext.Provider
			value={{
				categoriesEnabled,
				tagsEnabled,
				companiesEnabled,
				surveysEnabled,
				hasCategories,
				hasTags,
				hasCollections,
				hasGlobalSurveys,
				headerSettings,
				locationSettings
			}}
		>
			{children}
		</SettingsContext.Provider>
	);
}

export function useSettings(): SettingsContextValue {
	const context = useContext(SettingsContext);
	if (!context) {
		// Fallback for components rendered outside provider (backward compatibility)
		return {
			categoriesEnabled: true,
			tagsEnabled: true,
			companiesEnabled: true,
			surveysEnabled: true,
			hasCategories: true,
			hasTags: true,
			hasCollections: true,
			hasGlobalSurveys: false,
			headerSettings: DEFAULT_HEADER_SETTINGS,
			locationSettings: DEFAULT_LOCATION_SETTINGS
		};
	}
	return context;
}
