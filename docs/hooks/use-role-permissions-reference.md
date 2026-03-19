---
id: use-role-permissions-reference
title: useRolePermissions
sidebar_label: useRolePermissions
sidebar_position: 33
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useRolePermissions

A React hook for fetching and updating role-based permissions via the admin API. Built on TanStack Query, it provides cached permission data, optimistic loading states, and mutation support for modifying a role's permission set.

## Import

```typescript
import { useRolePermissions } from '@/hooks/use-role-permissions';
```

## API Reference

### Parameters

```typescript
function useRolePermissions(roleId: string, enabled?: boolean): UseRolePermissionsReturn;
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `roleId` | `string` | *required* | The unique identifier of the role to fetch permissions for. |
| `enabled` | `boolean` | `true` | Whether the query should execute. Set to `false` to defer fetching. |

### Return Value

| Property | Type | Description |
|---|---|---|
| `permissions` | `Permission[]` | Array of permission strings assigned to the role. Empty array if data is not yet loaded. |
| `role` | `{ id: string; name: string; description: string } \| undefined` | Role metadata returned from the API. |
| `isLoading` | `boolean` | `true` while the initial permissions fetch is in progress. |
| `isUpdating` | `boolean` | `true` while a permission update mutation is pending. |
| `error` | `Error \| null` | Error from the most recent fetch attempt, or `null`. |
| `updatePermissions` | `(permissions: Permission[]) => Promise<boolean>` | Sends an updated permission array to the server. Returns `true` on success, `false` on failure. |
| `refetch` | `() => Promise<...>` | Manually re-fetches permissions from the API. |
| `invalidateCache` | `() => void` | Invalidates the cached permissions for this role, triggering a background refetch. |

### Types

```typescript
// From @/lib/permissions/definitions
type Permission = string; // e.g., 'items:create', 'users:delete', 'admin:manage'
```

The `Permission` type is a union of all valid permission strings defined in your application's permission definitions.

## Usage Examples

### Admin Role Editor

```tsx
function RolePermissionEditor({ roleId }: { roleId: string }) {
  const {
    permissions,
    role,
    isLoading,
    isUpdating,
    updatePermissions,
  } = useRolePermissions(roleId);

  const [localPermissions, setLocalPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    setLocalPermissions(permissions);
  }, [permissions]);

  const handleToggle = (perm: Permission) => {
    setLocalPermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    );
  };

  const handleSave = async () => {
    const success = await updatePermissions(localPermissions);
    if (success) {
      console.log('Permissions saved successfully');
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <h2>{role?.name} Permissions</h2>
      <p>{role?.description}</p>
      <PermissionGrid
        permissions={localPermissions}
        onToggle={handleToggle}
      />
      <button onClick={handleSave} disabled={isUpdating}>
        {isUpdating ? 'Saving...' : 'Save Permissions'}
      </button>
    </div>
  );
}
```

### Conditional Fetching

```tsx
function ConditionalPermissions({ roleId, isOpen }: { roleId: string; isOpen: boolean }) {
  // Only fetch when the panel is open
  const { permissions, isLoading } = useRolePermissions(roleId, isOpen);

  if (!isOpen) return null;
  if (isLoading) return <Skeleton />;

  return (
    <ul>
      {permissions.map((perm) => (
        <li key={perm}>{perm}</li>
      ))}
    </ul>
  );
}
```

### Permission Check Utility

```tsx
function PermissionGuard({ roleId, required, children }: {
  roleId: string;
  required: Permission;
  children: React.ReactNode;
}) {
  const { permissions, isLoading } = useRolePermissions(roleId);

  if (isLoading) return null;
  if (!permissions.includes(required)) return null;

  return <>{children}</>;
}
```

## Configuration

### API Endpoints

The hook calls the following admin API endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/roles/{roleId}/permissions` | Fetch permissions for a role. |
| `PUT` | `/api/admin/roles/{roleId}/permissions` | Update permissions for a role. |

### Caching Strategy

| Setting | Value | Description |
|---|---|---|
| `staleTime` | 5 minutes | Data is considered fresh for 5 minutes before a background refetch. |
| `gcTime` | 10 minutes | Unused cache entries are garbage-collected after 10 minutes. |
| `retry` | Up to 3 times | Retries on failure, except for 401/403 errors which fail immediately. |
| `retryDelay` | Exponential backoff | Starts at 1 second, doubles each attempt, caps at 30 seconds. |

### Required Dependencies

- `@tanstack/react-query` -- Provides `useQuery` and `useMutation`.
- `sonner` -- Used for success/error toast notifications on permission updates.
- `@/lib/api/api-client` -- The API client for making authenticated HTTP requests.

## Edge Cases and Gotchas

- **Empty roleId**: If `roleId` is an empty string, the query is automatically disabled regardless of the `enabled` parameter.
- **Auth Errors**: 401 and 403 responses are not retried. The hook treats them as terminal failures. Check the `error` object to detect authorization issues.
- **Optimistic Cache Invalidation**: After a successful update, both `role-permissions` and `admin-roles` query caches are invalidated. This ensures that role lists in other parts of the admin UI stay in sync.
- **Toast Side Effects**: The mutation automatically shows `sonner` toast notifications on success and failure. If you need to suppress or customize these, you will need to modify the hook source.
- **Boolean Return from updatePermissions**: The `updatePermissions` function catches errors internally and returns `false` instead of throwing. Always check the return value rather than wrapping the call in a try/catch.
- **Permission Type Safety**: The `Permission` type is defined in `@/lib/permissions/definitions`. Ensure your permission strings match the definitions to avoid silent mismatches.

## Related Hooks

- [usePlanGuard](./use-plan-guard-reference.md) -- Plan-based access control (complementary to role-based permissions).
- [useToast](./use-toast-reference.md) -- The underlying toast system used by this hook for mutation feedback.
