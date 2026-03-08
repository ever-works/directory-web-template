---
id: use-security-settings-reference
title: useSecuritySettings
sidebar_label: useSecuritySettings
sidebar_position: 84
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSecuritySettings

A set of React Query-based hooks for fetching and managing security-related data: account security settings, login activity history, and cache invalidation utilities. Built on `@tanstack/react-query` and the template's `serverClient` API layer.

## Import

```typescript
import {
  useSecuritySettings,
  useLoginActivity,
  useSecurityCache,
  SECURITY_QUERY_KEYS,
} from '@/template/hooks/use-security-settings';
```

## API Reference

### `useSecuritySettings`

```typescript
function useSecuritySettings(): UseQueryResult<SecuritySettings, Error>;
```

Fetches the current user's security settings from `/api/auth/security/settings`.

**Return Value**: Standard React Query `UseQueryResult<SecuritySettings, Error>`.

**Query Configuration**:

| Setting | Value | Description |
|---|---|---|
| `staleTime` | `300000` (5 min) | Data is considered fresh for 5 minutes before refetching. |
| `gcTime` | `1800000` (30 min) | Unused data is garbage collected after 30 minutes. |
| `retry` | Custom | Retries up to 2 times, but does not retry on `"Unauthorized"` errors. |

### `useLoginActivity`

```typescript
function useLoginActivity(page?: number, limit?: number): UseQueryResult<LoginActivityResponse, Error>;
```

Fetches paginated login activity from `/api/auth/security/login-activity`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | The page number to fetch. |
| `limit` | `number` | `10` | Number of activity entries per page. |

**Return Value**: Standard React Query `UseQueryResult<LoginActivityResponse, Error>`.

**Query Configuration**:

| Setting | Value | Description |
|---|---|---|
| `staleTime` | `120000` (2 min) | Data is considered fresh for 2 minutes. |
| `gcTime` | `900000` (15 min) | Unused data is garbage collected after 15 minutes. |
| `retry` | `1` | Retries once on failure. |

### `useSecurityCache`

```typescript
function useSecurityCache(): SecurityCacheActions;
```

Provides cache invalidation and prefetching utilities for security-related queries.

**Return Value**:

| Property | Type | Description |
|---|---|---|
| `invalidateSecuritySettings` | `() => void` | Invalidates the security settings query, triggering a refetch. |
| `invalidateLoginActivity` | `() => void` | Invalidates all login activity queries (all pages). |
| `invalidateAllSecurity` | `() => void` | Invalidates all queries under the `["security"]` key prefix. |
| `prefetchSecuritySettings` | `() => void` | Prefetches security settings into the query cache with a 5-minute stale time. |

### `SECURITY_QUERY_KEYS`

```typescript
const SECURITY_QUERY_KEYS = {
  settings: ["security", "settings"] as const,
  loginActivity: (page: number, limit: number) =>
    ["security", "login-activity", page, limit] as const,
  activeSessions: ["security", "active-sessions"] as const,
} as const;
```

Centralized query key factory for consistent cache management across components.

### Types

```typescript
interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string | null;
  activeSessionsCount: number;
  loginAttemptsCount: number;
  accountLocked: boolean;
  passwordExpiresAt: string | null;
}

interface LoginActivity {
  id: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  success: boolean;
  sessionActive: boolean;
}

interface LoginActivityResponse {
  activities: LoginActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Usage Examples

### Security Settings Dashboard

```tsx
import { useSecuritySettings } from '@/template/hooks/use-security-settings';

function SecurityDashboard() {
  const { data: settings, isLoading, error } = useSecuritySettings();

  if (isLoading) return <div>Loading security settings...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span>Two-Factor Authentication</span>
        <span className={settings?.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}>
          {settings?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span>Active Sessions</span>
        <span>{settings?.activeSessionsCount}</span>
      </div>

      {settings?.accountLocked && (
        <div className="bg-red-50 p-3 rounded text-red-800">
          Your account is currently locked.
        </div>
      )}
    </div>
  );
}
```

### Paginated Login Activity

```tsx
import { useState } from 'react';
import { useLoginActivity } from '@/template/hooks/use-security-settings';

function LoginActivityLog() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useLoginActivity(page, 10);

  if (isLoading) return <div>Loading activity...</div>;

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>IP Address</th>
            <th>Status</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {data?.activities.map((activity) => (
            <tr key={activity.id}>
              <td>{new Date(activity.timestamp).toLocaleString()}</td>
              <td>{activity.ipAddress}</td>
              <td>{activity.success ? 'Success' : 'Failed'}</td>
              <td>{activity.location ?? 'Unknown'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 mt-4">
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>Page {page} of {data?.pagination.totalPages}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= (data?.pagination.totalPages ?? 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### Cache Invalidation After Security Action

```tsx
import { useSecurityCache } from '@/template/hooks/use-security-settings';

function TwoFactorToggle() {
  const { invalidateSecuritySettings } = useSecurityCache();

  const handleEnable2FA = async () => {
    await fetch('/api/auth/security/2fa/enable', { method: 'POST' });
    // Refetch security settings to reflect the change
    invalidateSecuritySettings();
  };

  return <button onClick={handleEnable2FA}>Enable 2FA</button>;
}
```

## Implementation Details

- **Server API Client**: All API calls use the template's `serverClient` from `@/lib/api/server-api-client`, which handles authentication headers, base URL resolution, and standardized error responses.
- **URL Building**: `useLoginActivity` uses `apiUtils.buildUrl()` to construct query-parameterized URLs for pagination.
- **Authentication Error Handling**: `useSecuritySettings` has custom retry logic that immediately stops retrying when the error message contains `"Unauthorized"`, preventing repeated failed requests when the session has expired.
- **Query Key Organization**: The exported `SECURITY_QUERY_KEYS` object provides a centralized key factory. The `invalidateAllSecurity` method in `useSecurityCache` uses the `["security"]` prefix to invalidate all related queries at once.
- **Prefetching**: `prefetchSecuritySettings` can be called on hover or navigation to pre-load security data before the user reaches the settings page.

## Edge Cases and Gotchas

- **Authentication Required**: All endpoints require an authenticated session. If the user is not logged in, the queries will fail with an unauthorized error. Combine with an auth guard or redirect logic.
- **Pagination Key Uniqueness**: Each `(page, limit)` combination creates a separate cache entry. Changing `limit` will trigger a new fetch even if the same data could be derived from existing cache entries.
- **Stale Data After Password Change**: After a password change, call `invalidateSecuritySettings()` to update the `lastPasswordChange` field. The `useChangePassword` hook does this automatically.
- **Account Lock State**: The `accountLocked` field is fetched from the server. If the account becomes locked during the stale period (5 minutes), the UI will not reflect this until the next refetch.

## Related Hooks

- [useChangePassword](./use-change-password-reference.md) -- Password change mutation that invalidates security-related caches.
- [useCurrentUser](./use-current-user-reference.md) -- Provides the authenticated user context needed for security settings.
- [useLoginModal](./use-login-modal-reference.md) -- Login modal that may be triggered when security queries return unauthorized errors.
