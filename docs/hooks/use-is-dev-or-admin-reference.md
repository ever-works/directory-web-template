---
id: use-is-dev-or-admin-reference
title: useIsDevOrAdmin Hook Reference
sidebar_label: useIsDevOrAdmin
sidebar_position: 108
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useIsDevOrAdmin

A hook that determines whether the current user is in a development environment or has admin privileges.

**Source file:** `template/hooks/use-is-dev-or-admin.ts`

## Overview

`useIsDevOrAdmin` returns a single boolean indicating whether the user should see developer/admin-only UI elements such as detailed error messages, debug panels, and diagnostic tools. It returns `true` in either of two cases:

1. The application is running in **development mode** (`NODE_ENV === 'development'`).
2. The current user has **admin privileges** (`user.isAdmin === true`).

In development mode, the admin check is short-circuited -- the hook always returns `true` without inspecting the user's role. In production, it delegates to `useCurrentUser` to determine admin status.

## Signature

```ts
function useIsDevOrAdmin(): boolean
```

## Parameters

This hook takes no parameters.

## Return Value

`boolean` -- `true` if the application is in development mode or the current user is an admin, `false` otherwise.

## Implementation Details

### Evaluation Logic

1. **Development check**: The hook reads `process.env.NODE_ENV` and sets `isDevelopment` to `true` when the value is `'development'`.
2. **User fetch**: The hook always calls `useCurrentUser()` (to obey the Rules of Hooks), but in development mode the admin result is not used.
3. **Admin check**: In non-development environments, `isAdmin` is derived from `user?.isAdmin === true`. In development, `isAdmin` is set to `false` (since the development check already guarantees `true`).
4. **Final result**: Returns `isDevelopment || isAdmin`.

### Performance

- In development mode, the hook returns `true` immediately. While `useCurrentUser()` is still called (Rules of Hooks require it), its result is not used for the return value.
- In production, the hook reuses the existing `/api/current-user` cache managed by `useCurrentUser`, so there is no additional network request if the user data is already cached.

## Usage Examples

### Showing detailed error information

```tsx
import { useIsDevOrAdmin } from '@/hooks/use-is-dev-or-admin';

function ErrorDisplay({ error }: { error: Error }) {
  const showDetails = useIsDevOrAdmin();

  return (
    <div className="error-container">
      <h2>Something went wrong</h2>
      <p>Please try again later.</p>
      {showDetails && (
        <details className="mt-4">
          <summary>Error Details</summary>
          <pre className="text-sm bg-gray-100 p-4 rounded mt-2">
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  );
}
```

### Rendering a debug panel

```tsx
import { useIsDevOrAdmin } from '@/hooks/use-is-dev-or-admin';

function AppLayout({ children }: { children: React.ReactNode }) {
  const isDevOrAdmin = useIsDevOrAdmin();

  return (
    <div>
      <Header />
      <main>{children}</main>
      <Footer />
      {isDevOrAdmin && <DebugPanel />}
    </div>
  );
}
```

### Conditional logging in a component

```tsx
import { useIsDevOrAdmin } from '@/hooks/use-is-dev-or-admin';

function DataFetcher({ endpoint }: { endpoint: string }) {
  const isDevOrAdmin = useIsDevOrAdmin();

  const { data, error } = useQuery({
    queryKey: [endpoint],
    queryFn: () => fetch(endpoint).then((res) => res.json()),
  });

  if (error && isDevOrAdmin) {
    console.warn(`DataFetcher failed for ${endpoint}:`, error);
  }

  return data ? <DataDisplay data={data} /> : <Skeleton />;
}
```

### Showing admin-only action buttons

```tsx
import { useIsDevOrAdmin } from '@/hooks/use-is-dev-or-admin';

function ItemActions({ item }: { item: Item }) {
  const isDevOrAdmin = useIsDevOrAdmin();

  return (
    <div className="flex gap-2">
      <ShareButton item={item} />
      <BookmarkButton item={item} />
      {isDevOrAdmin && (
        <button onClick={() => console.log('Item data:', item)}>
          Inspect
        </button>
      )}
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `useCurrentUser` | Provides the current user object to check `isAdmin` status |
| `process.env.NODE_ENV` | Used to detect the development environment |

## Related Hooks

- [`useCurrentUser`](/template/hooks/use-current-user-reference) -- Fetches the current authenticated user
- [`useRolePermissions`](/template/hooks/use-role-permissions-reference) -- Checks granular role-based permissions
