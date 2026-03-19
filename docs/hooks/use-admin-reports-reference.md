---
id: use-admin-reports-reference
title: useAdminReports Hook Reference
sidebar_label: useAdminReports
sidebar_position: 54
---

# useAdminReports

## Overview

`useAdminReports` is a React hook for managing content reports in the admin panel. It provides paginated report listing with filtering by status, content type, and reason, along with report update capabilities and aggregated statistics. Unlike other admin hooks, this hook uses `useState` for tracking the currently-updating report ID and `useMemo` for stable query parameter references.

**Source:** `template/hooks/use-admin-reports.ts`

## Signature / Parameters

```typescript
function useAdminReports(options?: UseAdminReportsOptions): UseAdminReportsReturn
```

### `UseAdminReportsOptions`

| Parameter     | Type                        | Default     | Description                           |
|--------------|-----------------------------|-------------|---------------------------------------|
| `page`       | `number`                    | `1`         | Current page number                   |
| `limit`      | `number`                    | `10`        | Items per page                        |
| `search`     | `string`                    | `undefined` | Search term for filtering             |
| `status`     | `ReportStatusValues`        | `undefined` | Filter by report status               |
| `contentType`| `ReportContentTypeValues`   | `undefined` | Filter by reported content type       |
| `reason`     | `ReportReasonValues`        | `undefined` | Filter by report reason               |

The `ReportStatusValues`, `ReportContentTypeValues`, and `ReportReasonValues` types are imported from the database schema (`@/lib/db/schema`).

## Return Values

### Data

| Property       | Type                  | Description                            |
|---------------|-----------------------|----------------------------------------|
| `reports`     | `AdminReportItem[]`   | Array of report items for current page |
| `stats`       | `ReportStats \| null` | Aggregated report statistics           |

### `AdminReportItem`

```typescript
interface AdminReportItem {
  id: string;
  contentType: ReportContentTypeValues;
  contentId: string;
  reason: ReportReasonValues;
  details: string | null;
  status: ReportStatusValues;
  resolution: ReportResolutionValues | null;
  reportedBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  reporter: { id: string; name: string; email: string; avatar: string | null } | null;
  reviewer: { id: string; email: string | null } | null;
}
```

### `ReportStats`

```typescript
interface ReportStats {
  total: number;
  byStatus: Record<string, number>;
  byContentType: Record<string, number>;
  byReason: Record<string, number>;
  pendingCount: number;
  resolvedCount: number;
}
```

### Loading States

| Property         | Type              | Description                                             |
|-----------------|-------------------|---------------------------------------------------------|
| `isLoading`     | `boolean`         | `true` on initial load                                  |
| `isLoadingStats`| `boolean`         | `true` while stats are being fetched                    |
| `isFiltering`   | `boolean`         | `true` when loading and on the first page               |
| `isUpdating`    | `string \| null`  | ID of the report currently being updated, or `null`     |

### Pagination

| Property        | Type     | Description                         |
|----------------|----------|-------------------------------------|
| `totalPages`   | `number` | Total number of pages               |
| `totalReports` | `number` | Total number of reports             |

### Actions

| Method          | Signature                                                               | Description                              |
|----------------|-------------------------------------------------------------------------|------------------------------------------|
| `updateReport` | `(id: string, data: UpdateReportParams) => Promise<boolean>`            | Update a report's status/resolution      |
| `getReportById`| `(id: string) => Promise<AdminReportItem \| null>`                      | Fetch a single report by ID              |

### `UpdateReportParams`

```typescript
interface UpdateReportParams {
  status?: ReportStatusValues;
  resolution?: ReportResolutionValues;
  reviewNote?: string;
}
```

### Utility

| Method        | Signature    | Description                                   |
|--------------|--------------|-------------------------------------------------|
| `refetch`    | `() => void` | Re-execute the reports list query               |
| `refreshData`| `() => void` | Invalidate all report queries for fresh data    |

## Implementation Details

- **Query caching:** 5-minute `staleTime`, 10-minute `gcTime`, 5-minute `refetchInterval`, 3 retries on failure.
- **Separate stats query:** Stats are fetched from a dedicated `/api/admin/reports/stats` endpoint with its own query key and caching policy, independent of the list query.
- **Memoized params:** Query parameters are wrapped in `useMemo` to maintain stable references and prevent unnecessary re-renders.
- **Update tracking:** Uses `useState<string | null>` to track which specific report ID is currently being updated, providing per-row loading indicators.
- **Cache invalidation:** Mutations invalidate the entire `['admin-reports']` query key family, covering both list and stats queries.
- **Toast notifications:** `sonner` toasts fire on mutation success and error.
- **Error logging:** Errors are logged to the console in addition to being surfaced via toast.

### Query Keys

```typescript
const reportsQueryKeys = {
  all: ['admin-reports'],
  lists: () => ['admin-reports', 'list'],
  list: (params) => ['admin-reports', 'list', params],
  details: () => ['admin-reports', 'detail'],
  detail: (id) => ['admin-reports', 'detail', id],
  stats: () => ['admin-reports', 'stats'],
};
```

## Usage Examples

### Reports management page

```tsx
import { useAdminReports } from '@/hooks/use-admin-reports';

function ReportsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReportStatusValues | undefined>();

  const {
    reports,
    stats,
    totalPages,
    totalReports,
    isLoading,
    isUpdating,
    updateReport,
  } = useAdminReports({
    page,
    limit: 20,
    status: statusFilter,
  });

  return (
    <div>
      {stats && (
        <StatsBar pending={stats.pendingCount} resolved={stats.resolvedCount} />
      )}
      <ReportsTable
        reports={reports}
        isUpdating={isUpdating}
        onResolve={(id) => updateReport(id, {
          status: 'resolved',
          resolution: 'content_removed',
          reviewNote: 'Content violates guidelines',
        })}
      />
      <Pagination current={page} total={totalPages} onChange={setPage} />
    </div>
  );
}
```

### Filtering reports

```tsx
const { reports, isFiltering } = useAdminReports({
  page: 1,
  limit: 10,
  status: 'pending',
  contentType: 'item',
  reason: 'spam',
  search: 'offensive',
});
```

### Fetching a single report

```tsx
const { getReportById } = useAdminReports();

const handleViewDetails = async (reportId: string) => {
  const report = await getReportById(reportId);
  if (report) {
    openDetailModal(report);
  }
};
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Item management; reports often reference items as content.
- [`useAdminUsers`](./use-admin-users-reference.md) -- User management; reports have reporters and reviewers.
- [`useAdminNotifications`](./use-admin-notifications-reference.md) -- Notifications triggered by reported content.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management with debounced search.
