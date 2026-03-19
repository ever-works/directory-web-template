---
id: session-management-deep-dive
title: Session Management Deep Dive
sidebar_label: Session Management
sidebar_position: 4
---

# Session Management Deep Dive

This guide covers the session architecture including NextAuth.js integration, in-memory session caching, token extraction, cache invalidation, and server-side session utilities.

## Architecture Overview

```
Session Management Flow
========================

  Browser (Client)                    Server
  +------------------+                +------------------+
  | useSession()     | -- cookie ---> | getCachedSession |
  | (next-auth/react)|                |      |           |
  +------------------+                |      v           |
                                      | SessionCache     |
                                      |   HIT? -------> Return cached
                                      |   MISS -------> NextAuth auth()
                                      |                  |
                                      |                  v
                                      |              Cache result
                                      |              Return session
                                      +------------------+

  Token Extraction Sources:
  1. Cookie: next-auth.session-token
  2. Cookie: __Secure-next-auth.session-token
  3. Header: Authorization: Bearer <token>
  4. Header: X-Session-Token: <token>
```

## Session Cache Layer

### SessionCache Class

The `SessionCache` in `lib/auth/session-cache.ts` is a singleton in-memory cache:

```typescript
// lib/auth/session-cache.ts
class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SIZE = 1000;
  private stats = { hits: 0, misses: 0 };

  async get(identifier: string): Promise<Session | null> {
    const key = await this.generateKey(identifier);
    const cached = this.cache.get(key);

    if (!cached || this.isExpired(cached)) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.session;
  }

  async set(identifier: string, session: Session): Promise<void> {
    const key = await this.generateKey(identifier);
    this.cache.set(key, {
      session,
      expiresAt: Date.now() + this.TTL_MS,
      createdAt: Date.now(),
    });

    // 10% probabilistic cleanup
    if (Math.random() < 0.1) {
      this.cleanup();
    }
  }
}

export const sessionCache = new SessionCache();
```

### Cache Key Generation

Keys are derived by SHA-256 hashing the session token to prevent sensitive data from appearing in memory dumps:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Cache Identifier Construction

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Cached Session Retrieval

### Server Components and API Routes

The `getCachedSession` function in `lib/auth/cached-session.ts` is the primary entry point:

```typescript
// lib/auth/cached-session.ts
export async function getCachedSession(request?: Request): Promise<Session | null> {
  try {
    const sessionToken = extractSessionToken(request);

    // Cache lookup
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      const cachedSession = await sessionCache.get(identifier);
      if (cachedSession) return cachedSession;
    }

    // Cache miss: fetch from NextAuth
    const auth = await getAuth();
    const session = await auth();

    // Store in cache
    if (session && sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.set(identifier, session);
    }

    return session;
  } catch (error) {
    // Fallback to direct NextAuth call
    const auth = await getAuth();
    return await auth();
  }
}
```

### API Route Usage

```typescript
// In API route handlers
import { getCachedApiSession } from '@/lib/auth/cached-session';

export async function GET(request: NextRequest) {
  const session = await getCachedApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle authenticated request
}
```

### Server Component Usage

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Token Extraction

The `extractSessionToken` function checks multiple sources:

```typescript
function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  // 1. NextAuth session cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const sessionToken =
      cookies['next-auth.session-token'] ||
      cookies['__Secure-next-auth.session-token'] ||
      cookies['next-auth.csrf-token'];
    if (sessionToken) return sessionToken;
  }

  // 2. Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Custom session header
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) return sessionHeader;

  return null;
}
```

## Cache Invalidation

### Single Session Invalidation

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Full Cache Clear

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Cache Statistics and Monitoring

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

const stats = getSessionCacheStats();
// {
//   hits: 450,
//   misses: 50,
//   size: 123,
//   hitRate: 90.00
// }
```

### Development Logging

In development mode, the cache logs hits, misses, and invalidations automatically:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Edge Runtime Compatibility

The auth module uses dynamic imports to avoid bundling database drivers in Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Memory Management

### Cleanup Strategy

The session cache uses two cleanup mechanisms:

1. **Probabilistic cleanup (10%)**: On each `set()` call, there is a 10% chance of running full cleanup.
2. **LRU eviction**: When the cache exceeds 1,000 entries, the oldest entries (by `createdAt`) are evicted.

```typescript
private cleanup(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, cached] of this.cache.entries()) {
    if (now > cached.expiresAt) {
      this.cache.delete(key);
    }
  }

  // Enforce size limit (LRU eviction)
  if (this.cache.size > this.MAX_SIZE) {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDelete = entries.slice(0, this.cache.size - this.MAX_SIZE);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }
}
```

## Performance Considerations

1. **Cache hit rate target**: Aim for 80%+ hit rate. Lower rates suggest the TTL is too short or tokens are not being extracted properly.
2. **Memory footprint**: Each cached session is approximately 1-2 KB. At max capacity (1,000), the cache uses roughly 1-2 MB.
3. **SHA-256 overhead**: Key generation adds ~0.1ms per lookup. This is negligible compared to the database round-trip saved.
4. **Cold start penalty**: After deployment, all sessions miss the cache on first request.

## Troubleshooting

### Session not cached after login

1. Verify that the session token cookie is being sent with requests.
2. Check that `extractSessionToken` can parse the cookie format.
3. Ensure the `getCachedSession` function receives the `request` parameter.

### Cache grows without bound

1. Verify that probabilistic cleanup is running (check for cleanup log messages).
2. Force cleanup by calling `sessionCache.clear()`.
3. Monitor cache size with `getSessionCacheStats().size`.

### Stale session after role change

1. Call `invalidateSessionCache(sessionToken, userId)` after role changes.
2. The 10-minute TTL means stale data persists for up to 10 minutes without explicit invalidation.

## Related Documentation

- [Caching Architecture Deep Dive](./caching-deep-dive.md)
- [Error Recovery Patterns](./error-recovery-patterns.md)
- [Rate Limiting Architecture](./rate-limiting-architecture.md)
