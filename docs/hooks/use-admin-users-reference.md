---
id: use-admin-users-reference
title: useAdminUsers Hook Reference
sidebar_label: useAdminUsers
sidebar_position: 56
---

# useAdminUsers

## Overview

`useAdminUsers` is a React hook for managing user accounts in the admin panel. It provides paginated user listing with integrated search, role, and status filtering (powered by `useAdminFilters`), CRUD mutations, and user statistics. The hook manages its own pagination state internally and automatically resets to page 1 when filters change.

**Source:** `template/hooks/use-admin-users.ts`

## Signature / Parameters

```typescript
function useAdminUsers(options?: UseAdminUsersOptions): UseAdminUsersReturn
```

### `UseAdminUsersOptions`

| Parameter | Type     | Default | Description                        |
|----------|----------|---------|------------------------------------|
| `page`   | `number` | `1`     | Initial page number                |
| `limit`  | `number` | `10`    | Items per page                     |
| `search` | `string` | `''`    | Initial search term (not commonly used; prefer the returned `setSearchTerm`) |
| `role`   | `string` | `''`    | Initial role filter                |
| `status` | `string` | `''`    | Initial status filter              |

## Return Values

### Data

| Property | Type                                                | Description                          |
|---------|-----------------------------------------------------|--------------------------------------|
| `users` | `UserWithCount[]`                                   | Array of users with item/comment counts |
| `stats` | `{ total: number; active: number; inactive: number }` | User count statistics              |

### `UserWithCount`

```typescript
interface UserWithCount {
  id: string;
  name: string | null;
  email: string | null;
  username?: string;
  title?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  role: string;
  roleName?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  itemCount: number;
  commentCount: number;
}
```

### Loading States

| Property       | Type      | Description                                                    |
|---------------|-----------|----------------------------------------------------------------|
| `isLoading`   | `boolean` | `true` on initial load                                         |
| `isFetching`  | `boolean` | `true` when fetching including background refetch              |
| `isFiltering` | `boolean` | `true` when loading or searching on the first page             |
| `isSubmitting` | `boolean` | `true` when any mutation is pending                            |
| `isSearching` | `boolean` | `true` when debounced search is pending (from `useAdminFilters`) |

### Pagination

| Property      | Type     | Description                 |
|--------------|----------|-----------------------------|
| `currentPage`| `number` | Current page number         |
| `totalPages` | `number` | Total number of pages       |
| `totalUsers` | `number` | Total users matching filters|

### Filter State

| Property              | Type     | Description                                          |
|----------------------|----------|------------------------------------------------------|
| `searchTerm`         | `string` | Current search input value                           |
| `debouncedSearchTerm`| `string` | Debounced search value (used for API calls)          |
| `roleFilter`         | `string` | Current role filter value                            |
| `statusFilter`       | `string` | Current status filter value                          |
| `hasActiveSearch`    | `boolean`| `true` when search term meets minimum length         |
| `activeFilterCount`  | `number` | Number of currently active filters                   |
| `hasActiveFilters`   | `boolean`| `true` when any filter is active                     |

### Actions

| Method        | Signature                                                     | Description          |
|--------------|---------------------------------------------------------------|----------------------|
| `createUser` | `(data: CreateUserRequest) => Promise<boolean>`               | Create a new user    |
| `updateUser` | `(id: string, data: UpdateUserRequest) => Promise<boolean>`   | Update a user        |
| `deleteUser` | `(id: string) => Promise<boolean>`                            | Delete a user        |

### `CreateUserRequest` / `UpdateUserRequest`

```typescript
interface CreateUserRequest {
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
  title?: string;
  avatar?: string;
}

interface UpdateUserRequest {
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: 'active' | 'inactive';
  title?: string;
  avatar?: string;
}
```

### Pagination Actions

| Method            | Signature                   | Description              |
|------------------|-----------------------------|--------------------------|
| `setCurrentPage` | `(page: number) => void`    | Set the current page     |
| `handlePageChange`| `(page: number) => void`   | Alias for `setCurrentPage` |

### Filter Actions

| Method              | Signature                  | Description                              |
|--------------------|----------------------------|------------------------------------------|
| `setSearchTerm`    | `(term: string) => void`   | Update the search input value            |
| `handleSearch`     | `(term: string) => void`   | Alias for `setSearchTerm`                |
| `setRoleFilter`    | `(role: string) => void`   | Set the role filter                      |
| `handleRoleFilter` | `(role: string) => void`   | Alias for `setRoleFilter`                |
| `setStatusFilter`  | `(status: string) => void` | Set the status filter                    |
| `handleStatusFilter`| `(status: string) => void`| Alias for `setStatusFilter`              |
| `clearAllFilters`  | `() => void`               | Reset all filters and search to defaults |

### Utility

| Method        | Signature    | Description                                |
|--------------|--------------|--------------------------------------------|
| `refetch`    | `() => void` | Re-execute the users list query            |
| `refreshData`| `() => void` | Invalidate all user queries for fresh data |

## Implementation Details

- **Integrated filtering:** Internally uses `useAdminFilters<'active' | 'inactive'>` for unified search, status, and multi-select (role) filter management with debounced search.
- **Debounce:** Search has a 300ms debounce delay with a minimum 2-character threshold via `useAdminFilters`.
- **Auto page reset:** A `useEffect` monitors `debouncedSearchTerm`, `statusFilter`, and `roleFilter` and resets pagination to page 1 when any changes (skips the initial mount using a `useRef` guard).
- **Query caching:** 5-minute `staleTime`, 10-minute `gcTime`, 5-minute `refetchInterval`, 3 retries.
- **Placeholder data:** `keepPreviousData` for smooth pagination transitions.
- **Separate stats query:** Stats are fetched from `/api/admin/users/stats` with their own query key.
- **Cache invalidation:** Mutations invalidate the entire `['admin-users']` query family.
- **Toast notifications:** `sonner` toasts fire automatically on mutation success and error.

### Query Keys

```typescript
const usersQueryKeys = {
  all: ['admin-users'],
  lists: () => ['admin-users', 'list'],
  list: (params) => ['admin-users', 'list', params],
  stats: () => ['admin-users', 'stats'],
  details: () => ['admin-users', 'detail'],
  detail: (id) => ['admin-users', 'detail', id],
};
```

## Usage Examples

### User management page with integrated filters

```tsx
import { useAdminUsers } from '@/hooks/use-admin-users';

function UsersPage() {
  const {
    users,
    stats,
    isLoading,
    searchTerm,
    setSearchTerm,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    totalPages,
    handlePageChange,
    clearAllFilters,
    hasActiveFilters,
    activeFilterCount,
  } = useAdminUsers({ limit: 25 });

  return (
    <div>
      <StatsBar total={stats.total} active={stats.active} inactive={stats.inactive} />

      <div className="filters">
        <SearchInput value={searchTerm} onChange={setSearchTerm} />
        <RoleSelect value={roleFilter} onChange={setRoleFilter} />
        <StatusSelect value={statusFilter} onChange={setStatusFilter} />
        {hasActiveFilters && (
          <Button onClick={clearAllFilters}>
            Clear Filters ({activeFilterCount})
          </Button>
        )}
      </div>

      <UsersTable users={users} isLoading={isLoading} />
      <Pagination current={currentPage} total={totalPages} onChange={handlePageChange} />
    </div>
  );
}
```

### Creating a user

```tsx
const { createUser, isSubmitting } = useAdminUsers();

const handleSubmit = async (formData: CreateUserRequest) => {
  const success = await createUser(formData);
  if (success) closeModal();
};
```

### Updating user status

```tsx
const { updateUser } = useAdminUsers();

const handleToggleStatus = async (user: UserWithCount) => {
  await updateUser(user.id, {
    status: user.status === 'active' ? 'inactive' : 'active',
  });
};
```

## Related Hooks

- [`useAdminFilters`](./use-admin-filters-reference.md) -- Provides the underlying filter state management used internally by this hook.
- [`useAdminRoles`](./use-admin-roles-reference.md) -- Role management; roles are assigned to users.
- [`useAdminClients`](./use-admin-clients-reference.md) -- Client profile management.
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide dashboard statistics.
