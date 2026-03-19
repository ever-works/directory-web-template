---
id: use-admin-clients-reference
title: useAdminClients Hook Reference
sidebar_label: useAdminClients
sidebar_position: 51
---

# useAdminClients

## Overview

`useAdminClients` is a React hook for managing client profiles in the admin panel. It provides paginated client listing with rich filtering (by status, plan, account type, provider, and date ranges), CRUD mutations, and aggregated client statistics including growth metrics. The file also exports companion hooks: `useClient` for single-client fetching, `useClientMutations` for mutation-only usage, and `useClientStats` for stats-only access.

**Source:** `template/hooks/use-admin-clients.ts`

## Signature / Parameters

### `useAdminClients`

```typescript
function useAdminClients(options?: UseAdminClientsOptions): UseAdminClientsReturn
```

#### `UseAdminClientsOptions`

| Property  | Type                      | Default | Description                                    |
|----------|---------------------------|---------|------------------------------------------------|
| `params` | `ClientDashboardOptions`  | `{}`    | Filtering, pagination, sorting, and date params |
| `enabled`| `boolean`                 | `true`  | Whether to enable the query                    |

#### `ClientDashboardOptions`

| Parameter       | Type     | Description                                |
|----------------|----------|--------------------------------------------|
| `page`         | `number` | Current page number                        |
| `limit`        | `number` | Items per page                             |
| `search`       | `string` | Search term for name/email matching        |
| `status`       | `string` | Filter by client status                    |
| `plan`         | `string` | Filter by subscription plan                |
| `accountType`  | `string` | Filter by account type                     |
| `provider`     | `string` | Filter by auth provider                    |
| `createdAfter` | `string` | ISO date string -- created after this date |
| `createdBefore`| `string` | ISO date string -- created before this date|
| `updatedAfter` | `string` | ISO date string -- updated after this date |
| `updatedBefore`| `string` | ISO date string -- updated before this date|
| `sortBy`       | `string` | Field to sort by                           |
| `sortOrder`    | `string` | `'asc'` or `'desc'`                       |

## Return Values

### `UseAdminClientsReturn`

#### Data

| Property     | Type                      | Description                                 |
|-------------|---------------------------|---------------------------------------------|
| `clients`   | `ClientProfileWithAuth[]` | Array of client profiles for the current page|
| `stats`     | `ClientStats`             | Aggregated client statistics                |
| `total`     | `number`                  | Total clients matching filters              |
| `page`      | `number`                  | Current page                                |
| `totalPages`| `number`                  | Total pages                                 |
| `limit`     | `number`                  | Items per page                              |

#### `ClientStats` structure

```typescript
interface ClientStats {
  overview: { total: number; active: number; inactive: number; suspended: number; trial: number };
  byProvider: Record<string, number>;
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
  byStatus: Record<string, number>;
  activity: { newThisWeek: number; newThisMonth: number; activeThisWeek: number; activeThisMonth: number };
  growth: { weeklyGrowth: number; monthlyGrowth: number };
}
```

#### Loading States

| Property       | Type      | Description                           |
|---------------|-----------|---------------------------------------|
| `isLoading`   | `boolean` | `true` on initial load                |
| `isSubmitting` | `boolean` | `true` when any mutation is pending   |

#### Actions

| Method          | Signature                                                         | Description                    |
|----------------|-------------------------------------------------------------------|--------------------------------|
| `createClient` | `(data: CreateClientRequest) => Promise<boolean>`                 | Create a new client profile    |
| `updateClient` | `(id: string, data: UpdateClientRequest) => Promise<boolean>`     | Update an existing client      |
| `deleteClient` | `(id: string) => Promise<boolean>`                                | Delete a client                |

#### Utility

| Method        | Signature    | Description                                        |
|--------------|--------------|----------------------------------------------------|
| `refetch`    | `() => void` | Re-execute the dashboard query                     |
| `refreshData`| `() => void` | Invalidate all client queries to force fresh data  |

## Companion Hooks

### `useClient`

Fetches a single client by ID.

```typescript
function useClient(options: UseClientOptions): UseClientReturn
```

| Option    | Type      | Description                    |
|----------|-----------|--------------------------------|
| `id`     | `string`  | Client ID to fetch             |
| `enabled`| `boolean` | Whether to run the query       |

Returns: `{ client: ClientProfileWithAuth | null, isLoading: boolean, error: Error | null, refetch: () => void }`

### `useClientMutations`

Provides create/update/delete mutations without fetching data. Useful for modal forms.

```typescript
function useClientMutations(): UseClientMutationsReturn
```

Returns: `{ createClient, updateClient, deleteClient, isSubmitting }`

### `useClientStats`

Fetches only the stats portion of the dashboard data (uses `limit: 1` to minimize payload).

```typescript
function useClientStats(options?: UseClientStatsOptions): UseClientStatsReturn
```

Returns: `{ stats: ClientStats, isLoading: boolean, error: Error | null, refetch: () => void }`

## Implementation Details

- **Query caching:** 5-minute `staleTime`, 10-minute `gcTime`, 3 retries on failure.
- **Placeholder data:** `keepPreviousData` is used for smooth pagination transitions.
- **Cache invalidation:** All mutations invalidate the entire `['admin', 'clients']` query key family via `queryClient.invalidateQueries`.
- **Toast notifications:** Success and error toasts from `sonner` are triggered automatically on mutation completion.
- **URL encoding:** Client IDs are URI-encoded in API calls via `encodeURIComponent` for safe handling of special characters.

### Query Keys

```typescript
const QUERY_KEYS = {
  clients: ['admin', 'clients'],
  clientsDashboard: (params) => ['admin', 'clients', 'dashboard', params],
  client: (id) => ['admin', 'clients', 'detail', id],
  clientsStats: () => ['admin', 'clients', 'stats'],
};
```

## Usage Examples

### Client dashboard with filtering

```tsx
import { useAdminClients } from '@/hooks/use-admin-clients';

function ClientsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const {
    clients,
    stats,
    total,
    totalPages,
    isLoading,
  } = useAdminClients({
    params: {
      page,
      limit: 25,
      status: statusFilter || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
  });

  return (
    <div>
      <ClientStatsCards stats={stats} />
      <ClientTable clients={clients} />
      <Pagination current={page} total={totalPages} onChange={setPage} />
    </div>
  );
}
```

### Fetching a single client

```tsx
import { useClient } from '@/hooks/use-admin-clients';

function ClientDetail({ clientId }: { clientId: string }) {
  const { client, isLoading, error } = useClient({ id: clientId });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <ClientProfile client={client} />;
}
```

### Mutation-only usage in a modal

```tsx
import { useClientMutations } from '@/hooks/use-admin-clients';

function CreateClientModal({ onClose }: { onClose: () => void }) {
  const { createClient, isSubmitting } = useClientMutations();

  const handleSubmit = async (formData: CreateClientRequest) => {
    const success = await createClient(formData);
    if (success) onClose();
  };

  return <ClientForm onSubmit={handleSubmit} isLoading={isSubmitting} />;
}
```

## Related Hooks

- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management with debounced search.
- [`useAdminCompanies`](./use-admin-companies-reference.md) -- Company management, often associated with client profiles.
- [`useAdminUsers`](./use-admin-users-reference.md) -- User management for admin-created accounts.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide dashboard statistics.
