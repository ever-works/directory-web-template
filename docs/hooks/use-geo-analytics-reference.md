---
id: use-geo-analytics-reference
title: useGeoAnalytics Hook Reference
sidebar_label: useGeoAnalytics
sidebar_position: 77
---

# useGeoAnalytics

## Overview

The `use-geo-analytics.ts` module exports two hooks for managing geographic analytics in the admin dashboard. `useGeoAnalytics` fetches comprehensive location data including statistics, distributions, map coordinates, and heatmap points. `useLocationIndexAction` provides mutations for rebuilding or clearing the location search index. Both hooks follow the same error-handling patterns used by `useAdminStats`.

**Source:** `template/hooks/use-geo-analytics.ts`

## Exported Hooks

| Hook                    | Purpose                                                  |
|-------------------------|----------------------------------------------------------|
| `useGeoAnalytics`       | Query hook for fetching geographic analytics data        |
| `useLocationIndexAction`| Mutation hook for rebuilding or clearing the location index |

---

## useGeoAnalytics

Fetches geographic analytics data for the admin dashboard.

```typescript
function useGeoAnalytics(): UseQueryResult<GeoAnalyticsData>
```

This hook takes no parameters.

### `GeoAnalyticsData`

```typescript
interface GeoAnalyticsData {
  stats: GeoAnalyticsStats;
  distributions: {
    byCountry: CountryDistribution[];
    byCity: CityDistribution[];
    byServiceArea: ServiceAreaDistribution[];
  };
  locations: GeoLocation[];
  heatmapData: HeatmapPoint[];
}
```

### `GeoAnalyticsStats`

```typescript
interface GeoAnalyticsStats {
  totalIndexed: number;
  totalItems: number;
  itemsWithLocation: number;
  itemsRemote: number;
  coveragePercent: number;
  indexHealth: IndexHealth;
  citiesCount: number;
  countriesCount: number;
  remoteCount: number;
  lastIndexedAt: string | null;
  lastRebuildAt: string | null;
}

interface IndexHealth {
  synced: boolean;
  indexCount: number;
  expectedCount: number;
}
```

### Distribution Types

```typescript
interface CountryDistribution {
  name: string;
  count: number;
}

interface CityDistribution {
  name: string;
  count: number;
}

interface ServiceAreaDistribution {
  area: string;
  count: number;
}
```

### Location Types

```typescript
interface GeoLocation {
  itemSlug: string;
  latitude: number;
  longitude: number;
  city: string | null;
  country: string | null;
  isRemote: boolean;
}

interface HeatmapPoint {
  lat: number;
  lng: number;
}
```

---

## useLocationIndexAction

Mutation hook for triggering location index actions (rebuild or clear).

```typescript
function useLocationIndexAction(): UseMutationResult<
  RebuildIndexResult | ClearIndexResult,
  Error,
  'rebuild' | 'clear'
>
```

The mutation function accepts a single string argument: `'rebuild'` or `'clear'`.

### `RebuildIndexResult`

```typescript
interface RebuildIndexResult {
  totalProcessed: number;
  indexed: number;
  skipped: number;
  failed: number;
  errors: Array<{ slug: string; error: string }>;
  durationMs: number;
}
```

### `ClearIndexResult`

```typescript
interface ClearIndexResult {
  cleared: number;
}
```

On success, the mutation automatically invalidates the `['admin-geo-analytics']` query, triggering a refetch of the geo analytics data.

## Implementation Details

### useGeoAnalytics

- **Query caching:** Uses a 5-minute `staleTime` to mirror the `useAdminStats` pattern.
- **Retry logic:** Custom retry function that retries up to 3 times for server errors (status >= 500) but does not retry client errors (status < 500). Retry delay uses exponential backoff capped at 30 seconds.
- **Abort support:** Passes the React Query `signal` to `fetch` for automatic request cancellation on component unmount.
- **Custom error class:** Uses an `HttpError` class that includes the HTTP status code, enabling the smart retry logic.
- **Fetch method:** Uses the native `fetch` API with `credentials: 'include'` for cookie-based authentication.

### useLocationIndexAction

- **Cache invalidation:** On success, invalidates the `['admin-geo-analytics']` query so the dashboard reflects the updated index state.
- **Request method:** Sends a `POST` request with `{ action: 'rebuild' | 'clear' }` in the JSON body.
- **Error handling:** Throws `HttpError` for HTTP failures and standard `Error` for API-level failures.

### Query Keys

```typescript
// useGeoAnalytics
queryKey: ['admin-geo-analytics']
```

### API Endpoints

| Operation       | Method | Endpoint                       |
|-----------------|--------|--------------------------------|
| Fetch analytics | `GET`  | `/api/admin/geo-analytics`     |
| Index action    | `POST` | `/api/admin/location-index`    |

## Usage Examples

### Displaying geo analytics on a dashboard

```tsx
import { useGeoAnalytics } from '@/hooks/use-geo-analytics';

function GeoAnalyticsDashboard() {
  const { data, isLoading, isError, error } = useGeoAnalytics();

  if (isLoading) return <Spinner />;
  if (isError) return <ErrorMessage message={error.message} />;

  const { stats, distributions, locations, heatmapData } = data;

  return (
    <div>
      {/* Coverage stats */}
      <StatsGrid>
        <StatCard label="Total Indexed" value={stats.totalIndexed} />
        <StatCard label="Coverage" value={`${stats.coveragePercent}%`} />
        <StatCard label="Countries" value={stats.countriesCount} />
        <StatCard label="Cities" value={stats.citiesCount} />
        <StatCard label="Remote" value={stats.remoteCount} />
      </StatsGrid>

      {/* Index health indicator */}
      <IndexHealthBadge synced={stats.indexHealth.synced} />

      {/* Distribution charts */}
      <BarChart title="By Country" data={distributions.byCountry} />
      <BarChart title="By City" data={distributions.byCity} />

      {/* Map visualization */}
      <HeatMap points={heatmapData} />
      <MarkerMap locations={locations} />
    </div>
  );
}
```

### Rebuilding the location index

```tsx
import { useLocationIndexAction } from '@/hooks/use-geo-analytics';

function IndexManagement() {
  const indexAction = useLocationIndexAction();

  const handleRebuild = async () => {
    try {
      const result = await indexAction.mutateAsync('rebuild');
      if ('indexed' in result) {
        console.log(
          `Rebuilt index: ${result.indexed} indexed, ` +
          `${result.skipped} skipped, ${result.failed} failed ` +
          `in ${result.durationMs}ms`
        );
      }
    } catch (error) {
      console.error('Rebuild failed:', error);
    }
  };

  const handleClear = async () => {
    try {
      const result = await indexAction.mutateAsync('clear');
      if ('cleared' in result) {
        console.log(`Cleared ${result.cleared} index entries`);
      }
    } catch (error) {
      console.error('Clear failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleRebuild} disabled={indexAction.isPending}>
        {indexAction.isPending ? 'Processing...' : 'Rebuild Index'}
      </button>
      <button onClick={handleClear} disabled={indexAction.isPending}>
        Clear Index
      </button>
    </div>
  );
}
```

### Checking index health

```tsx
const { data } = useGeoAnalytics();

if (data && !data.stats.indexHealth.synced) {
  console.warn(
    `Index out of sync: ${data.stats.indexHealth.indexCount} indexed ` +
    `vs ${data.stats.indexHealth.expectedCount} expected`
  );
}
```

## Related Hooks

- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide admin statistics; shares the same error-handling pattern.
- [`useAnalytics`](./use-analytics-reference.md) -- General analytics data for the admin panel.
- [`useMapCoordinates`](./use-map-coordinates-reference.md) -- Client-facing map coordinate management.
- [`useUserLocation`](./use-user-location-reference.md) -- Client-side user geolocation detection.
