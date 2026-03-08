---
id: admin-dashboard-components
title: Admin Dashboard Components
sidebar_label: Admin Dashboard
sidebar_position: 44
---

# Admin Dashboard Components

The dashboard module provides geographic analytics widgets for the admin panel. These components visualise item location coverage, country/city distributions, and provide tools for managing the location search index.

## Component Hierarchy

```
dashboard/
  GeographicSection.tsx      # Orchestrator: layout, loading, error states
    LocationStatsCard.tsx     # Coverage stats, distributions, sync badge
    DistributionMap.tsx       # Interactive map with clustered markers
    IndexManagement.tsx       # Index rebuild and clear actions
```

`GeographicSection` is the top-level entry point. It fetches data via the `useGeoAnalytics` hook and distributes it to the three child components.

## GeographicSection

The layout orchestrator that handles the three main states: disabled (location features off), loading (skeleton), error (retry button), and the normal data view.

### Rendering Logic

```
if (!settings.enabled)  -->  Disabled placeholder
if (isLoading)          -->  Skeleton grid
if (isError)            -->  Error message + Retry button
if (!data)              -->  null (no render)
else                    -->  Two-column grid + IndexManagement
```

### Layout Structure

```tsx
<div className="space-y-6">
  <AdminResponsiveGrid cols={2}>
    <AdminErrorBoundary>
      <LocationStatsCard stats={data.stats} distributions={data.distributions} />
    </AdminErrorBoundary>
    <AdminErrorBoundary>
      <DistributionMap locations={data.locations} />
    </AdminErrorBoundary>
  </AdminResponsiveGrid>

  <AdminErrorBoundary>
    <IndexManagement
      lastRebuildAt={data.stats.lastRebuildAt}
      totalIndexed={data.stats.totalIndexed}
    />
  </AdminErrorBoundary>
</div>
```

Each child is wrapped in `AdminErrorBoundary` so a failure in one widget does not bring down the entire section.

### Data Source

```typescript
const { settings } = useLocationSettings();
const { data, isLoading, isError, error, refetch } = useGeoAnalytics();
```

The component checks `settings.enabled` first. If location features are globally disabled, it shows a centered placeholder with a map pin icon and a descriptive message.

## LocationStatsCard

A statistics card that displays location coverage metrics, distribution breakdowns, and index sync status.

### Props Interface

```typescript
interface LocationStatsCardProps {
  stats: GeoAnalyticsStats;
  distributions: {
    byCountry: CountryDistribution[];
    byCity: CityDistribution[];
    byServiceArea: ServiceAreaDistribution[];
  };
}
```

### Sections

#### Coverage Progress Bar

Shows the percentage of items that have location data. The bar uses `bg-theme-primary` for the fill and a smooth width transition (`transition-all duration-500`).

```
Items with location / Total items = Coverage %
```

#### Stat Grid

A 2x2 grid of key metrics:

| Metric | Icon | Colour |
|--------|------|--------|
| Total Indexed | MapPin | Blue |
| Cities | Building2 | Purple |
| Countries | Globe | Green |
| Remote Items | Wifi | Orange |

#### Service Area Breakdown

Displays counts per service area category (Local, Regional, National, Global) in a 2-column grid. Only rendered when `distributions.byServiceArea` has entries.

#### Top Countries

Shows the top 5 countries by item count. Only rendered when `distributions.byCountry` has entries.

#### Index Sync Badge

A header badge indicating whether the search index is synchronised with the actual data:
- **Synced** (green): CheckCircle icon, green badge.
- **Out of Sync** (yellow): AlertTriangle icon, yellow badge with a warning message showing expected vs actual counts.

## DistributionMap

An interactive map that plots item locations as markers with optional clustering.

### Props Interface

```typescript
interface DistributionMapProps {
  locations: GeoLocation[];
}
```

### Data Transformation

The component transforms `GeoLocation[]` into `MapMarkerData[]`, filtering out remote items (which have no coordinates):

```typescript
const markers: MapMarkerData[] = useMemo(() => {
  return locations
    .filter((loc) => !loc.isRemote)
    .map((loc) => ({
      id: loc.itemSlug,
      coordinates: { latitude: loc.latitude, longitude: loc.longitude },
      title: loc.city || loc.country || loc.itemSlug,
      slug: loc.itemSlug,
    }));
}, [locations]);
```

### Map Configuration

```tsx
<Map
  markers={markers}
  enableClustering
  height={320}
  controls={{ showZoomControls: true, showFullscreenControl: true }}
  ariaLabel={t('DISTRIBUTION_MAP')}
/>
```

The `Map` component from `@/components/maps/map` supports multiple providers (configured via `useMapProvider`).

### Empty and Disabled States

The component handles three non-data states:
1. **Location features disabled** -- Shows a "Location disabled" message.
2. **Map provider not configured** -- Shows a "Map not configured" message (no API keys).
3. **No locations** -- Shows a "No locations" placeholder.

Each state renders inside the same card layout with consistent styling.

## IndexManagement

An administrative tool for rebuilding and clearing the geographic search index.

### Props Interface

```typescript
interface IndexManagementProps {
  lastRebuildAt: string | null;
  totalIndexed: number;
}
```

### Actions

| Action | Button | Behaviour |
|--------|--------|-----------|
| Rebuild Index | `RefreshCw` icon, outline style | Calls `mutation.mutate('rebuild')` |
| Clear Index | `Trash2` icon, red outline style | Prompts `window.confirm`, then calls `mutation.mutate('clear')` |

Both actions use the `useLocationIndexAction` mutation hook. The rebuild button shows a spinning icon while pending.

### Metadata Display

Below the description, a metadata row shows:
- Last rebuild timestamp (formatted via `toLocaleString`) or "Never rebuilt"
- Total indexed count

### Status Messages

After an action completes, a success or error message appears in a styled banner:
- **Success** (green): Shows indexed/skipped counts and duration for rebuild, or cleared count for clear.
- **Error** (red): Generic "Action failed" message.

### Usage Example

```tsx
import { GeographicSection } from '@/components/admin/dashboard/GeographicSection';

function AdminDashboard() {
  return (
    <div className="space-y-8">
      <h2>Geographic Analytics</h2>
      <GeographicSection />
    </div>
  );
}
```

## State Management Patterns

All dashboard components follow a read-only pattern:
- Data is fetched once by `GeographicSection` via `useGeoAnalytics` and passed down as props.
- `IndexManagement` is the only component that triggers mutations (rebuild/clear), and it manages its own local message state.
- No prop drilling beyond one level; the hierarchy is intentionally shallow.

## Internationalisation

All components use the `admin.DASHBOARD.GEO` namespace:

```typescript
const t = useTranslations('admin.DASHBOARD.GEO');
```

Keys include `DISTRIBUTION_MAP`, `LOCATION_DISABLED`, `MAP_NOT_CONFIGURED`, `NO_LOCATIONS`, `LOCATION_COVERAGE`, `INDEX_SYNCED`, `INDEX_OUT_OF_SYNC`, `INDEX_MANAGEMENT`, `REBUILD_INDEX`, `CLEAR_INDEX`, `REBUILD_SUCCESS`, `CLEAR_SUCCESS`, `ACTION_FAILED`, and distribution labels.

## Accessibility Features

- Map component receives an `ariaLabel` prop for screen reader identification.
- Stat items use semantic icon + label + value layout readable by assistive technology.
- Coverage progress bar communicates percentage via adjacent text (not just the visual bar).
- Index management buttons are disabled during mutations to prevent double-clicks.
- Sync badge uses colour plus icon plus text (not colour alone) to communicate status.
- All decorative icons use appropriate sizing and are paired with text labels.

## UI Library Dependencies

| Library | Components Used |
|---------|----------------|
| `lucide-react` | MapPin, Globe, Building2, Wifi, CheckCircle, AlertTriangle, RefreshCw, Trash2, Database, Clock |
| `@/components/ui/button` | Button |
| `@/components/maps/map` | Map (provider-agnostic) |
| `@/components/admin/admin-responsive` | AdminResponsiveGrid |
| `@/components/admin/admin-error-boundary` | AdminErrorBoundary |

## Related Hooks and APIs

| Hook / API | Purpose |
|------------|---------|
| `useGeoAnalytics` | Fetches stats, distributions, and locations from `/api/admin/geo-analytics` |
| `useLocationIndexAction` | Mutation for rebuild/clear via `/api/admin/geo-index` |
| `useLocationSettings` | Reads location feature flag from settings |
| `useMapProvider` | Checks if a map provider API key is configured |
| `GeoAnalyticsStats` | Stats type (totalItems, itemsWithLocation, coveragePercent, etc.) |
| `CountryDistribution` | `{ name: string; count: number }` |
| `CityDistribution` | `{ name: string; count: number }` |
| `ServiceAreaDistribution` | `{ area: string; count: number }` |
| `GeoLocation` | Per-item location data (lat, lng, city, country, isRemote, etc.) |
| `MapMarkerData` | Map-ready marker format |

## Design Decisions

1. **Conditional rendering by feature flag** -- The entire section gracefully degrades when `locationSettings.enabled` is false, avoiding errors from missing data.
2. **Error boundaries per widget** -- Each child component is independently error-contained so a map API failure does not hide the stats card.
3. **Index management as separate card** -- Rebuild/clear are admin-only operations placed below the analytics grid to separate read-only views from write actions.
4. **Provider-agnostic map** -- The `Map` component abstracts the map provider, so switching from one mapping service to another does not affect dashboard code.

## File Reference

| File | Path |
|------|------|
| GeographicSection | `template/components/admin/dashboard/GeographicSection.tsx` |
| LocationStatsCard | `template/components/admin/dashboard/LocationStatsCard.tsx` |
| DistributionMap | `template/components/admin/dashboard/DistributionMap.tsx` |
| IndexManagement | `template/components/admin/dashboard/IndexManagement.tsx` |
