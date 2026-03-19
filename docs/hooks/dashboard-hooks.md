---
id: dashboard-hooks
title: Dashboard & Analytics Hooks
sidebar_label: Dashboard & Analytics Hooks
sidebar_position: 11
---

# Dashboard & Analytics Hooks

Hooks for fetching user dashboard statistics, geographic analytics data, and application version information.

## useDashboardStats

Fetches comprehensive user dashboard statistics including submissions, views, engagement, and chart data from the client dashboard API.

```
useDashboardStats(): UseQueryResult<UserStats>
```

### UserStats Shape

| Field | Type | Description |
|-------|------|-------------|
| `totalSubmissions` | `number` | Total items submitted by the user |
| `totalViews` | `number` | Total views across all user items |
| `totalVotesReceived` | `number` | Total votes received |
| `totalCommentsReceived` | `number` | Total comments received |
| `viewsAvailable` | `boolean` | Whether view tracking is enabled |
| `recentActivity` | `object` | `{ newSubmissions, newViews }` for recent period |
| `uniqueItemsInteracted` | `number` | Items the user has interacted with |
| `totalActivity` | `number` | Overall activity count |

### Chart Data Fields

| Field | Type | Description |
|-------|------|-------------|
| `activityChartData` | `ActivityData[]` | Daily activity (submissions, views, engagement) |
| `engagementChartData` | `{ name, value, color }[]` | Engagement breakdown for pie/donut charts |
| `submissionTimeline` | `SubmissionTimelineData[]` | Monthly submission counts |
| `engagementOverview` | `EngagementOverviewData[]` | Weekly votes and comments |
| `statusBreakdown` | `StatusBreakdownData[]` | Approved/Pending/Rejected distribution |
| `topItems` | `TopItem[]` | Best performing items (views, votes, comments) |
| `periodComparison` | `PeriodComparisonDataExport` | Current vs previous period metrics |
| `categoryPerformance` | `CategoryPerformanceDataExport[]` | Performance by category |
| `approvalTrend` | `ApprovalTrendDataExport[]` | Approval rates over time |
| `submissionCalendar` | `SubmissionCalendarDataExport[]` | Calendar heatmap data |
| `engagementDistribution` | `EngagementDistributionData[]` | Engagement distribution data |

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['dashboard-stats']` |
| Stale time | 5 minutes |
| Endpoint | `GET /api/client/dashboard/stats` |

```tsx
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div>
      <StatCard title="Submissions" value={stats.totalSubmissions} />
      <StatCard title="Views" value={stats.totalViews} />
      <StatCard title="Votes" value={stats.totalVotesReceived} />
      <ActivityChart data={stats.activityChartData} />
      <StatusPieChart data={stats.statusBreakdown} />
    </div>
  );
}
```

---

## useGeoAnalytics

Fetches geographic analytics data for the admin dashboard, including location distributions, heatmap data, and index health statistics.

```
useGeoAnalytics(): UseQueryResult<GeoAnalyticsData>
```

### GeoAnalyticsData Shape

| Field | Type | Description |
|-------|------|-------------|
| `stats` | `GeoAnalyticsStats` | Aggregate location statistics |
| `distributions` | `object` | Distribution breakdowns |
| `locations` | `GeoLocation[]` | Individual item locations |
| `heatmapData` | `HeatmapPoint[]` | Points for map heatmap rendering |

### GeoAnalyticsStats

| Field | Type | Description |
|-------|------|-------------|
| `totalIndexed` | `number` | Total items in the location index |
| `totalItems` | `number` | Total items in the system |
| `itemsWithLocation` | `number` | Items that have location data |
| `itemsRemote` | `number` | Items marked as remote |
| `coveragePercent` | `number` | Percentage of items with location |
| `citiesCount` | `number` | Number of unique cities |
| `countriesCount` | `number` | Number of unique countries |
| `indexHealth` | `IndexHealth` | Sync status between index and items |
| `lastIndexedAt` | `string \| null` | Last index update timestamp |
| `lastRebuildAt` | `string \| null` | Last full rebuild timestamp |

### Distributions

| Field | Type | Description |
|-------|------|-------------|
| `distributions.byCountry` | `CountryDistribution[]` | `{ name, count }` per country |
| `distributions.byCity` | `CityDistribution[]` | `{ name, count }` per city |
| `distributions.byServiceArea` | `ServiceAreaDistribution[]` | `{ area, count }` per service area |

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['admin-geo-analytics']` |
| Stale time | 5 minutes |
| Retry | Up to 3 times; skips client errors (status below 500) |
| Endpoint | `GET /api/admin/geo-analytics` |

```tsx
import { useGeoAnalytics } from '@/hooks/use-geo-analytics';

function GeoAnalyticsDashboard() {
  const { data, isLoading } = useGeoAnalytics();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <StatCard title="Coverage" value={`${data.stats.coveragePercent}%`} />
      <StatCard title="Countries" value={data.stats.countriesCount} />
      <StatCard title="Cities" value={data.stats.citiesCount} />
      <HeatMap data={data.heatmapData} />
      <CountryChart data={data.distributions.byCountry} />
    </div>
  );
}
```

### useLocationIndexAction

Mutation hook for rebuilding or clearing the location index. Automatically invalidates `useGeoAnalytics` on success.

```
useLocationIndexAction(): UseMutationResult<Result, Error, 'rebuild' | 'clear'>
```

| Action | Result Type | Description |
|--------|-------------|-------------|
| `'rebuild'` | `RebuildIndexResult` | `{ totalProcessed, indexed, skipped, failed, errors, durationMs }` |
| `'clear'` | `ClearIndexResult` | `{ cleared }` |

```tsx
const indexAction = useLocationIndexAction();

<button onClick={() => indexAction.mutate('rebuild')}>
  Rebuild Index
</button>
```

---

## useVersionInfo

Fetches application version information with auto-refresh, retry logic, and cache management.

```
useVersionInfo(options?: UseVersionInfoOptions): UseVersionInfoReturn
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `refreshInterval` | `number` | `300000` (5min) | Auto-refresh interval in ms; `0` to disable |
| `retryOnError` | `boolean` | `true` | Whether to retry on failures |
| `enabled` | `boolean` | `true` | Whether to enable the query |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `versionInfo` | `VersionInfo \| null` | Version data (commit, date, author, etc.) |
| `isLoading` | `boolean` | Initial loading state |
| `isError` | `boolean` | Whether an error occurred |
| `error` | `UseVersionInfoError \| null` | Error details with optional status code |
| `refetch` | `() => Promise<any>` | Manual refresh |
| `isStale` | `boolean` | Whether the cached data is stale |
| `dataUpdatedAt` | `number` | Timestamp of last successful fetch |
| `invalidateVersionInfo` | `() => Promise<void>` | Force cache invalidation |

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['version-info']` |
| Stale time | 5 minutes |
| GC time | 30 minutes |
| Retry | Up to 2 times; skips 4xx errors |
| Endpoint | `GET /api/version` |

### Related: useVersionInfoUtils

Cache utility hook for managing version info across the application:

| Function | Description |
|----------|-------------|
| `prefetchVersionInfo()` | Pre-populate the cache |
| `invalidateVersionInfo()` | Force re-fetch |
| `getVersionInfoFromCache()` | Read from cache without query |
| `setVersionInfoInCache(data)` | Manually set cache data |

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionBadge() {
  const { versionInfo, isLoading } = useVersionInfo({
    refreshInterval: 10 * 60 * 1000, // 10 minutes
  });

  if (isLoading || !versionInfo) return null;

  return (
    <span title={`${versionInfo.author} - ${versionInfo.date}`}>
      {versionInfo.commit.substring(0, 7)}
    </span>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useDashboardStats` | User dashboard statistics and charts | `use-dashboard-stats.ts` |
| `useGeoAnalytics` | Geographic analytics for admin | `use-geo-analytics.ts` |
| `useLocationIndexAction` | Rebuild/clear location index | `use-geo-analytics.ts` |
| `useVersionInfo` | Application version with auto-refresh | `use-version-info.ts` |
| `useVersionInfoUtils` | Version cache management utilities | `use-version-info.ts` |
