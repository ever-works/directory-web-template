---
id: providers
title: Authentication Providers
sidebar_label: Providers
sidebar_position: 2
---

# Authentication Providers

The template supports multiple authentication providers through NextAuth.js (Auth.js v5), with an optional Supabase adapter for database-backed sessions. Providers are configured dynamically based on environment variables, with graceful fallback to credentials-only authentication when OAuth configuration is incomplete.

## Provider Architecture

Authentication provider setup follows a layered configuration pattern:

```
auth.config.ts                  # Top-level NextAuth config
  -> lib/auth/providers.ts      # OAuth provider factory
  -> lib/auth/credentials.ts    # Email/password provider
  -> lib/auth/error-handler.ts  # Env validation + error mapping
  -> lib/auth/config.ts         # Provider type resolution (next-auth | supabase | both)
```

The entry point `auth.config.ts` calls `configureOAuthProviders()` to detect which providers have valid credentials, then passes them to `createNextAuthProviders()` to build the NextAuth provider array. If OAuth configuration fails entirely, the system falls back to credentials-only mode.

## Supported OAuth Providers

### Google

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

Google is configured with `allowDangerousEmailAccountLinking: false` by default in `auth.config.ts`, which prevents automatic account linking when a user signs in with Google using an email that already exists with a different provider.

To set up Google OAuth:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials under APIs & Services > Credentials
3. Set the authorized redirect URI to `{APP_URL}/api/auth/callback/google`

### GitHub

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |

GitHub OAuth apps are created at [github.com/settings/developers](https://github.com/settings/developers). Set the authorization callback URL to `{APP_URL}/api/auth/callback/github`.

### Facebook

| Variable | Description |
|----------|-------------|
| `FB_CLIENT_ID` | Facebook App ID |
| `FB_CLIENT_SECRET` | Facebook App secret |

Configure a Facebook Login product in the [Meta Developer Portal](https://developers.facebook.com/). The valid OAuth redirect URI is `{APP_URL}/api/auth/callback/facebook`.

### Twitter / X

| Variable | Description |
|----------|-------------|
| `TWITTER_CLIENT_ID` | Twitter OAuth 2.0 client ID |
| `TWITTER_CLIENT_SECRET` | Twitter OAuth 2.0 client secret |

Twitter uses OAuth 2.0 with PKCE. Create a project at [developer.twitter.com](https://developer.twitter.com/) and set the callback URL to `{APP_URL}/api/auth/callback/twitter`.

## Credentials Provider

The credentials provider (`lib/auth/credentials.ts`) handles email/password authentication with a dual-path flow for admin and client users.

### Authentication Flow

```
credentials.authorize(email, password)
  -> getUserByEmail(email)         # Check users table
  -> isUserAdmin(userId)           # Check role assignment
  -> If admin: comparePasswords()  # bcryptjs comparison
  -> If not admin:
       getClientAccountByEmail()   # Check client_accounts table
       verifyClientPassword()      # Verify client password
       getClientProfileByUserId()  # Load client profile
```

### Admin vs Client Detection

The credentials provider distinguishes between admin users and client users at sign-in:

- **Admin users**: Found in the `users` table with an admin role assigned via `userRoles`. Returns `{ isClient: false, isAdmin: true }`.
- **Client users**: Found in the `client_accounts` table with a linked `client_profiles` entry. Returns `{ isClient: true, isAdmin: false }`.

### Password Hashing

Passwords are hashed with `bcryptjs` using 10 salt rounds. The bcrypt module is dynamically imported to avoid bundling in the Edge Runtime:

```typescript
async function getBcrypt() {
  const bcryptjs = await import('bcryptjs');
  return bcryptjs;
}
```

### Error Codes

The `AuthErrorCode` enum (`lib/auth/auth-error-codes.ts`) defines structured error codes for client-side handling:

| Code | Description |
|------|-------------|
| `ACCOUNT_NOT_FOUND` | No account exists with the provided email |
| `INVALID_PASSWORD` | Password does not match |
| `PROFILE_NOT_FOUND` | Client profile missing for a valid account |
| `GENERIC_ERROR` | Unclassified authentication failure |
| `RATE_LIMITED` | Too many authentication attempts |
| `USE_OAUTH_PROVIDER` | Account was created via OAuth, not credentials |
| `SESSION_REFRESH_FAILED` | Session token could not be refreshed |
| `PAGE_REFRESH_FAILED` | Client-side page refresh after auth failed |

## Supabase Adapter

The template optionally integrates Supabase Auth alongside NextAuth. The provider type is determined in `lib/auth/config.ts`:

```typescript
type AuthProviderType = 'supabase' | 'next-auth' | 'both';
```

### Configuration

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

When both Supabase variables are present, the `getAuthConfig()` function automatically enables Supabase as a provider. The provider type resolution follows this priority:

1. Global configuration override (`configureAuth()`)
2. Environment-based detection via `getEnvironmentBasedConfig()`
3. Default configuration (`next-auth`)

### Client-Side Supabase

The Supabase browser client (`lib/auth/supabase/client.ts`) uses `@supabase/ssr` for SSR-compatible authentication:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const config = getAuthConfig();
  return createBrowserClient(config.supabase.url, config.supabase.anonKey);
}
```

## Environment Validation

The `validateAuthConfig()` function in `lib/auth/error-handler.ts` checks all provider-specific environment variables at startup:

- **Base variables**: `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` (warnings only, does not throw)
- **Provider variables**: Each provider is checked independently. Partially configured providers (e.g., `GOOGLE_CLIENT_ID` present but `GOOGLE_CLIENT_SECRET` missing) generate a warning log
- **CI suppression**: Warnings are suppressed during CI builds, test runs, and lint passes

The function returns a `Record<string, boolean>` indicating which providers are enabled, which is then used by `configureOAuthProviders()` to build the provider list.

## OAuth Account Linking

For OAuth sign-ins, the `signIn` callback in `lib/auth/index.ts` allows automatic account linking:

```typescript
signIn: async ({ user, account }) => {
  if (!isCredentials && account?.provider) {
    // OAuth sign-in: allow account linking
    return true;
  }
  return true;
}
```

When an OAuth user signs in for the first time, the JWT callback automatically creates a client profile via `createClientProfile()` if one does not already exist. This ensures OAuth users have a consistent profile record in the database.

## Drizzle Adapter

NextAuth uses the Drizzle adapter (`@auth/drizzle-adapter`) for database persistence, mapping to the following schema tables:

| NextAuth Concept | Database Table |
|-----------------|---------------|
| Users | `users` |
| Accounts | `accounts` |
| Sessions | `sessions` |
| Verification Tokens | `verificationTokens` |

The adapter is conditionally initialized only when `DATABASE_URL` is set and the database instance is available:

```typescript
const drizzle = isDatabaseAvailable
  ? DrizzleAdapter(getDrizzleInstance(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    })
  : undefined;
```
