import { configManager } from '@/lib/config-manager';

/**
 * Server-side utility to check if categories are enabled
 * @returns boolean - true if categories are enabled, false otherwise
 */
export function getCategoriesEnabled(): boolean {
	const categoriesEnabled = configManager.getNestedValue('settings.categories_enabled');

	// Default to true if not set (backward compatibility)
	return categoriesEnabled ?? true;
}

/**
 * Server-side utility to check if tags are enabled
 * @returns boolean - true if tags are enabled, false otherwise
 */
export function getTagsEnabled(): boolean {
	const tagsEnabled = configManager.getNestedValue('settings.tags_enabled');

	// Default to true if not set (backward compatibility)
	return tagsEnabled ?? true;
}

/**
 * Server-side utility to check if companies are enabled
 * @returns boolean - true if companies are enabled, false otherwise
 */
export function getCompaniesEnabled(): boolean {
	const companiesEnabled = configManager.getNestedValue('settings.companies_enabled');

	// Default to true if not set (backward compatibility)
	return companiesEnabled ?? true;
}

/**
 * Server-side utility to check if surveys are enabled
 * @returns boolean - true if surveys are enabled, false otherwise
 */
export function getSurveysEnabled(): boolean {
	const surveysEnabled = configManager.getNestedValue('settings.surveys_enabled');

	// Default to true if not set (backward compatibility)
	return surveysEnabled ?? true;
}

/**
 * Server-side utility to check if header submit button is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderSubmitEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.submit_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if header pricing menu is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderPricingEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.pricing_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if header layout switcher is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderLayoutEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.layout_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if header language selector is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderLanguageEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.language_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if header theme toggle is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderThemeEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.theme_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if header more menu is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderMoreEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.more_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if header settings button is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getHeaderSettingsEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.settings_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if the dedicated Map nav link is enabled.
 * Off by default so existing forks see no UI change after upgrade.
 *
 * The Map link is also implicitly hidden when location features
 * (`settings.location.enabled`) are disabled — see the Header component.
 *
 * @returns boolean - true if the Map link should appear in the header
 */
export function getHeaderMapEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.header.map_enabled');
	return enabled ?? false;
}

/**
 * Server-side utility to get the default layout
 * @returns string - 'home1' or 'home2'
 */
export function getHeaderLayoutDefault(): string {
	const layoutDefault = configManager.getNestedValue('settings.header.layout_default');
	return layoutDefault ?? 'home1';
}

/**
 * Server-side utility to get the default pagination type
 * @returns string - 'standard' or 'infinite'
 */
export function getHeaderPaginationDefault(): string {
	const paginationDefault = configManager.getNestedValue('settings.header.pagination_default');
	return paginationDefault ?? 'standard';
}

/**
 * Server-side utility to get the default theme
 * @returns string - 'light' or 'dark'
 */
export function getHeaderThemeDefault(): string {
	const themeDefault = configManager.getNestedValue('settings.header.theme_default');
	return themeDefault ?? 'light';
}

// ===================== Homepage Hero Text Settings =====================

/**
 * Server-side utility to get the custom hero badge text
 * @returns string | undefined - custom badge text, or undefined to use translation fallback
 */
export function getHeroBadgeText(): string | undefined {
	return configManager.getNestedValue('settings.homepage.hero_badge_text') || undefined;
}

/**
 * Server-side utility to get the custom hero title
 * @returns string | undefined - custom title, or undefined to use translation fallback
 */
export function getHeroTitle(): string | undefined {
	return configManager.getNestedValue('settings.homepage.hero_title') || undefined;
}

/**
 * Server-side utility to get the custom hero title gradient text
 * @returns string | undefined - custom gradient text, or undefined to use translation fallback
 */
export function getHeroTitleGradient(): string | undefined {
	return configManager.getNestedValue('settings.homepage.hero_title_gradient') || undefined;
}

/**
 * Server-side utility to get the custom hero description
 * @returns string | undefined - custom description, or undefined to use translation fallback
 */
export function getHeroDescription(): string | undefined {
	return configManager.getNestedValue('settings.homepage.hero_description') || undefined;
}

// ===================== Footer Settings =====================

/**
 * Server-side utility to check if footer newsletter subscription is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getFooterSubscribeEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.footer.subscribe_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if footer version display is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getFooterVersionEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.footer.version_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if footer theme selector is enabled
 * @returns boolean - true if enabled, false otherwise
 */
export function getFooterThemeSelectorEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.footer.theme_selector_enabled');
	return enabled ?? true;
}

// ===================== Sponsor Ads Settings =====================

/**
 * Server-side utility to check if sponsor ads are enabled
 * @returns boolean - true if sponsor ads are enabled, false otherwise
 */
export function getSponsorAdsEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.monetization.sponsor_ads.enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to get the weekly sponsor ad price
 * @returns number - weekly price (default: 100)
 */
export function getSponsorAdWeeklyPrice(): number {
	const price = configManager.getNestedValue('settings.monetization.sponsor_ads.weekly_price');
	return price ?? 100;
}

/**
 * Server-side utility to get the monthly sponsor ad price
 * @returns number - monthly price (default: 300)
 */
export function getSponsorAdMonthlyPrice(): number {
	const price = configManager.getNestedValue('settings.monetization.sponsor_ads.monthly_price');
	return price ?? 300;
}

/**
 * Server-side utility to get the sponsor ad currency
 * @returns string - currency code (default: 'USD')
 */
export function getSponsorAdCurrency(): string {
	const currency = configManager.getNestedValue('settings.monetization.sponsor_ads.currency');
	return currency ?? 'USD';
}

/**
 * Server-side utility to get all sponsor ad pricing configuration
 * @returns object - { enabled, weeklyPrice, monthlyPrice, currency }
 */
export function getSponsorAdPricingConfig(): {
	enabled: boolean;
	weeklyPrice: number;
	monthlyPrice: number;
	currency: string;
} {
	return {
		enabled: getSponsorAdsEnabled(),
		weeklyPrice: getSponsorAdWeeklyPrice(),
		monthlyPrice: getSponsorAdMonthlyPrice(),
		currency: getSponsorAdCurrency(),
	};
}

// ===================== Export Settings =====================

/**
 * Server-side utility to check if public item export is enabled
 * @returns boolean - true if public export is enabled, false otherwise
 */
export function getExportEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.export_enabled');
	return enabled ?? false;
}

// ===================== Location Settings =====================

/**
 * Server-side utility to check if location features are enabled
 * @returns boolean - true if location features are enabled, false otherwise
 */
export function getLocationEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.location.enabled');
	return enabled ?? false;
}

/**
 * Server-side utility to get the configured map provider
 * @returns 'mapbox' | 'google' - the configured map provider
 */
export function getLocationProvider(): 'mapbox' | 'google' {
	const provider = configManager.getNestedValue('settings.location.provider');
	return provider ?? 'mapbox';
}

/**
 * Server-side utility to get the map style
 * @returns 'streets' | 'satellite' - the configured map style
 */
export function getLocationMapStyle(): 'streets' | 'satellite' {
	const style = configManager.getNestedValue('settings.location.map_style');
	return style ?? 'streets';
}

/**
 * Server-side utility to check if distance filter ("Near Me") is enabled
 * @returns boolean - true if distance filter is enabled
 */
export function getDistanceFilterEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.location.distance_filter_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to check if distance sorting is enabled
 * @returns boolean - true if distance sorting is enabled
 */
export function getDistanceSortEnabled(): boolean {
	const enabled = configManager.getNestedValue('settings.location.distance_sort_enabled');
	return enabled ?? true;
}

/**
 * Server-side utility to get the default search radius in kilometers
 * @returns number - default radius in km (default: 50)
 */
export function getDefaultRadiusKm(): number {
	const radius = configManager.getNestedValue('settings.location.default_radius_km');
	return radius ?? 50;
}

/**
 * Server-side utility to check if exact addresses should be shown
 * @returns boolean - true to show exact address, false for city only
 */
export function getShowExactAddress(): boolean {
	const show = configManager.getNestedValue('settings.location.show_exact_address');
	return show ?? false;
}

/**
 * Server-side utility to check if location is required on submission
 * @returns boolean - true if location is required when submitting items
 */
export function getRequireLocationOnSubmit(): boolean {
	const required = configManager.getNestedValue('settings.location.require_location_on_submit');
	return required ?? false;
}

/**
 * Server-side utility to get all location settings
 * @returns object - complete location settings configuration
 */
export function getLocationSettings(): {
	enabled: boolean;
	provider: 'mapbox' | 'google';
	map_style: 'streets' | 'satellite';
	distance_filter_enabled: boolean;
	distance_sort_enabled: boolean;
	default_radius_km: number;
	show_exact_address: boolean;
	require_location_on_submit: boolean;
} {
	return {
		enabled: getLocationEnabled(),
		provider: getLocationProvider(),
		map_style: getLocationMapStyle(),
		distance_filter_enabled: getDistanceFilterEnabled(),
		distance_sort_enabled: getDistanceSortEnabled(),
		default_radius_km: getDefaultRadiusKm(),
		show_exact_address: getShowExactAddress(),
		require_location_on_submit: getRequireLocationOnSubmit(),
	};
}

// ===================== Analytics Settings =====================

/**
 * Server-side utility to get analytics settings from config.yml
 * @returns any - the analytics configuration object
 */
export function getAnalyticsSettings(): any {
	return configManager.getNestedValue('settings.analytics') || {};
}
