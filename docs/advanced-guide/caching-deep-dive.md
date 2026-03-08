---
id: caching-deep-dive
title: Caching Architecture Deep Dive
sidebar_label: Caching Architecture
sidebar_position: 1
---

# Caching Architecture Deep Dive

This guide covers the multi-layered caching architecture used across the template, from in-memory session caches to Next.js ISR and CDN-level caching strategies.

## Architecture Overview

```
Request Flow with Caching Layers
=================================

  Client Request
       |
       v
  +------------------+
  |  CDN / Edge      |  <-- Static assets, ISR pages
  +------------------+
       |
       v
  +------------------+
  |  Next.js Cache   |  <-- unstable_cache, revalidateTag
  +------------------+
       |
       v
  +------------------+
  |  In-Memory Cache |  <-- SessionCache, ServerClient cache
  +------------------+
       |
       v
  +------------------+
  |  Data Source      |  <-- Database, filesystem, APIs
  +------------------+
```

## Layer 1: Content Cache (Next.js `unstable_cache`)

The template uses centralized cache configuration defined in `lib/cache-config.ts` to manage TTL and cache tags for all content data.

### Cache TTL Configuration

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Cache Tags for Targeted Invalidation

Cache tags enable fine-grained invalidation without flushing the entire cache:

```typescript
// lib/cache-config.ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  PAGE: (slug: string) => `page:${slug}`,
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
} as const;
```

### Using `unstable_cache` in Content Functions

Content loading functions in `lib/content.ts` wrap filesystem reads with `unstable_cache`:

```typescript
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from './cache-config';

const getCachedItems = unstable_cache(
  async (locale: string) => {
    // Expensive filesystem read
    return await loadItemsFromDisk(locale);
  },
  ['items'],
  {
    tags: [CACHE_TAGS.ITEMS, CACHE_TAGS.CONTENT],
    revalidate: CACHE_TTL.CONTENT,
  }
);
```

## Layer 2: Session Cache (In-Memory)

The `SessionCache` class in `lib/auth/session-cache.ts` eliminates redundant authentication overhead by caching decoded sessions in memory.

### How It Works

```
Session Lookup Flow
====================

  API Request
       |
       v
  Extract session token (cookie / header)
       |
       v
  SHA-256 hash token -> cache key
       |
       v
  +-- Cache HIT? --+
  |  YES           |  NO
  |  Return cached |  Call NextAuth auth()
  |  session       |  Cache result
  +----------------+  Return session
```

### Key Design Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| TTL | 10 minutes | Balance between freshness and overhead reduction |
| Max size | 1,000 entries | Prevent memory leaks on long-running servers |
| Key hashing | SHA-256 | Prevent token leakage in memory dumps |
| Cleanup | 10% probabilistic | Amortize cleanup cost across requests |
| Eviction | LRU (oldest-first) | Remove least recently created entries |

### Cache Invalidation

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Layer 3: Server API Client Cache

The `ServerClient` in `lib/api/server-api-client.ts` includes a built-in LRU cache for GET requests:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Cache behavior:
- **Only GET requests** are cached (mutations bypass the cache)
- **Requests with AbortSignal** are never cached
- **LRU eviction** removes the oldest entry when the cache reaches 100 items
- **TTL-based expiry** invalidates entries after 5 minutes

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Cache Invalidation Strategy

The `lib/cache-invalidation.ts` module provides safe invalidation that handles Next.js render-phase restrictions:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

The `safeRevalidateTag` wrapper detects render-phase errors and logs warnings instead of crashing:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      throw error;
    }
  }
}
```

## ISR (Incremental Static Regeneration)

Pages use ISR through the `revalidate` export or per-function TTLs:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Performance Considerations

1. **Session cache hit rate**: Monitor using `getSessionCacheStats()`. A healthy rate is above 80%.
2. **Content cache**: The 10-minute TTL means content updates take up to 10 minutes to appear. Force invalidation after sync for immediate updates.
3. **Memory usage**: The session cache caps at 1,000 entries (roughly 1-2 MB). The server client cache caps at 100 entries.
4. **Cold starts**: First request after deployment always misses all in-memory caches.

### Monitoring Cache Performance

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Configuration Reference

| Cache Layer | TTL | Max Size | Eviction | Invalidation |
|-------------|-----|----------|----------|--------------|
| Content (unstable_cache) | 600s | Unlimited | Tag-based | `revalidateTag()` |
| Session (in-memory) | 10 min | 1,000 | LRU + TTL | `invalidateSessionCache()` |
| Server API client | 5 min | 100 | LRU + TTL | `clearCache()` |
| ISR pages | 600s | Disk-based | Time-based | `revalidatePath()` |

## Troubleshooting

### Stale data after content update

1. Check that `invalidateContentCaches()` is called after repository sync completes.
2. Verify the cache tags match between the cached function and the invalidation call.
3. For immediate invalidation, call `clearFetchItemsCache()` to clear the in-memory content cache.

### Session cache misses on every request

1. Verify the session token is present in cookies or headers.
2. Check that `extractSessionToken` can parse your cookie format.
3. Ensure the token cookie names match: `next-auth.session-token` or `__Secure-next-auth.session-token`.

### Memory usage growing

1. The session cache self-limits to 1,000 entries with probabilistic cleanup.
2. Force cleanup: `sessionCache.clear()`.
3. Monitor with `getSessionCacheStats().size`.

## Related Documentation

- [Session Management Deep Dive](./session-management-deep-dive.md)
- [API Client Architecture](./api-client-architecture.md)
- [Database Optimization](./database-optimization.md)
