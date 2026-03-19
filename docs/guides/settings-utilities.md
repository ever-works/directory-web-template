---
id: settings-utilities
title: Settings Utilities
sidebar_label: Settings Utilities
sidebar_position: 31
---

# Settings Utilities

This page documents the server-side settings helper functions in `lib/utils/settings.ts`. These utilities provide type-safe access to feature flags, UI configuration, monetization settings, location features, and homepage customization through the centralized config manager.

## Overview

The settings utilities act as an abstraction layer between application code and the configuration manager. Each function:

- Reads a specific nested configuration value via `configManager.getNestedValue()`
- Provides a sensible default when the value is not set
- Returns a strongly typed result

All functions are server-side only and should be called from Server Components, API routes, or server actions.

## Architecture

```
configManager.getNestedValue("settings.categories_enabled")
        |
        v
  getCategoriesEnabled() --> boolean (default: true)
```

The `configManager` reads settings from the Git-based CMS content repository. The settings utilities wrap these reads with defaults and type annotations.

## Feature Flags

These functions control which major features are visible in the application.

### Content Features

```ts
import { configManager } from "@/lib/config-manager";

export function getCategoriesEnabled(): boolean {
  const categoriesEnabled = configManager.getNestedValue(
    "settings.categories_enabled"
  );
  return categoriesEnabled ?? true;
}

export function getTagsEnabled(): boolean {
  const tagsEnabled = configManager.getNestedValue(
    "settings.tags_enabled"
  );
  return tagsEnabled ?? true;
}

export function getCompaniesEnabled(): boolean {
  const companiesEnabled = configManager.getNestedValue(
    "settings.companies_enabled"
  );
  return companiesEnabled ?? true;
}

export function getSurveysEnabled(): boolean {
  const surveysEnabled = configManager.getNestedValue(
    "settings.surveys_enabled"
  );
  return surveysEnabled ?? true;
}
```

| Function | Config Path | Default | Purpose |
|----------|------------|---------|---------|
| `getCategoriesEnabled()` | `settings.categories_enabled` | `true` | Show/hide category navigation and filtering |
| `getTagsEnabled()` | `settings.tags_enabled` | `true` | Show/hide tag-based filtering |
| `getCompaniesEnabled()` | `settings.companies_enabled` | `true` | Show/hide company pages |
| `getSurveysEnabled()` | `settings.surveys_enabled` | `true` | Show/hide the survey system |

## Header Settings

These functions control the visibility of UI elements in the site header.

```ts
export function getHeaderSubmitEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.submit_enabled"
  );
  return enabled ?? true;
}

export function getHeaderPricingEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.pricing_enabled"
  );
  return enabled ?? true;
}

export function getHeaderLayoutEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.layout_enabled"
  );
  return enabled ?? true;
}

export function getHeaderLanguageEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.language_enabled"
  );
  return enabled ?? true;
}

export function getHeaderThemeEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.theme_enabled"
  );
  return enabled ?? true;
}

export function getHeaderMoreEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.more_enabled"
  );
  return enabled ?? true;
}

export function getHeaderSettingsEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.header.settings_enabled"
  );
  return enabled ?? true;
}
```

| Function | Config Path | Default | Controls |
|----------|------------|---------|----------|
| `getHeaderSubmitEnabled()` | `settings.header.submit_enabled` | `true` | "Submit" button |
| `getHeaderPricingEnabled()` | `settings.header.pricing_enabled` | `true` | Pricing menu link |
| `getHeaderLayoutEnabled()` | `settings.header.layout_enabled` | `true` | Layout switcher toggle |
| `getHeaderLanguageEnabled()` | `settings.header.language_enabled` | `true` | Language selector dropdown |
| `getHeaderThemeEnabled()` | `settings.header.theme_enabled` | `true` | Dark/light theme toggle |
| `getHeaderMoreEnabled()` | `settings.header.more_enabled` | `true` | "More" overflow menu |
| `getHeaderSettingsEnabled()` | `settings.header.settings_enabled` | `true` | Settings gear button |

## Header Defaults

These functions return the default values for user-facing preferences.

```ts
export function getHeaderLayoutDefault(): string {
  const layoutDefault = configManager.getNestedValue(
    "settings.header.layout_default"
  );
  return layoutDefault ?? "home1";
}

export function getHeaderPaginationDefault(): string {
  const paginationDefault = configManager.getNestedValue(
    "settings.header.pagination_default"
  );
  return paginationDefault ?? "standard";
}

export function getHeaderThemeDefault(): string {
  const themeDefault = configManager.getNestedValue(
    "settings.header.theme_default"
  );
  return themeDefault ?? "light";
}
```

| Function | Config Path | Default | Values |
|----------|------------|---------|--------|
| `getHeaderLayoutDefault()` | `settings.header.layout_default` | `"home1"` | `"home1"` or `"home2"` |
| `getHeaderPaginationDefault()` | `settings.header.pagination_default` | `"standard"` | `"standard"` or `"infinite"` |
| `getHeaderThemeDefault()` | `settings.header.theme_default` | `"light"` | `"light"` or `"dark"` |

## Homepage Hero Customization

These functions allow overriding the hero section text. When they return `undefined`, the component falls back to i18n translation strings.

```ts
export function getHeroBadgeText(): string | undefined {
  return (
    configManager.getNestedValue(
      "settings.homepage.hero_badge_text"
    ) || undefined
  );
}

export function getHeroTitle(): string | undefined {
  return (
    configManager.getNestedValue(
      "settings.homepage.hero_title"
    ) || undefined
  );
}

export function getHeroTitleGradient(): string | undefined {
  return (
    configManager.getNestedValue(
      "settings.homepage.hero_title_gradient"
    ) || undefined
  );
}

export function getHeroDescription(): string | undefined {
  return (
    configManager.getNestedValue(
      "settings.homepage.hero_description"
    ) || undefined
  );
}
```

Usage in a Server Component:

```tsx
import { getHeroTitle, getHeroTitleGradient } from "@/lib/utils/settings";

export default function HeroSection() {
  const customTitle = getHeroTitle();
  const gradientText = getHeroTitleGradient();

  return (
    <h1>
      {customTitle || t("hero.title")}
      {gradientText && (
        <span className="gradient">{gradientText}</span>
      )}
    </h1>
  );
}
```

## Footer Settings

```ts
export function getFooterSubscribeEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.footer.subscribe_enabled"
  );
  return enabled ?? true;
}

export function getFooterVersionEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.footer.version_enabled"
  );
  return enabled ?? true;
}

export function getFooterThemeSelectorEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.footer.theme_selector_enabled"
  );
  return enabled ?? true;
}
```

| Function | Default | Purpose |
|----------|---------|---------|
| `getFooterSubscribeEnabled()` | `true` | Newsletter subscription form in footer |
| `getFooterVersionEnabled()` | `true` | Version number display |
| `getFooterThemeSelectorEnabled()` | `true` | Theme toggle in footer |

## Sponsor Ads Settings

These functions manage the monetization configuration for sponsored ad placements.

```ts
export function getSponsorAdsEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.monetization.sponsor_ads.enabled"
  );
  return enabled ?? true;
}

export function getSponsorAdWeeklyPrice(): number {
  const price = configManager.getNestedValue(
    "settings.monetization.sponsor_ads.weekly_price"
  );
  return price ?? 100;
}

export function getSponsorAdMonthlyPrice(): number {
  const price = configManager.getNestedValue(
    "settings.monetization.sponsor_ads.monthly_price"
  );
  return price ?? 300;
}

export function getSponsorAdCurrency(): string {
  const currency = configManager.getNestedValue(
    "settings.monetization.sponsor_ads.currency"
  );
  return currency ?? "USD";
}
```

A convenience function returns all pricing configuration at once:

```ts
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
```

## Location Settings

These functions control the geolocation and map features.

```ts
export function getLocationEnabled(): boolean {
  const enabled = configManager.getNestedValue(
    "settings.location.enabled"
  );
  return enabled ?? false; // Disabled by default
}

export function getLocationProvider(): "mapbox" | "google" {
  const provider = configManager.getNestedValue(
    "settings.location.provider"
  );
  return provider ?? "mapbox";
}

export function getLocationMapStyle(): "streets" | "satellite" {
  const style = configManager.getNestedValue(
    "settings.location.map_style"
  );
  return style ?? "streets";
}
```

The `getLocationSettings()` function returns all location configuration:

```ts
export function getLocationSettings(): {
  enabled: boolean;
  provider: "mapbox" | "google";
  map_style: "streets" | "satellite";
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
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `false` | Master toggle for location features |
| `provider` | `"mapbox"` | Map tile provider |
| `map_style` | `"streets"` | Map visual style |
| `distance_filter_enabled` | `true` | "Near Me" filter button |
| `distance_sort_enabled` | `true` | Sort results by distance |
| `default_radius_km` | `50` | Default search radius in kilometers |
| `show_exact_address` | `false` | Show full address vs city only |
| `require_location_on_submit` | `false` | Make location required on item submission |

## Default Value Strategy

All settings utilities follow the same pattern:

1. Read the value from the config manager
2. Apply the nullish coalescing operator (`??`) with a default
3. Return the typed result

The defaults are chosen for backward compatibility -- if a setting is not configured, the feature behaves as it did before the setting existed. Most features default to `true` (enabled), except location features which default to `false` (disabled) since they require additional API keys.

## Related Resources

- [Feature Configuration](/template/configuration/feature-config) -- High-level feature flag documentation
- [Config System](/template/configuration/config-system) -- How the config manager works
- [Map Configuration](/template/configuration/map-config) -- Detailed map provider setup
- [Sponsorship System](/template/guides/sponsorship-system) -- Sponsor ad placement guide
