---
id: session-management
title: Gestión de sesiones y seguridad
sidebar_label: Sesiones
sidebar_position: 4
---

# Gestión de sesiones y seguridad

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