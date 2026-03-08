---
id: use-roles-reference
title: useRoles Hook Reference
sidebar_label: useRoles
sidebar_position: 114
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useRoles

Fetches the list of available roles from the admin roles API. Provides loading and error state alongside a manual `getRoles` trigger and an `clearError` helper.

**Source:** `template/hooks/use-roles.ts`

## Signature

```ts
function useRoles(): UseRolesReturn;
```

## Parameters

This hook takes no parameters.

## Return Value

```ts
const {
  roles,      // RoleData[] -- The fetched list of roles (empty array until loaded)
  loading,    // boolean -- True while a fetch is in progress
  error,      // string | null -- Error message if the last fetch failed
  getRoles,   // () => Promise<RoleData[]> -- Fetch roles from the API
  clearError, // () => void -- Reset the error state to null
} = useRoles();
```

### RoleData Type

The `RoleData` type is imported from `@/lib/types/role`. It represents a single role record in the system.

## Implementation Details

1. **API endpoint** -- Fetches from `GET /api/admin/roles`.
2. **Manual trigger** -- Roles are not fetched automatically on mount. Call `getRoles()` to initiate the fetch.
3. **Response validation** -- The hook expects the response JSON to contain a `roles` array. If the property is missing, an `'Invalid response format'` error is thrown.
4. **Error handling** -- Catches all exceptions, extracts the error message, logs to the console, and returns an empty array so callers can safely iterate even on failure.
5. **State management** -- Uses React `useState` for `roles`, `loading`, and `error`. The `getRoles` function is stable across renders via `useCallback`.

## Usage Examples

### Load Roles on Mount

```tsx
import { useRoles } from '@/hooks/use-roles';

function RoleSelector() {
  const { roles, loading, error, getRoles } = useRoles();

  useEffect(() => {
    getRoles();
  }, [getRoles]);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <select>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  );
}
```

### Role Assignment Form

```tsx
function AssignRoleForm({ userId }: { userId: string }) {
  const { roles, loading, getRoles, error, clearError } = useRoles();
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    getRoles();
  }, [getRoles]);

  const handleSubmit = async () => {
    clearError();
    await assignRoleToUser(userId, selectedRole);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="error">{error}</Alert>}
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
        disabled={loading}
      >
        <option value="">Select a role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={!selectedRole}>
        Assign Role
      </button>
    </form>
  );
}
```

### Refresh Roles

```tsx
function RoleListWithRefresh() {
  const { roles, loading, getRoles } = useRoles();

  useEffect(() => {
    getRoles();
  }, [getRoles]);

  return (
    <div>
      <button onClick={getRoles} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
      <ul>
        {roles.map((role) => (
          <li key={role.id}>{role.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Dependencies

| Dependency | Purpose |
|------------|---------|
| `@/lib/types/role` | `RoleData` type definition |

## Related Hooks

- [`useAdminRoles`](/docs/template/hooks/use-admin-roles-reference) -- Full CRUD operations for roles in the admin panel
- [`useRolePermissions`](/docs/template/hooks/use-role-permissions-reference) -- Check permissions for the current user's role
- [`useActiveRoles`](/docs/template/hooks/use-active-roles-reference) -- Fetches only active/enabled roles
- [`useIsDevOrAdmin`](/docs/template/hooks/use-is-dev-or-admin-reference) -- Quick check for admin or developer role
