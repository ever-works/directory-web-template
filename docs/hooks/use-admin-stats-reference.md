---
id: use-admin-stats-reference
title: useAdminStats Hook Reference
sidebar_label: useAdminStats
sidebar_position: 55
---

# useAdminStats

## Overview

`useAdminStats` is a React hook that fetches comprehensive platform-wide statistics for the admin dashboard. Unlike other admin hooks that use `serverClient`, this hook uses the native `fetch` API directly with a custom `HttpError` class for HTTP-status-aware retry logic. It provides a single read-only query with no mutations.

**Source:** `template/hooks/use-admin-stats.ts`

## Signature / Parameters

```typescript
function useAdminStats(): UseQueryResult<AdminStats>
```

This hook takes no parameters. It returns a standard TanStack React Query `UseQueryResult<AdminStats>` object.

## Return Values

The hook returns a standard TanStack `useQuery` result. The primary data shape is `AdminStats`:

### `AdminStats`

```typescript
interface AdminStats {
  // Platform Overview
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;

  // User Activity
  totalViews: number;
  totalVotes: number;
  totalComments: number;

  // Newsletter
  totalSubscribers: number;
  recentSubscribers: number;

  // Trends (chart-ready data)
  userGrowthData: { month: string; users: number; active: number }[];
  submissionStatusData: { status: string; count: number; color: string }[];
  activityTrendData: { day: string; views: number; votes: number; comments: number }[];
  topItemsData: { name: string; views: number; votes: number }[];

  // Recent Activity
  recentActivity: {
    type: 'user_signup' | 'submission' | 'comment' | 'vote';
    description: string;
    timestamp: string;
    user?: string;
  }[];
}
```

### Standard `useQuery` properties

| Property      | Type                 | Description                                        |
|--------------|----------------------|----------------------------------------------------|
| `data`       | `AdminStats \| undefined` | The stats data when loaded                    |
| `isLoading`  | `boolean`            | `true` on initial load                             |
| `isFetching` | `boolean`            | `true` when fetching including background refetch  |
| `isError`    | `boolean`            | `true` if the query encountered an error           |
| `error`      | `Error \| null`      | The error object if the query failed               |
| `refetch`    | `() => void`         | Manually re-execute the query                      |

## Implementation Details

- **Direct fetch:** Uses the native `fetch` API instead of `serverClient`, with `credentials: 'include'` and `Accept: 'application/json'` headers.
- **Custom HttpError:** Defines an `HttpError` class with a `status` property for HTTP status code awareness.
- **Smart retry:** Retries up to 3 times, but only for server errors (status >= 500). Client errors (4xx) are not retried. Retry delay uses exponential backoff: `Math.min(1000 * 2^attempt, 30000)`.
- **Abort signal:** Passes the query's `signal` to `fetch` for automatic request cancellation on component unmount.
- **Query caching:** 5-minute `staleTime` with no automatic refetch interval (data is refetched only on window focus or explicit `refetch` calls).
- **API endpoint:** `GET /api/admin/dashboard/stats`
- **Response validation:** Checks both HTTP response status (`response.ok`) and the JSON body's `success` field before returning data.

### Query Key

```typescript
queryKey: ["admin-stats"]
```

### `HttpError` class

```typescript
class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
```

## Usage Examples

### Admin dashboard overview

```tsx
import { useAdminStats } from '@/hooks/use-admin-stats';

function AdminDashboard() {
  const { data: stats, isLoading, isError, error } = useAdminStats();

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <ErrorDisplay message={error?.message} />;
  if (!stats) return null;

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="New Today" value={stats.newUsersToday} />
        <StatCard label="Pending Items" value={stats.pendingSubmissions} />
        <StatCard label="Total Views" value={stats.totalViews} />
      </div>

      {/* Charts */}
      <UserGrowthChart data={stats.userGrowthData} />
      <SubmissionStatusChart data={stats.submissionStatusData} />
      <ActivityTrendChart data={stats.activityTrendData} />

      {/* Top items */}
      <TopItemsTable data={stats.topItemsData} />

      {/* Recent activity feed */}
      <ActivityFeed items={stats.recentActivity} />
    </div>
  );
}
```

### Accessing specific stat sections

```tsx
const { data: stats } = useAdminStats();

// Newsletter section
const subscriberCount = stats?.totalSubscribers ?? 0;
const recentSubs = stats?.recentSubscribers ?? 0;

// Submission breakdown
const pending = stats?.pendingSubmissions ?? 0;
const approved = stats?.approvedSubmissions ?? 0;
const rejected = stats?.rejectedSubmissions ?? 0;
```

### Manual refresh

```tsx
const { refetch, isFetching } = useAdminStats();

return (
  <Button onClick={() => refetch()} disabled={isFetching}>
    {isFetching ? 'Refreshing...' : 'Refresh Stats'}
  </Button>
);
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Item management with its own item-specific stats.
- [`useAdminUsers`](./use-admin-users-reference.md) -- User management with user-specific stats.
- [`useAdminClients`](./use-admin-clients-reference.md) -- Client management with client growth metrics.
- [`useAdminReports`](./use-admin-reports-reference.md) -- Report management with report-specific stats.
