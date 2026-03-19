---
id: use-admin-companies-reference
title: useAdminCompanies Hook Reference
sidebar_label: useAdminCompanies
sidebar_position: 52
---

# useAdminCompanies

## Overview

`useAdminCompanies` is a React hook for managing company records in the admin panel. It provides paginated listing with search, status filtering, and sorting, along with full CRUD mutations and aggregate statistics (total, active, inactive). The file also exports a `useCompany` companion hook for fetching a single company by ID.

**Source:** `template/hooks/use-admin-companies.ts`

## Signature / Parameters

### `useAdminCompanies`

```typescript
function useAdminCompanies(options?: UseAdminCompaniesOptions): UseAdminCompaniesReturn
```

#### `UseAdminCompaniesOptions`

| Property  | Type                    | Default | Description                    |
|----------|-------------------------|---------|--------------------------------|
| `params` | `CompaniesListOptions`  | `{}`    | Filtering, pagination, sorting |
| `enabled`| `boolean`               | `true`  | Whether to enable the query    |

#### `CompaniesListOptions`

| Parameter   | Type                                    | Description                  |
|------------|------------------------------------------|------------------------------|
| `page`     | `number`                                 | Current page number          |
| `limit`    | `number`                                 | Items per page               |
| `search`   | `string`                                 | Search term                  |
| `status`   | `'active' \| 'inactive'`                 | Filter by company status     |
| `sortBy`   | `'name' \| 'createdAt' \| 'updatedAt'`   | Field to sort by             |
| `sortOrder`| `'asc' \| 'desc'`                        | Sort direction               |

## Return Values

### `UseAdminCompaniesReturn`

#### Data

| Property     | Type             | Description                              |
|-------------|------------------|------------------------------------------|
| `companies` | `Company[]`      | Array of companies for the current page  |
| `stats`     | `CompanyStats`   | Aggregate counts                         |
| `total`     | `number`         | Total companies matching filters         |
| `page`      | `number`         | Current page (defaults to `1`)           |
| `totalPages`| `number`         | Total pages (defaults to `1`)            |
| `limit`     | `number`         | Items per page (defaults to `10`)        |

#### `CompanyStats`

```typescript
interface CompanyStats {
  total: number;
  active: number;
  inactive: number;
}
```

#### Loading States

| Property       | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `isLoading`   | `boolean` | `true` on initial load               |
| `isSubmitting` | `boolean` | `true` when any mutation is pending  |

#### Actions

| Method            | Signature                                                          | Description              |
|------------------|--------------------------------------------------------------------|--------------------------|
| `createCompany`  | `(data: CreateCompanyRequest) => Promise<boolean>`                 | Create a new company     |
| `updateCompany`  | `(id: string, data: UpdateCompanyRequest) => Promise<boolean>`     | Update an existing company|
| `deleteCompany`  | `(id: string) => Promise<boolean>`                                 | Delete a company         |

#### Request Types

```typescript
interface CreateCompanyRequest {
  name: string;
  website?: string;
  domain?: string;
  slug?: string;
  status?: 'active' | 'inactive';
}

interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
  id: string;
}
```

#### Utility

| Method        | Signature    | Description                                    |
|--------------|--------------|-------------------------------------------------|
| `refetch`    | `() => void` | Re-execute the companies list query             |
| `refreshData`| `() => void` | Invalidate all company queries for fresh data   |

## Companion Hook: `useCompany`

Fetches a single company by ID.

```typescript
function useCompany(options: UseCompanyOptions): UseCompanyReturn
```

| Option    | Type      | Description                  |
|----------|-----------|------------------------------|
| `id`     | `string`  | Company ID to fetch          |
| `enabled`| `boolean` | Whether to run the query     |

Returns:

```typescript
{
  company: Company | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

## Implementation Details

- **Query caching:** 5-minute `staleTime`, 10-minute `gcTime`, 3 retries on failure.
- **Placeholder data:** `keepPreviousData` ensures smooth pagination transitions.
- **URL building:** Uses `apiUtils.buildUrl` to construct query strings, mapping `search` to the `q` query parameter.
- **Stats derivation:** Stats are derived from the API response `meta` object (`meta.total`, `meta.activeCount`, `meta.inactiveCount`) rather than from a separate endpoint.
- **Cache invalidation:** Mutations invalidate the entire `['admin', 'companies']` query key family.
- **Toast notifications:** `sonner` toasts fire on mutation success and error.
- **URL encoding:** Company IDs are URI-encoded in API paths via `encodeURIComponent`.

### Query Keys

```typescript
const QUERY_KEYS = {
  companies: ['admin', 'companies'],
  companiesList: (params) => ['admin', 'companies', 'list', params],
  company: (id) => ['admin', 'companies', 'detail', id],
};
```

## Usage Examples

### Company listing page

```tsx
import { useAdminCompanies } from '@/hooks/use-admin-companies';

function CompaniesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const {
    companies,
    stats,
    totalPages,
    isLoading,
  } = useAdminCompanies({
    params: {
      page,
      limit: 20,
      search: search || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    },
  });

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <p>Total: {stats.total} | Active: {stats.active} | Inactive: {stats.inactive}</p>
      <CompanyTable companies={companies} />
      <Pagination current={page} total={totalPages} onChange={setPage} />
    </div>
  );
}
```

### Creating a company

```tsx
const { createCompany, isSubmitting } = useAdminCompanies();

const handleCreate = async () => {
  const success = await createCompany({
    name: 'Acme Corp',
    website: 'https://acme.com',
    domain: 'acme.com',
    status: 'active',
  });
};
```

### Fetching a single company

```tsx
import { useCompany } from '@/hooks/use-admin-companies';

function CompanyDetail({ companyId }: { companyId: string }) {
  const { company, isLoading } = useCompany({ id: companyId });

  if (isLoading) return <Spinner />;
  return <CompanyCard company={company} />;
}
```

## Related Hooks

- [`useAdminClients`](./use-admin-clients-reference.md) -- Client management, often associated with companies.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management with debounced search.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide dashboard statistics.
