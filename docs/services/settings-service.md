---
id: settings-service
title: Settings Service
sidebar_label: Settings Service
sidebar_position: 11
---

# Settings Service

The template includes a settings service that manages application-wide configuration for themes, layout, pagination, and pricing. Settings are persisted via the `FileService` abstraction and accessed through a singleton instance.

## Overview

The `SettingsService` wraps a `FileService<Settings>` to provide typed access to application settings. It uses a single settings record identified by the fixed ID `"settings"`. On first access, if no settings exist, default values are automatically created and persisted.

```
lib/services/
  settings.service.ts    # Settings CRUD and defaults
  file.service.ts        # File-based storage abstraction (used internally)
```

## Settings Schema

```typescript
interface Settings {
  layoutHome: LayoutHome;
  theme: SettingsTheme;
  pagination: SettingsPagination;
  layoutKey: LayoutKey;
  pricing: PricingPlanConfig;
}
```

### Theme Configuration

The theme object controls the visual appearance of the application:

```typescript
interface SettingsTheme {
  type: 'everworks' | 'corporate' | 'material' | 'funny';
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
}
```

Default theme values:

| Property | Default Value |
|----------|---------------|
| `type` | `everworks` |
| `primary` | `#0070f3` |
| `secondary` | `#00c853` |
| `accent` | `#0056b3` |
| `background` | `#ffffff` |
| `surface` | `#f8f9fa` |
| `text` | `#1a1a1a` |
| `textSecondary` | `#6c757d` |

### Layout Options

Two layout enums control the display:

**LayoutKey** -- Controls the item listing layout:

| Value | Description |
|-------|-------------|
| `classic` | Traditional list view (default) |
| `grid` | Grid-based card layout |
| `cards` | Card-based layout |
| `masonry` | Masonry/Pinterest-style layout |

**LayoutHome** -- Controls the homepage variant:

| Value | Description |
|-------|-------------|
| `Home_One` | Default homepage layout |
| `Home_Two` | Alternative homepage layout |
| `Home_Three` | Third homepage variant |

### Pagination Configuration

```typescript
interface SettingsPagination {
  type: 'standard' | 'infinite';
  itemsPerPage: number;    // Default: 12, minimum: 1
}
```

### Pricing Configuration

The `pricing` field stores `PricingPlanConfig` from the content module, with defaults provided by `defaultPricingConfig`.

## Usage

### Reading Settings

```typescript
import { settingsService } from '@/lib/services/settings.service';

const settings = await settingsService.getSettings();
// Returns full Settings object with all defaults applied
```

On first call, if no settings record exists, defaults are created and persisted automatically.

### Updating Settings

Full settings replacement:

```typescript
await settingsService.updateSettings({
  layoutHome: LayoutHome.HOME_TWO,
  theme: { ...currentTheme, primary: '#ff6600' },
  pagination: { type: 'infinite', itemsPerPage: 20 },
  layoutKey: LayoutKey.GRID,
  pricing: customPricingConfig,
});
```

### Granular Updates

Individual sections can be updated independently:

```typescript
// Update theme only
await settingsService.updateSettingsTheme({
  type: 'corporate',
  primary: '#1a365d',
  secondary: '#2d3748',
  accent: '#3182ce',
  background: '#ffffff',
  surface: '#f7fafc',
  text: '#1a202c',
  textSecondary: '#718096',
});

// Update layout key
await settingsService.updateSettingsLayoutKey(LayoutKey.MASONRY);

// Update homepage layout
await settingsService.updateSettingsLayoutHome(LayoutHome.HOME_THREE);

// Update pagination (itemsPerPage is clamped to minimum 1)
await settingsService.updateSettingsPagination({
  type: 'infinite',
  itemsPerPage: 24,
});
```

### Deleting Settings

```typescript
const deleted = await settingsService.deleteSettings();
// true if deleted, false if not found
```

After deletion, the next `getSettings()` call will recreate defaults.

## Initialization Safety

All update methods call `ensureInitialized()` before writing. This method:

1. Checks if an initialization is already in progress (prevents concurrent init)
2. Calls `getSettings()` to create defaults if needed
3. Clears the initialization lock on completion (even on error)

This prevents race conditions when multiple requests attempt to update settings before the defaults have been persisted.

## Singleton Pattern

The `SettingsService` is instantiated as a singleton via `SettingsServiceSingleton`:

```typescript
import { settingsService } from '@/lib/services/settings.service';

// settingsService is the shared singleton instance
// Do not create new SettingsService() instances directly
```

## Pagination Safety

When updating pagination, `itemsPerPage` is clamped to a minimum of 1 using `Math.max(1, pagination.itemsPerPage)` to prevent invalid configurations.

## Source Files

| File | Path |
|------|------|
| Settings Service | `template/lib/services/settings.service.ts` |
| File Service | `template/lib/services/file.service.ts` |
