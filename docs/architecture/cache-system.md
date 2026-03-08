---
id: cache-system
title: "Cache System"
sidebar_label: "Cache System"
sidebar_position: 40
---

# Cache System

## Overview

The Cache System provides centralized cache configuration and invalidation for the Next.js application. It defines consistent TTL (Time To Live) durations and tag-based cache keys used with Next.js `unstable_cache`, and offers safe cache invalidation utilities that handle edge cases like render-phase restrictions in Next.js 16.

## Architecture

The cache system is split into two modules that work together:

- **`lib/cache-config.ts`** -- Defines all cache TTL constants and cache tag generators. This is the single source of truth for how long data stays cached and what tags are used for targeted invalidation.
- **`lib/cache-invalidation.ts`** -- Provides async functions that call `revalidateTag()` to invalidate specific or all content-related caches. It wraps every call in safety logic to handle Next.js render-phase errors gracefully.

Both modules are consumed by the content layer (`lib/content.ts`) and background sync processes to keep cached data fresh after repository updates.

## API Reference

### Exports from `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Constant object defining cache durations in seconds for each data category.

#### `CACHE_TAGS`

```typescript
export const CACHE_TAGS: {
  CONTENT: 'content';
  ITEMS: 'items';
  ITEM: (slug: string) => string;       // `item:${slug}`
  CATEGORIES: 'categories';
  TAGS: 'tags';
  COLLECTIONS: 'collections';
  CONFIG: 'config';
  PAGES: 'pages';
  PAGE: (slug: string) => string;       // `page:${slug}`
  ITEMS_LOCALE: (locale: string) => string;       // `items:${locale}`
  CATEGORIES_LOCALE: (locale: string) => string;  // `categories:${locale}`
  TAGS_LOCALE: (locale: string) => string;        // `tags:${locale}`
  COLLECTIONS_LOCALE: (locale: string) => string; // `collections:${locale}`
};
```

Cache tag definitions for use with `revalidateTag()`. Static tags are plain strings; dynamic tags are factory functions that accept a slug or locale parameter.

### Exports from `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Invalidates all content-related caches (content, items, categories, tags, collections, pages) and clears the in-memory `fetchItems` cache. Should be called after a successful repository sync.

#### `invalidateItemCache(slug: string): Promise<void>`

Invalidates the cache for a single item identified by its slug.

#### `invalidatePageCache(slug: string): Promise<void>`

Invalidates the cache for a single static page identified by its slug.

## Implementation Details

**Render-phase safety**: Next.js throws an error when `revalidateTag()` is called during the React render phase. The internal `safeRevalidateTag()` wrapper catches this specific error using `isRenderPhaseError()`, which checks for multiple string patterns (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) to be resilient against Next.js error message changes across versions.

**Next.js 16 compatibility**: The `revalidateTag()` call includes a second argument `'max'` for stale-while-revalidate semantics, as required by Next.js 16.

**In-memory cache clearing**: After tag-based invalidation, `invalidateContentCaches()` also calls `clearFetchItemsCache()` to flush any in-memory data that bypasses the Next.js file-based cache.

## Configuration

No additional configuration is required. The TTL values are hardcoded constants. To change cache durations, modify the values in `CACHE_TTL`.

| Constant | Duration | Use Case |
|----------|----------|----------|
| `CONTENT` | 600s (10 min) | General content cache |
| `ITEM` | 600s (10 min) | Individual item pages |
| `CONFIG` | 600s (10 min) | Site configuration |
| `PAGES` | 600s (10 min) | Static pages |

## Usage Examples

```typescript
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';
import { unstable_cache } from 'next/cache';

// Cache a data-fetching function with tags and TTL
const getCachedItems = unstable_cache(
  async () => {
    return await fetchItemsFromSource();
  },
  ['items-list'],
  {
    tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS],
    revalidate: CACHE_TTL.CONTENT,
  }
);

// Cache a single item with a dynamic tag
const getCachedItem = unstable_cache(
  async (slug: string) => {
    return await fetchItemBySlug(slug);
  },
  ['item-detail'],
  {
    tags: [CACHE_TAGS.ITEM('my-item-slug')],
    revalidate: CACHE_TTL.ITEM,
  }
);

// Invalidate all caches after a sync
import { invalidateContentCaches } from '@/lib/cache-invalidation';

async function onSyncComplete() {
  await invalidateContentCaches();
}

// Invalidate a single item after editing
import { invalidateItemCache } from '@/lib/cache-invalidation';

async function onItemUpdated(slug: string) {
  await invalidateItemCache(slug);
}
```

## Best Practices

- Always use `CACHE_TAGS` constants instead of hardcoding tag strings to avoid typos and ensure consistency.
- Call `invalidateContentCaches()` after every successful repository sync to keep data fresh.
- Use locale-specific tags (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) when caching locale-filtered data to enable targeted invalidation.
- Do not call `revalidateTag()` directly; use the safe wrappers from `cache-invalidation.ts` to avoid render-phase crashes.
- Keep TTL values aligned across related data types to prevent stale cross-references.

## Related Modules

- [Content Library](/docs/template/architecture/content-library) -- Primary consumer of cache tags and TTL values
- [Config Manager System](./config-manager-system) -- Uses `CACHE_TAGS.CONFIG` for site configuration caching
