---
id: use-admin-roles-reference
title: useAdminRoles Hook Reference
sidebar_label: useAdminRoles
sidebar_position: 57
---

# useAdminRoles

## Overview

`useAdminRoles` is a React hook for managing roles and permissions in the admin panel. It provides a non-paginated list of all roles with CRUD mutations, including support for both soft delete and permanent (hard) delete. Roles include permission arrays and admin flags for granular access control.

**Source:** `template/hooks/use-admin-roles.ts`

## Signature / Parameters

```typescript
function useAdminRoles(): UseAdminRolesReturn
```

This hook takes no parameters. It fetches the complete list of roles without pagination.

## Return Values

### Data

| Property | Type         | Description               |
|---------|--------------|---------------------------|
| `roles` | `RoleData[]` | Array of all role records |

### `RoleData`

```typescript
interface RoleData {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  isAdmin: boolean;
  permissions?: Permission[];
  createdAt: Date;
  updatedAt: Date;
}
```

The `Permission` type is imported from the database schema (`@/lib/db/schema`).

### Loading States

| Property       | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| `isLoading`   | `boolean` | `true` on initial load               |
| `isSubmitting` | `boolean` | `true` when any mutation is pending  |

### Actions

| Method        | Signature                                                            | Description                                                          |
|--------------|----------------------------------------------------------------------|----------------------------------------------------------------------|
| `createRole` | `(data: CreateRoleRequest) => Promise<boolean>`                      | Create a new role                                                    |
| `updateRole` | `(id: string, data: UpdateRoleRequest) => Promise<boolean>`          | Update an existing role                                              |
| `deleteRole` | `(id: string, hardDelete?: boolean) => Promise<boolean>`             | Delete a role. Pass `hardDelete=true` for permanent deletion.        |

### Request Types

```typescript
interface CreateRoleRequest {
  name: string;
  description: string;
  status?: 'active' | 'inactive';
  isAdmin?: boolean;
}

interface UpdateRoleRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
  isAdmin?: boolean;
  permissions?: Permission[];
}
```

### Utility

| Method        | Signature    | Description                                    |
|--------------|--------------|-------------------------------------------------|
| `refetch`    | `() => void` | Re-execute the roles list query                 |
| `refreshData`| `() => void` | Invalidate all role queries for fresh data      |

## Implementation Details

- **No pagination:** Roles are fetched as a complete list from `/api/admin/roles` since the total count is typically small.
- **Query caching:** 5-minute `staleTime`, 10-minute `gcTime`, 5-minute `refetchInterval`, 3 retries.
- **Soft vs. hard delete:** The `deleteRole` action supports a `hardDelete` parameter. When `false` (default), the role is soft-deleted (deactivated). When `true`, the `?hard=true` query parameter is appended and the role is permanently removed. The success toast message differs accordingly ("Role deleted" vs. "Role permanently deleted").
- **Cache invalidation:** All mutations invalidate the entire `['admin-roles']` query key family.
- **Toast notifications:** `sonner` toasts fire on mutation success and error. Error toasts include the specific error message.
- **Error logging:** Errors are logged to the console via `console.error`.

### Query Keys

```typescript
const rolesQueryKeys = {
  all: ['admin-roles'],
  lists: () => ['admin-roles', 'list'],
  list: () => ['admin-roles', 'list'],
  details: () => ['admin-roles', 'detail'],
  detail: (id) => ['admin-roles', 'detail', id],
};
```

## Usage Examples

### Roles management page

```tsx
import { useAdminRoles } from '@/hooks/use-admin-roles';

function RolesPage() {
  const {
    roles,
    isLoading,
    isSubmitting,
    createRole,
    updateRole,
    deleteRole,
  } = useAdminRoles();

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h1>Roles ({roles.length})</h1>
      <RolesTable
        roles={roles}
        onEdit={(id, data) => updateRole(id, data)}
        onDelete={(id) => deleteRole(id)}
        onHardDelete={(id) => deleteRole(id, true)}
      />
    </div>
  );
}
```

### Creating a role with permissions

```tsx
const { createRole, isSubmitting } = useAdminRoles();

const handleCreate = async () => {
  const success = await createRole({
    name: 'Editor',
    description: 'Can edit and publish content',
    status: 'active',
    isAdmin: false,
  });

  if (success) {
    closeCreateDialog();
  }
};
```

### Updating role permissions

```tsx
const { updateRole } = useAdminRoles();

const handleUpdatePermissions = async (roleId: string, permissions: Permission[]) => {
  const success = await updateRole(roleId, { permissions });
  // Data auto-refreshes on success
};
```

### Using roles in a user form dropdown

```tsx
const { roles, isLoading } = useAdminRoles();

const activeRoles = roles.filter((r) => r.status === 'active');

return (
  <select disabled={isLoading}>
    {activeRoles.map((role) => (
      <option key={role.id} value={role.id}>
        {role.name} {role.isAdmin ? '(Admin)' : ''}
      </option>
    ))}
  </select>
);
```

## Related Hooks

- [`useAdminUsers`](./use-admin-users-reference.md) -- User management; users are assigned roles.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Unified filter state management (used by user management to filter by role).
- [`useAdminStats`](./use-admin-stats-reference.md) -- Platform-wide dashboard statistics.
