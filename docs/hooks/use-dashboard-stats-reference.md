---
id: use-dashboard-stats-reference
title: useDashboardStats Hook Reference
sidebar_label: useDashboardStats
sidebar_position: 75
---

# useDashboardStats

## Overview

`useDashboardStats` is a React hook for fetching the authenticated user's dashboard statistics. It returns a comprehensive set of metrics including submission counts, engagement data, activity charts, status breakdowns, top items, and advanced analytics like period comparisons and category performance. This hook powers the client-facing user dashboard (not the admin dashboard).

**Source:** `template/hooks/use-dashboard-stats.ts`

## Signature / Parameters

```typescript
function useDashboardStats(): UseQueryResult<UserStats>
```

This hook takes no parameters. It returns a standard TanStack React Query result object with `data` typed as `UserStats`.

## Return Values

The hook returns a standard `UseQueryResult<UserStats>` from TanStack React Query. The most commonly used properties are:

| Property     | Type                    | Description                                  |
|--------------|------------------------|----------------------------------------------|
| `data`       | `UserStats \| undefined`| The dashboard stats object (see below)       |
| `isLoading`  | `boolean`              | `true` only on initial load                  |
| `isFetching` | `boolean`              | `true` when fetching, including background   |
| `isError`    | `boolean`              | `true` if the query errored                  |
| `error`      | `Error \| null`        | The error object, if any                     |
| `refetch`    | `() => void`           | Re-execute the stats query                   |

### `UserStats`

```typescript
interface UserStats {
  // Summary counts
  totalSubmissions: number;
  totalViews: number;
  totalVotesReceived: number;
  totalCommentsReceived: number;
  viewsAvailable: boolean;

  // Recent activity
  recentActivity: {
    newSubmissions: number;
    newViews: number;
  };

  // Aggregate metrics
  uniqueItemsInteracted: number;
  totalActivity: number;

  // Chart data
  activityChartData: ActivityData[];
  engagementChartData: { name: string; value: number; color: string }[];
  submissionTimeline: SubmissionTimelineData[];
  engagementOverview: EngagementOverviewData[];
  statusBreakdown: StatusBreakdownData[];
  topItems: TopItem[];

  // Advanced analytics
  periodComparison: PeriodComparisonDataExport;
  categoryPerformance: CategoryPerformanceDataExport[];
  approvalTrend: ApprovalTrendDataExport[];
  submissionCalendar: SubmissionCalendarDataExport[];
  engagementDistribution: EngagementDistributionData[];
}
```

### Chart Data Types

```typescript
interface ActivityData {
  date: string;
  submissions: number;
  views: number;
  engagement: number;
}

interface SubmissionTimelineData {
  month: string;
  submissions: number;
}

interface EngagementOverviewData {
  week: string;
  votes: number;
  comments: number;
}

interface StatusBreakdownData {
  status: 'Approved' | 'Pending' | 'Rejected';
  value: number;
  color: string;
}

interface TopItem {
  id: string;
  title: string;
  views: number;
  votes: number;
  comments: number;
}
```

The advanced analytics types (`PeriodComparisonDataExport`, `CategoryPerformanceDataExport`, `ApprovalTrendDataExport`, `SubmissionCalendarDataExport`, `EngagementDistributionData`) are re-exported from `@/lib/repositories/client-dashboard.repository`.

## Implementation Details

- **Query caching:** Uses a 5-minute `staleTime`. No explicit `gcTime` is set, so the default (5 minutes) applies.
- **Fetch method:** Uses the native `fetch` API directly (not `serverClient`) to call `/api/client/dashboard/stats`.
- **Authentication:** Relies on the session cookie for authentication. The API returns user-specific data for the currently authenticated user.
- **Response parsing:** The hook strips the `success` field from the API response and returns only the stats data.
- **Error handling:** Throws an `Error` if the HTTP response is not OK or if the response body contains `success: false`.

### Query Keys

```typescript
queryKey: ['dashboard-stats']
```

### API Endpoints

| Operation | Method | Endpoint                       |
|-----------|--------|--------------------------------|
| Fetch     | `GET`  | `/api/client/dashboard/stats`  |

## Usage Examples

### Full dashboard with charts

```tsx
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

function UserDashboard() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorMessage />;

  return (
    <div>
      {/* Summary cards */}
      <StatsGrid>
        <StatCard label="Submissions" value={stats.totalSubmissions} />
        <StatCard label="Views" value={stats.totalViews} />
        <StatCard label="Votes" value={stats.totalVotesReceived} />
        <StatCard label="Comments" value={stats.totalCommentsReceived} />
      </StatsGrid>

      {/* Charts */}
      <ActivityChart data={stats.activityChartData} />
      <SubmissionTimeline data={stats.submissionTimeline} />
      <StatusBreakdownPie data={stats.statusBreakdown} />

      {/* Top items table */}
      <TopItemsTable items={stats.topItems} />
    </div>
  );
}
```

### Using advanced analytics data

```tsx
const { data: stats } = useDashboardStats();

if (stats) {
  // Period comparison (e.g. this month vs last month)
  const { periodComparison } = stats;

  // Category performance breakdown
  const topCategories = stats.categoryPerformance
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Submission calendar for heatmap
  const calendarData = stats.submissionCalendar;

  // Approval trend over time
  const approvalTrend = stats.approvalTrend;
}
```

### Conditional view availability

```tsx
const { data: stats } = useDashboardStats();

return (
  <div>
    {stats?.viewsAvailable ? (
      <ViewsChart data={stats.activityChartData} />
    ) : (
      <p>View tracking is not enabled for this site.</p>
    )}
  </div>
);
```

## Related Hooks

- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide admin statistics (different scope).
- [`useAnalytics`](./use-analytics-reference.md) -- Detailed analytics data for admin users.
- [`useCurrentUser`](./use-current-user-reference.md) -- The authenticated user whose dashboard stats are being shown.
