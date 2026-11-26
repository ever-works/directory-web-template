---
id: auth-endpoints
title: Authentication API Endpoints
sidebar_label: Auth Endpoints
sidebar_position: 4
---

# Authentication API Endpoints

Authentication endpoints handle NextAuth.js route handling, password management, and current user session retrieval. The core NextAuth catch-all route manages all OAuth callbacks, session management, and CSRF protection automatically.

## NextAuth Handler (`/api/auth/[...nextauth]`)

The catch-all route exports NextAuth's handlers from `lib/auth/index.ts`:

```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

This single route handles all NextAuth operations:

### GET Endpoints (via NextAuth)

| Path | Description |
|------|-------------|
| `/api/auth/signin` | Render sign-in page or redirect to provider |
| `/api/auth/signout` | Handle sign-out |
| `/api/auth/session` | Get current session as JSON |
| `/api/auth/csrf` | Get CSRF token |
| `/api/auth/providers` | List available auth providers |
| `/api/auth/callback/[provider]` | OAuth callback handler |

### POST Endpoints (via NextAuth)

| Path | Description |
|------|-------------|
| `/api/auth/signin/[provider]` | Initiate sign-in with provider |
| `/api/auth/signout` | Process sign-out |
| `/api/auth/callback/credentials` | Process credentials sign-in |
| `/api/auth/_log` | Auth.js internal logging |

`/api/auth/callback/credentials` runs the credentials provider's `authorize`
(`lib/auth/credentials.ts`), which spends the same per-email password budget as
the sign-in form's server action (`lib/auth/signin-password-budget.ts`): 5 failed
attempts (a wrong password or an unknown email) per 15 minutes per email,
lowercased and trimmed. Once it is spent the callback refuses the sign-in, even
with the right password, until the window ends (Auth.js answers with
`?error=` on its URL and sets no session cookie). A correct password gives its
slot back, so correct sign-ins never use the budget up (T-2839). An email that
is not a string or is longer than 255 characters (the form's own cap) is refused
before it is counted, so a request cannot pin a huge key in the limiter.

### OAuth Callback Flow

When a user authenticates with an OAuth provider:

```
1. User clicks "Sign in with Google"
2. Redirect to Google consent screen
3. Google redirects back to /api/auth/callback/google
4. NextAuth verifies the OAuth code
5. signIn callback runs (lib/auth/index.ts)
   -> Validates user email
   -> Allows account linking for OAuth
   -> Never logs the user, account (OAuth tokens) or profile, nor the email;
      logs only the provider name, plus (in development only) whether an id and email are set
6. jwt callback enriches token
   -> Sets userId, provider, isAdmin, and signedInAt (the sign-in time); a credentials
      sign-in also sets passwordVersion (password_changed_at read with the checked hash)
   -> Creates client profile for new OAuth users
7. Session created, user redirected to callback URL
```

### Custom Pages

NextAuth is configured to use custom authentication pages rather than the default NextAuth UI:

| Purpose | Custom Path |
|---------|-------------|
| Sign In | `/auth/signin` |
| Sign Out | `/auth/signout` |
| Error | `/auth/error` |
| Verify Request | `/auth/verify-request` |
| New User Registration | `/auth/register` |

## Password Management (`/api/auth/change-password`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/change-password` | Change authenticated user's password |

### Request Body

```json
{
  "currentPassword": "old-password",
  "newPassword": "new-secure-password"
}
```

### Authentication

Requires a valid session. The endpoint verifies the current password before updating.

A successful change (like a password reset) stamps `users.password_changed_at`, which ends every session that signed in before it, the caller's own included (the check runs while `DATABASE_URL` is set; without a database there are no password sign-ins to end): the client then signs out and goes to `/auth/signin`. See [Session Management](../authentication/session-management.md#a-password-reset-or-change-ends-older-sessions).

### Response

```json
// Success
{ "success": true, "message": "Password changed successfully" }

// Error
{ "success": false, "error": "Current password is incorrect" }
```

## Current User (`/api/current-user`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/current-user` | Get current authenticated user data |

### Response

Returns the session user object enriched with application-specific fields:

```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "image": "https://...",
    "isAdmin": false,
    "clientProfileId": "profile-uuid",
    "provider": "google"
  }
}
```

### Unauthenticated Response

Returns `null` or a `401` status when no valid session exists.

## Session Token Handling

NextAuth stores session tokens in HTTP-only cookies:

| Cookie Name | Environment |
|------------|-------------|
| `next-auth.session-token` | Development (HTTP) |
| `__Secure-next-auth.session-token` | Production (HTTPS) |

### CSRF Protection

NextAuth includes built-in CSRF protection. A CSRF token cookie (`next-auth.csrf-token`) is set on the client and must be included with POST requests to NextAuth endpoints.

## Error Handling

Authentication errors are mapped to user-friendly messages in `lib/auth/error-handler.ts`:

| Error Pattern | User Message |
|--------------|--------------|
| `GOOGLE_CLIENT_ID` related | Google authentication is not properly configured |
| `GITHUB_CLIENT_ID` related | GitHub authentication is not properly configured |
| `FB_CLIENT_ID` related | Facebook authentication is not properly configured |
| `MICROSOFT_CLIENT_ID` related | Microsoft authentication is not properly configured |
| `SUPABASE` related | Supabase authentication is not properly configured |
| `NEXTAUTH` related | NextAuth is not properly configured |

The `handleAuthError()` function catches these errors and returns a structured `{ error: string }` response.

## Auth Events

The NextAuth configuration in `lib/auth/index.ts` handles lifecycle events:

### Sign-Out Event

Invalidates the session cache for the user to ensure stale session data is not served:

```typescript
events: {
  signOut: async (event) => {
    const token = 'token' in event ? event.token : undefined;
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  }
}
```

### User Update Event

Invalidates the session cache when user data changes (e.g., profile update, role change):

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  }
}
```

## Related Configuration

| File | Purpose |
|------|---------|
| `auth.config.ts` | Top-level provider configuration |
| `lib/auth/index.ts` | NextAuth instance with callbacks and events |
| `lib/auth/providers.ts` | OAuth provider factory |
| `lib/auth/credentials.ts` | Email/password provider |
| `lib/auth/cached-session.ts` | Session caching layer |
| `lib/auth/admin-guard.ts` | Admin route middleware |
