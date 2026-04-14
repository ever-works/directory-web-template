---
id: cache-system
title: "缓存系统"
sidebar_label: "缓存系统"
sidebar_position: 40
---

# 缓存系统

## 概述

缓存系统为 Next.js 应用程序提供集中式缓存配置和失效。它定义了与 Next.js `unstable_cache` 一起使用的一致的 TTL（生存时间）持续时间和基于标签的缓存键，并提供安全的缓存失效实用程序来处理 Next.js 16 中渲染阶段限制等边缘情况。

## 建筑

缓存系统分为两个协同工作的模块：

- **`lib/cache-config.ts`** -- 定义所有缓存 TTL 常量和缓存标记生成器。这是有关数据缓存多长时间以及使用哪些标签进行目标失效的唯一事实来源。
- **`lib/cache-invalidation.ts`** -- 提供调用 `revalidateTag()` 的异步函数以使特定或所有内容相关的缓存无效。它将每个调用包装在安全逻辑中，以优雅地处理 Next.js 渲染阶段错误。

这两个模块均由内容层 (`lib/content.ts`) 和后台同步进程使用，以在存储库更新后保持缓存数据最新。

## API参考

### 从 `lib/cache-config.ts` 导出

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

常量对象定义每个数据类别的缓存持续时间（以秒为单位）。

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

缓存标签定义以与 `revalidateTag()` 一起使用。静态标签是纯字符串；动态标签是接受 slug 或 locale 参数的工厂函数。

### 从 `lib/cache-invalidation.ts` 导出

#### `invalidateContentCaches(): Promise<void>`

使所有与内容相关的缓存（内容、项目、类别、标签、集合、页面）失效并清除内存中 `fetchItems` 缓存。应在成功的存储库同步后调用。

#### `invalidateItemCache(slug: string): Promise<void>`

使由其 slug 标识的单个项目的缓存无效。

#### `invalidatePageCache(slug: string): Promise<void>`

使由其 slug 标识的单个静态页面的缓存无效。

## 实施细节

**渲染阶段安全性**：在 React 渲染阶段调用 `revalidateTag()` 时，Next.js 会抛出错误。内部 `safeRevalidateTag()` 包装器使用 `isRenderPhaseError()` 捕获此特定错误，该错误检查多个字符串模式（`during render`、`render phase`、`revalidate` + `render`、`unsupported` + `render`）是否具有弹性Next.js 错误消息在不同版本之间发生变化。

**Next.js 16 兼容性**：`revalidateTag()` 调用包含第二个参数 `'max'`，用于 stale-while-revalidate 语义，如 Next.js 16 所要求。

**内存中缓存清除**：基于标记的失效后，`invalidateContentCaches()` 还会调用 `clearFetchItemsCache()` 来刷新绕过 Next.js 基于文件的缓存的任何内存中数据。

## 配置

无需额外配置。 TTL 值是硬编码常量。要更改缓存持续时间，请修改`CACHE_TTL` 中的值。

|常数|持续时间|使用案例|
|----------|----------|----------|
|`CONTENT`|600 秒（10 分钟）|通用内容缓存|
|`ITEM`|600 秒（10 分钟）|单个项目页面|
|`CONFIG`|600 秒（10 分钟）|站点配置|
|`PAGES`|600 秒（10 分钟）|静态页面|

## 使用示例

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

## 最佳实践

- 始终使用 `CACHE_TAGS` 常量而不是硬编码标记字符串，以避免拼写错误并确保一致性。
- 每次成功的存储库同步后调用 `invalidateContentCaches()` 以保持数据最新。
- 在缓存经过区域设置过滤的数据时，使用区域设置特定的标记（`ITEMS_LOCALE`、`CATEGORIES_LOCALE`）以启用目标失效。
- 不要直接致电`revalidateTag()`；使用`cache-invalidation.ts` 中的安全包装器来避免渲染阶段崩溃。
- 保持相关数据类型之间的 TTL 值一致，以防止过时的交叉引用。

## 相关模块

- [Content Library](/template/architecture/content-library) -- 缓存标签和 TTL 值的主要消费者
- [Config Manager System](./config-manager-system) -- 使用 `CACHE_TAGS.CONFIG` 进行站点配置缓存
