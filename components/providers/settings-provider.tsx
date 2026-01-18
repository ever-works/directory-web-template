'use client';

import { createContext, useContext, PropsWithChildren } from 'react';
import type { HeaderSettings, LocationConfigSettings } from '@/lib/content';

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

const DEFAULT_LOCATION_SETTINGS: LocationConfigSettings = {
	enabled: false,
	provider: 'mapbox',
	map_style: 'streets',
	distance_filter_enabled: true,
	distance_sort_enabled: true,
	default_radius_km: 50,
	show_exact_address: false,
	require_location_on_submit: false
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
	// Location settings
	locationSettings: LocationConfigSettings;
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
	locationSettings = DEFAULT_LOCATION_SETTINGS
}: SettingsProviderProps) {
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
