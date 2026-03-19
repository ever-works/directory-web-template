---
id: auth-hooks
title: Authentication Hooks
sidebar_label: Authentication Hooks
sidebar_position: 7
---

# Authentication Hooks

Hooks for role-based access control, permission management, login/logout UI, and security settings.

## useActiveRoles

Fetches all active roles from the admin API. Returns role data with loading and error states.

```
useActiveRoles(): {
  roles: RoleData[];
  loading: boolean;
  error: string | null;
  getActiveRoles: (signal?: AbortSignal) => Promise<RoleData[]>;
  clearError: () => void;
}
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `roles` | `RoleData[]` | Array of active role objects |
| `loading` | `boolean` | Whether roles are being fetched |
| `error` | `string \| null` | Error message if the fetch failed |
| `getActiveRoles` | `(signal?) => Promise<RoleData[]>` | Trigger role fetch (supports AbortSignal) |
| `clearError` | `() => void` | Clear the current error state |

```tsx
import { useActiveRoles } from '@/hooks/use-active-roles';

function RoleSelector() {
  const { roles, loading, getActiveRoles } = useActiveRoles();

  useEffect(() => {
    const controller = new AbortController();
    getActiveRoles(controller.signal);
    return () => controller.abort();
  }, [getActiveRoles]);

  if (loading) return <Spinner />;

  return (
    <select>
      {roles.map((role) => (
        <option key={role.id} value={role.id}>{role.name}</option>
      ))}
    </select>
  );
}
```

---

## useIsDevOrAdmin

A simple boolean hook that returns `true` if the application is running in development mode or the current user is an admin. Useful for showing debug information, dev tools, or detailed error messages.

```
useIsDevOrAdmin(): boolean
```

**Returns:** `boolean` -- `true` when `NODE_ENV === 'development'` OR the current user has `isAdmin === true`.

```tsx
import { useIsDevOrAdmin } from '@/hooks/use-is-dev-or-admin';

function ErrorDisplay({ error }) {
  const showDetails = useIsDevOrAdmin();

  return (
    <div>
      <p>Something went wrong</p>
      {showDetails && <pre>{error.stack}</pre>}
    </div>
  );
}
```

---

## useRolePermissions

Manages permissions for a specific role using React Query. Provides fetching, updating, and cache invalidation for role-permission associations.

```
useRolePermissions(roleId: string, enabled?: boolean): UseRolePermissionsReturn
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `roleId` | `string` | -- | The role ID to fetch permissions for |
| `enabled` | `boolean` | `true` | Whether to enable the query |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `permissions` | `Permission[]` | Array of permissions assigned to the role |
| `role` | `object \| undefined` | Role metadata (`id`, `name`, `description`) |
| `isLoading` | `boolean` | Whether permissions are being fetched |
| `isUpdating` | `boolean` | Whether a permission update is in progress |
| `error` | `Error \| null` | Fetch error |
| `updatePermissions` | `(permissions: Permission[]) => Promise<boolean>` | Update role permissions; returns success status |
| `refetch` | `() => void` | Re-fetch permissions from server |
| `invalidateCache` | `() => void` | Invalidate the permissions cache |

### Query Configuration

| Setting | Value |
|---------|-------|
| Stale time | 5 minutes |
| GC time | 10 minutes |
| Retry | Up to 3 times; skips 401/403 errors |
| Retry delay | Exponential backoff, max 30s |

```tsx
import { useRolePermissions } from '@/hooks/use-role-permissions';

function PermissionEditor({ roleId }) {
  const { permissions, isLoading, updatePermissions, isUpdating } =
    useRolePermissions(roleId);

  const handleToggle = async (perm) => {
    const updated = permissions.includes(perm)
      ? permissions.filter((p) => p !== perm)
      : [...permissions, perm];
    await updatePermissions(updated);
  };

  return (
    <div>
      {permissions.map((perm) => (
        <Checkbox key={perm} checked onChange={() => handleToggle(perm)} />
      ))}
    </div>
  );
}
```

---

## useLoginModal

A Zustand-based global store for controlling the login modal. Can be accessed from any component without prop drilling.

```
useLoginModal(): LoginModalStore
```

### Store Shape

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether the login modal is visible |
| `message` | `string \| undefined` | Optional message displayed in the modal |
| `callbackUrl` | `string \| undefined` | URL to redirect to after login |
| `onOpen` | `(message?, callbackUrl?) => void` | Open the modal with optional message and redirect |
| `onClose` | `() => void` | Close the modal and clear message/callback |

```tsx
import { useLoginModal } from '@/hooks/use-login-modal';

function ProtectedAction() {
  const { onOpen } = useLoginModal();

  const handleClick = () => {
    if (!isAuthenticated) {
      onOpen('Please sign in to continue', '/dashboard');
      return;
    }
    // proceed with action
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

---

## useLogoutOverlay

Creates an animated full-screen overlay during the sign-out process. Handles dark mode adaptation, focus management, and prevents concurrent logout flows.

```
useLogoutOverlay(): {
  handleLogout: (texts?: { title?: string; description?: string }) => Promise<void>;
}
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `texts.title` | `string` | Custom overlay title (default: "Signing Out") |
| `texts.description` | `string` | Custom overlay description |

### Behavior

1. Creates a full-screen overlay with spinner, title, and description
2. Calls `signOut({ redirect: false })` from NextAuth
3. Redirects to `"/"` on success
4. Cleans up overlay and restores focus on completion or error
5. Adapts colors when the theme changes mid-logout via `MutationObserver`

```tsx
import { useLogoutOverlay } from '@/hooks/use-logout-overlay';

function LogoutButton() {
  const { handleLogout } = useLogoutOverlay();

  return (
    <button onClick={() => handleLogout()}>
      Sign Out
    </button>
  );
}
```

---

## useSecuritySettings

Fetches the user's security settings (2FA status, sessions, password info) via React Query.

```
useSecuritySettings(): UseQueryResult<SecuritySettings>
```

### SecuritySettings Shape

| Field | Type | Description |
|-------|------|-------------|
| `twoFactorEnabled` | `boolean` | Whether 2FA is active |
| `lastPasswordChange` | `string \| null` | ISO timestamp of last password change |
| `activeSessionsCount` | `number` | Number of active sessions |
| `loginAttemptsCount` | `number` | Recent login attempts count |
| `accountLocked` | `boolean` | Whether the account is locked |
| `passwordExpiresAt` | `string \| null` | Password expiration timestamp |

### Related Hooks

**`useLoginActivity(page?, limit?)`** -- Fetches paginated login activity records.

**`useSecurityCache()`** -- Provides cache management functions:

| Function | Description |
|----------|-------------|
| `invalidateSecuritySettings()` | Refresh security settings |
| `invalidateLoginActivity()` | Refresh login activity |
| `invalidateAllSecurity()` | Refresh all security data |
| `prefetchSecuritySettings()` | Prefetch settings into cache |

```tsx
import { useSecuritySettings, useLoginActivity } from '@/hooks/use-security-settings';

function SecurityDashboard() {
  const { data: settings, isLoading } = useSecuritySettings();
  const { data: activity } = useLoginActivity(1, 10);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <p>2FA: {settings?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
      <p>Active sessions: {settings?.activeSessionsCount}</p>
    </div>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useActiveRoles` | Fetch active roles from admin API | `use-active-roles.ts` |
| `useIsDevOrAdmin` | Check dev mode or admin status | `use-is-dev-or-admin.ts` |
| `useRolePermissions` | CRUD role permissions with React Query | `use-role-permissions.ts` |
| `useLoginModal` | Global login modal state (Zustand) | `use-login-modal.ts` |
| `useLogoutOverlay` | Animated logout overlay with sign-out | `use-logout-overlay.ts` |
| `useSecuritySettings` | Fetch security settings | `use-security-settings.ts` |
| `useLoginActivity` | Fetch paginated login activity | `use-security-settings.ts` |
| `useSecurityCache` | Security data cache management | `use-security-settings.ts` |
