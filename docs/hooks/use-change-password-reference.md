---
id: use-change-password-reference
title: useChangePassword
sidebar_label: useChangePassword
sidebar_position: 85
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useChangePassword

A React Query mutation hook for changing the authenticated user's password. Handles the API call, toast notifications, query cache invalidation, and error handling with custom retry logic.

## Import

```typescript
import { useChangePassword } from '@/template/hooks/use-change-password';
```

## API Reference

### Parameters

```typescript
function useChangePassword(): UseChangePasswordReturn;
```

This hook takes no parameters.

### Return Value

#### `UseChangePasswordReturn`

| Property | Type | Description |
|---|---|---|
| `changePassword` | `(data: ChangePasswordData) => Promise<ChangePasswordResponse>` | Submits the password change request. Returns a response object with `success`, `message`, and optional `error` fields. Never throws -- errors are returned in the response. |
| `isLoading` | `boolean` | Whether the mutation is currently in progress. |
| `error` | `string \| null` | The error message from the last failed attempt, or `null`. |
| `isSuccess` | `boolean` | Whether the last mutation completed successfully. A success also signs out and navigates to `/auth/signin`, so the calling form is replaced before it can show a success state. |
| `isError` | `boolean` | Whether the last mutation resulted in an error. |
| `reset` | `() => void` | Resets the mutation state (clears error, success, etc.). |
| `status` | `'idle' \| 'pending' \| 'success' \| 'error'` | Current mutation status from React Query. |
| `failureCount` | `number` | Number of times the current mutation has failed and retried. |
| `failureReason` | `ChangePasswordError \| null` | The error object from the last failure, including optional validation details. |

### Types

```typescript
interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

interface ChangePasswordError {
  error: string;
  details?: Array<{
    path: string[];
    message: string;
    code: string;
  }>;
}
```

## Usage Examples

### Password Change Form

```tsx
import { useState } from 'react';
import { useChangePassword } from '@/template/hooks/use-change-password';

function ChangePasswordForm() {
  const { changePassword, isLoading, error } = useChangePassword();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // On success the hook signs out and navigates to /auth/signin, so this form is replaced:
    // there is no success state to render or reset here. Only a failure stays on the form.
    await changePassword(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Current Password</label>
        <input
          type="password"
          value={formData.currentPassword}
          onChange={(e) => setFormData((prev) => ({ ...prev, currentPassword: e.target.value }))}
          required
        />
      </div>

      <div>
        <label>New Password</label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData((prev) => ({ ...prev, newPassword: e.target.value }))}
          required
        />
      </div>

      <div>
        <label>Confirm New Password</label>
        <input
          type="password"
          value={formData.confirmPassword}
          onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
          required
        />
      </div>

      {error && <p className="text-red-600">{error}</p>}

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Changing Password...' : 'Change Password'}
      </button>
    </form>
  );
}
```

### With react-hook-form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useChangePassword } from '@/template/hooks/use-change-password';

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function ChangePasswordFormZod() {
  const { changePassword, isLoading } = useChangePassword();
  const form = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    // On success the hook signs out and navigates to /auth/signin; the form is not reset
    // because it is replaced by the sign-in page. A failure is shown as a toast.
    await changePassword(data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields here */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Update Password'}
      </button>
    </form>
  );
}
```

## Implementation Details

- **API Client**: Uses `serverClient.post()` from `@/lib/api/server-api-client` to send the password change request to `/api/auth/change-password`.
- **Toast Notifications**: On success, a `toast.success()` notification is displayed automatically using `sonner`. On error, a `toast.error()` is shown with the error message.
- **Sign-Out and Redirect on Success**: A password change ends every session that signed in before it, the current one included (see [Session Management](../authentication/session-management.md#a-password-reset-or-change-ends-older-sessions)). One exception: the server-rendered admin survey edit, preview and responses pages do not call `auth()`, so their first HTML response can still carry the survey definition to such an admin session until the client guard redirects (tracked as T-2645). On success the hook removes the `["auth-session"]`, `["user"]`, `["profile"]`, `["security"]` (every `SECURITY_QUERY_KEYS` entry) and `["auth"]` caches (refetching them would only answer 401), signs out with `signOut({ redirect: false })` from `next-auth/react` and sends the user to `/auth/signin` (`router.replace` from `@/i18n/navigation`, so the toast stays visible) to sign in with the new password.
- **Custom Retry Logic**: The mutation does not retry on validation errors (`"Invalid input"`), incorrect password (`"Current password is incorrect"`), or rate limiting (`"Too many"`). Server errors are retried up to 2 times with exponential backoff (`1s, 2s, 4s...` capped at 30 seconds).
- **Non-Throwing API**: The `changePassword` function wraps `mutation.mutateAsync` in a try/catch, always returning a `ChangePasswordResponse` object. This makes it safe to use without requiring try/catch in the calling code.

## Edge Cases and Gotchas

- **Password Confirmation**: The hook sends `confirmPassword` to the server, but does not validate that it matches `newPassword` on the client side. Perform client-side validation in your form before calling `changePassword`.
- **Rate Limiting**: The API may return a rate limit error if too many attempts are made. The hook does not retry on rate limit errors, but the error message is displayed via toast.
- **Session Ends**: After a successful password change the server ends the current session, so the hook always signs out and navigates to `/auth/signin`. The success toast is what the user sees; a success state in the calling form is replaced by the sign-in page.
- **Validation Error Details**: The `ChangePasswordError.details` array provides field-level validation errors from the server (Zod validation). Each entry has a `path` (field name), `message`, and `code`. These are logged to the console but not displayed in the toast -- you may want to surface them in the form UI.
- **Mutation Key**: The mutation uses `["change-password"]` as its key, allowing you to track its status globally if needed.

## Related Hooks

- [useSecuritySettings](./use-security-settings-reference.md) -- Fetches security settings including `lastPasswordChange`, the time of the last password reset or change.
- [useCurrentUser](./use-current-user-reference.md) -- Provides the authenticated user context; its cache is removed on password change.
- [useLoginModal](./use-login-modal-reference.md) -- Another way to sign in again after a password change ends the session.
