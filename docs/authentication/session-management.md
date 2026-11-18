---
id: session-management
title: Session Management & Security
sidebar_label: Sessions
sidebar_position: 4
---

# Session Management & Security

The template implements a JWT-based session strategy with an in-memory caching layer that reduces authentication overhead by up to 20x. Sessions are managed through NextAuth.js with custom callbacks for admin/client role detection, automatic client profile provisioning, and cache invalidation on user state changes.

## Session Strategy

Sessions use the JWT strategy configured in `lib/auth/index.ts`:

```typescript
session: {
  strategy: 'jwt',
  maxAge: 30 * 24 * 60 * 60,    // 30 days
  updateAge: 24 * 60 * 60,       // 24 hours
},
jwt: {
  maxAge: 30 * 24 * 60 * 60,    // 30 days
},
```

- **JWT-based**: Sessions are stored as encrypted JWTs in cookies, not in the database
- **30-day expiry**: Tokens remain valid for 30 days from creation
- **24-hour refresh**: Session data is refreshed every 24 hours to pick up user changes

## JWT Callback

The JWT callback in `lib/auth/index.ts` enriches the token with application-specific claims:

```typescript
jwt: async ({ token, user, account }) => {
  // Set userId from user object or token.sub
  if (extendedUser?.id) token.userId = extendedUser.id;
  if (!token.userId) token.userId = token.sub;

  // Set clientProfileId for client users
  if (extendedUser?.clientProfileId) token.clientProfileId = extendedUser.clientProfileId;

  // Track auth provider
  if (account?.provider) token.provider = account.provider;

  // Auto-create client profile for OAuth users
  if (isOAuthProvider && !token.clientProfileId && token.userId) {
    let clientProfile = await getClientProfileByUserId(token.userId);
    if (!clientProfile) {
      clientProfile = await createClientProfile({ ... });
    }
    token.clientProfileId = clientProfile?.id;
  }

  // Set admin flag
  if (typeof extendedUser?.isClient === 'boolean') {
    token.isAdmin = !extendedUser.isClient;
  }
}
```

### Token Claims

| Claim | Type | Description |
|-------|------|-------------|
| `userId` | `string` | User ID from the `users` table |
| `clientProfileId` | `string` | Client profile ID (for non-admin users) |
| `provider` | `string` | Authentication provider used (`credentials`, `google`, etc.) |
| `isAdmin` | `boolean` | Whether the user has admin privileges |
| `signedInAt` | `number` | When the user signed in (ms since the epoch); set on sign-in only |
| `passwordVersion` | `number \| null` | Credentials sign-ins only: `users.password_changed_at` (ms, or `null` when none is recorded) read in the same query as the password hash the sign-in checked; set on sign-in only |

### A Password Reset or Change Ends Older Sessions

A JWT cannot be revoked on the server, so without a check a session stayed valid for up to 30 days after its password was reset or changed, and a reset after a password theft did not lock the attacker out.

- `setUserPasswordHash` (`lib/db/queries/user.queries.ts`) sets `users.password_changed_at` to now on every password reset and change, for admins and clients, in the same transaction as the new hash.
- The jwt callback stamps `token.signedInAt` when a user signs in (`user` is present). It never takes the stamp from `trigger: 'update'` data, which the browser sends, and does not use `iat`, which Auth.js re-issues on every refresh.
- A credentials sign-in also binds the session to the password it checked: `authorize` (`lib/auth/credentials.ts`) returns `passwordVersion`, the `password_changed_at` value read in the same statement as the hash (`getUserByEmail` reads the whole users row for an admin; `verifyClientPasswordForSignIn` joins `users` to the credentials account for a client and also returns that account's `userId`, which `authorize` uses as the sign-in identity instead of a separate lookup by email), and the callback stores it on the token (`signInPasswordVersion`). One statement sees one committed state, and `setUserPasswordHash` writes the hash and the column in one transaction, so a sign-in whose query read the old hash also read the old version, even when it ran after the change took its time and before the change committed. No clock is compared for these sessions.
- `setUserPasswordHash` takes the change time after its hash updates hold the row locks, right before the stamp, so a concurrent change that commits later stamps a later time.
- On every later read of the session through Auth.js (`auth()`, or the session endpoint `/api/auth/session`), the jwt callback reads `password_changed_at` in the same query as `deactivatedAt`. (`getCachedSession` in `lib/auth/cached-session.ts` would skip the callback for its 10-minute TTL, but nothing calls it.) `sessionPredatesPasswordChange` (`lib/auth/password-change.ts`) ends a credentials session as soon as the column differs from its `passwordVersion`. A session from a sign-in that checked no password (OAuth, email link) ends when the change is later than `signedInAt`, and a token with neither claim (issued before this release) ends once the column is set. To end it, the callback returns `null`: `auth()` then returns no session, and the Auth.js session endpoint (`/api/auth/session`) clears the session cookie.
- After a change from `/client/settings/security`, `useChangePassword` signs the browser out and sends the user to `/auth/signin`. The reset page already ends on a "Go to Login" button.
- `proxy.ts` decodes the cookie with `getToken`, without the database or the jwt callback, so an ended session still passes its checks until the cookie is cleared: the `/api/admin/*` edge guard (any decodable token), the `/client/*` guard (any token) and the admin page guard (the `isAdmin` claim). None of them is the authorization. Every `/api/admin/*` handler calls `requireAdminSession` / `checkAdminAuth` (`auth()`), the `/client/*` layout and the APIs its pages call run `auth()`, and the admin layout's `useSession` asks `/api/auth/session`, so an ended session gets a 401 or is sent to sign in, and the session endpoint clears the cookie. The one window: the server-rendered admin survey pages (`/admin/surveys/[slug]/edit`, `/preview` and `/responses`) read the survey by slug without calling `auth()`, so their first HTML response still carries the survey definition for an ended admin session, as it does for an admin whose role was removed (whose `isAdmin` claim stays true), until the client guard redirects; the responses themselves come from `/api/admin/*`. Making those pages call `auth()` is tracked as T-2645.
- Client pages: `proxy.ts` never bounces a session away from `/auth/signin`, the page the `/client/*` pages send an ended session to, or the two redirects would loop; the sign-in page's `SessionProvider` call to `/api/auth/session` then clears the cookie. The same rule holds for `/auth/new-password`, the page the reset email links to: the reset token in its URL authorizes the reset, and a redirect would drop the link, so a user with a session (ended or active) who opens a reset link sees the reset form, not the dashboard. (Another `/auth/*` page still bounces a NextAuth token to the dashboard, which sends an ended one on to `/auth/signin`.) With `provider: 'both'`, those two pages also skip the Supabase check, with or without a NextAuth token: it would send a browser that has a Supabase user to the dashboard, whose `auth()` reads only the NextAuth session, finds none (signed out after the change, or ended by it) and sends the browser back to `/auth/signin`, a loop. That branch reads the NextAuth token with `secureCookie` set from the request protocol (`isSecureRequest`, as the `/client/*` guard does), so over HTTPS it finds the `__Secure-` cookie.
- Admin pages send an ended session to `/admin/auth/signin` instead, and need no exception: the proxy neither guards nor bounces that page, and the admin layout's `useSession` call to `/api/auth/session` clears the cookie before it redirects there.
- The column starts NULL for every user (migration 0043 does not backfill it, even for accounts whose password changed before the release), so NULL means no change has been recorded since the rollout, and sessions signed in before this release last until the user next resets or changes the password. A database error while reading it ends the session (fails closed; `PASSWORD_CHANGE_UNREADABLE` in `lib/auth/password-change.ts`): a reset after a password theft must not be undone by a failed read while the stolen session is used. The deactivation state, read in the same query, keeps its token value on that error. The cost is that a database outage signs out the sessions that are used during it.

## Session Callback

The session callback maps JWT claims to the session object available in components and API routes:

```typescript
session: async ({ session, token }) => {
  session.user.id = token.userId;
  session.user.clientProfileId = token.clientProfileId;
  session.user.provider = token.provider || 'credentials';
  session.user.isAdmin = token.isAdmin;
}
```

## Session Cache

The `SessionCache` class (`lib/auth/session-cache.ts`) provides an in-memory cache that eliminates redundant NextAuth session decoding across requests.

### Cache Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| TTL | 10 minutes | Cached sessions expire after 10 minutes |
| Max Size | 1,000 entries | LRU eviction when limit is exceeded |
| Cleanup | 10% probability | Expired entries are cleaned on random writes |

### Cache Key Generation

Cache keys are generated from session identifiers using SHA-256 hashing:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const data = new TextEncoder().encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return hashHex.substring(0, 32);
}
```

Identifiers are created from either the session token or user ID:

```typescript
function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
}
```

### Cache Statistics

The cache tracks hit/miss statistics for monitoring:

```typescript
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;  // Percentage, rounded to 2 decimal places
}
```

In development mode, cache statistics are logged periodically (10% sampling rate).

## Cached Session Retrieval

The `getCachedSession()` function in `lib/auth/cached-session.ts` replaces direct `auth()` calls:

```
getCachedSession(request)
  -> extractSessionToken(request)    # From cookies, Authorization header, or x-session-token
  -> sessionCache.get(identifier)    # Cache lookup
  -> If hit: return cached session
  -> If miss: auth()                 # Full NextAuth decode
  -> sessionCache.set(identifier)    # Store in cache
  -> return session
```

### Token Extraction Methods

Session tokens are extracted from requests in priority order:

1. **Cookies**: `next-auth.session-token` or `__Secure-next-auth.session-token`
2. **Authorization header**: `Bearer <token>`
3. **Custom header**: `x-session-token`

### API Route Usage

For API routes with request context:

```typescript
import { getCachedApiSession } from '@/lib/auth/cached-session';

export async function GET(request: NextRequest) {
  const session = await getCachedApiSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
```

### Server Component Usage

For server components without a request object:

```typescript
import { useServerSession } from '@/lib/auth/cached-session';

export default async function Page() {
  const session = await useServerSession();
}
```

## Cache Invalidation

Sessions are automatically invalidated on specific events:

### Sign-Out

```typescript
events: {
  signOut: async (event) => {
    if (token?.userId) {
      await invalidateSessionCache(undefined, token.userId);
    }
  },
}
```

### User Update

```typescript
events: {
  updateUser: async ({ user }) => {
    if (user?.id) {
      await invalidateSessionCache(undefined, user.id);
    }
  },
}
```

### Manual Invalidation

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate specific session
await invalidateSessionCache(sessionToken, userId);

// Clear all cached sessions (deployment, critical updates)
clearSessionCache();
```

## Authentication Guards

The template provides server-side guards in `lib/auth/guards.ts`:

### `requireAuth()`

Redirects unauthenticated users to `/auth/signin`:

```typescript
export default async function ProtectedPage() {
  const session = await requireAuth();
  return <div>Welcome {session.user.email}</div>;
}
```

### `requireAdmin()`

Redirects unauthenticated users to `/admin/auth/signin` and non-admin users to `/unauthorized`:

```typescript
export default async function AdminPage() {
  const session = await requireAdmin();
  return <div>Admin: {session.user.email}</div>;
}
```

### `checkIsAdmin()`

Non-redirecting admin check:

```typescript
const isAdmin = await checkIsAdmin();
return isAdmin ? <AdminContent /> : <UserContent />;
```

## Admin Guard Middleware

The `withAdminAuth` higher-order function (`lib/auth/admin-guard.ts`) wraps API route handlers:

```typescript
import { withAdminAuth } from '@/lib/auth/admin-guard';

export const GET = withAdminAuth(async (request) => {
  // Only executes if user is authenticated AND has admin role
  return NextResponse.json({ data: 'admin-only' });
});
```

This middleware performs a database query via `isAdmin()` from `lib/db/roles.ts` to verify the user's admin role assignment, returning 401 for unauthenticated requests and 403 for non-admin users.

## Callback URL Validation

The `lib/auth/validate-callback-url.ts` module prevents open redirect vulnerabilities:

- **`isValidCallbackUrl(url)`**: Validates that the URL starts with `/` and is not protocol-relative (`//`)
- **`getSafeRedirectPath(callbackUrl, fallbackPath)`**: Returns the callback URL if valid, otherwise the fallback
- **`createSafeCallbackUrl(pathname, search)`**: Constructs a URL with a 2,048-character maximum length to prevent parameter pollution

## Custom Auth Pages

NextAuth is configured with custom page routes:

| Page | Path |
|------|------|
| Sign In | `/auth/signin` |
| Sign Out | `/auth/signout` |
| Error | `/auth/error` |
| Verify Request | `/auth/verify-request` |
| New User | `/auth/register` |
