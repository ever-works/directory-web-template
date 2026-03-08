---
id: use-active-roles-reference
title: useActiveRoles Hook Reference
sidebar_label: useActiveRoles
sidebar_position: 109
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useActiveRoles

A hook that fetches the list of active roles from the admin API.

**Source file:** `template/hooks/use-active-roles.ts`

## Overview

`useActiveRoles` provides an imperative way to fetch all active roles from the `/api/admin/roles/active` endpoint. Unlike many other hooks in the codebase that read from context or use TanStack Query, this hook manages its own state with `useState` and exposes a `getActiveRoles` callback that the consumer calls explicitly to trigger the fetch.

The hook supports request cancellation via `AbortSignal`, properly handles race conditions when requests are aborted, and provides a `clearError` utility for resetting error state.

## Signature

```ts
function useActiveRoles(): {
  roles: RoleData[];
  loading: boolean;
  error: string | null;
  getActiveRoles: (signal?: AbortSignal) => Promise<RoleData[]>;
  clearError: () => void;
}
```

### RoleData

```ts
interface RoleData {
  id: string;
  name: string;
  description: string;
  status: RoleStatus;       // 'active' | 'inactive'
  isAdmin: boolean;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

## Parameters

This hook takes no parameters.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `roles` | `RoleData[]` | The list of active roles. Starts as an empty array and is populated after `getActiveRoles` is called. |
| `loading` | `boolean` | `true` while a fetch request is in progress, `false` otherwise |
| `error` | `string \| null` | An error message string if the last fetch failed, `null` otherwise |
| `getActiveRoles` | `(signal?: AbortSignal) => Promise<RoleData[]>` | Async function to trigger the fetch. Accepts an optional `AbortSignal` for cancellation. Returns the fetched roles array, or an empty array on failure. |
| `clearError` | `() => void` | Resets the `error` state to `null` |

## Implementation Details

### Fetch Behavior

1. When `getActiveRoles` is called, it sets `loading: true` and `error: null`.
2. It sends a `GET` request to `/api/admin/roles/active` with `credentials: 'include'` (session cookies are sent).
3. On success, the response is expected to contain a `{ roles: RoleData[] }` object. The roles are stored in state and returned.
4. On failure, the error message is extracted and stored in state. An empty array is returned.

### Abort Signal Support

The `getActiveRoles` function accepts an optional `AbortSignal` parameter. When a request is aborted:

- The fetch is cancelled at the network level.
- State updates are skipped (preventing "state update on unmounted component" warnings).
- An empty array is returned.

This is particularly useful for cleanup in `useEffect`:

```ts
useEffect(() => {
  const controller = new AbortController();
  getActiveRoles(controller.signal);
  return () => controller.abort();
}, [getActiveRoles]);
```

### Stability

- `getActiveRoles` is wrapped in `useCallback` with an empty dependency array, so its reference is stable across re-renders.
- `clearError` is also wrapped in `useCallback` with an empty dependency array.

## Usage Examples

### Fetching roles on mount

```tsx
import { useEffect } from 'react';
import { useActiveRoles } from '@/hooks/use-active-roles';

function RoleSelector() {
  const { roles, loading, error, getActiveRoles } = useActiveRoles();

  useEffect(() => {
    const controller = new AbortController();
    getActiveRoles(controller.signal);
    return () => controller.abort();
  }, [getActiveRoles]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <select>
      <option value="">Select a role</option>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
  );
}
```

### Role assignment form

```tsx
import { useEffect, useState } from 'react';
import { useActiveRoles } from '@/hooks/use-active-roles';

function UserRoleAssignment({ userId }: { userId: string }) {
  const { roles, loading, getActiveRoles } = useActiveRoles();
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    const controller = new AbortController();
    getActiveRoles(controller.signal);
    return () => controller.abort();
  }, [getActiveRoles]);

  const handleAssign = async () => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId: selectedRole }),
    });
  };

  return (
    <div className="flex gap-2">
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
        disabled={loading}
      >
        <option value="">Select role...</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name} {role.isAdmin && '(Admin)'}
          </option>
        ))}
      </select>
      <button onClick={handleAssign} disabled={!selectedRole}>
        Assign Role
      </button>
    </div>
  );
}
```

### Error handling with retry

```tsx
import { useEffect } from 'react';
import { useActiveRoles } from '@/hooks/use-active-roles';

function RoleList() {
  const { roles, loading, error, getActiveRoles, clearError } = useActiveRoles();

  useEffect(() => {
    getActiveRoles();
  }, [getActiveRoles]);

  if (error) {
    return (
      <div className="text-red-600">
        <p>Failed to load roles: {error}</p>
        <button
          onClick={() => {
            clearError();
            getActiveRoles();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) return <Skeleton count={3} />;

  return (
    <ul>
      {roles.map((role) => (
        <li key={role.id}>
          <strong>{role.name}</strong> -- {role.description}
        </li>
      ))}
    </ul>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `/api/admin/roles/active` | API endpoint that returns the list of active roles |
| `RoleData` from `@/lib/types/role` | TypeScript type for role objects |

## API Endpoint

The hook fetches from `GET /api/admin/roles/active`. The expected response format is:

```json
{
  "roles": [
    {
      "id": "editor",
      "name": "Editor",
      "description": "Can edit and publish content",
      "status": "active",
      "isAdmin": false,
      "permissions": ["items:read", "items:write"],
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z",
      "created_by": "user_abc123"
    }
  ]
}
```

## Related Hooks

- [`useAdminRoles`](/docs/template/hooks/use-admin-roles-reference) -- Full admin CRUD operations for roles
- [`useRolePermissions`](/docs/template/hooks/use-role-permissions-reference) -- Checks permissions for the current user's role
- [`useIsDevOrAdmin`](/docs/template/hooks/use-is-dev-or-admin-reference) -- Checks if the current user is a developer or admin
