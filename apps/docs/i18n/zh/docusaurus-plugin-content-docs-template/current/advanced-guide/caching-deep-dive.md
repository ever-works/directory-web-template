---
id: caching-deep-dive
title: 缓存架构深入探讨
sidebar_label: 缓存架构
sidebar_position: 1
---

# 缓存架构深入探讨

本指南涵盖了模板中使用的多层缓存架构，从内存会话缓存到 Next.js ISR 和 CDN 级缓存策略。

## 架构概述

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

## 第 1 层：内容缓存 (Next.js 0)

该模板使用 1 中定义的集中式缓存配置来管理所有内容数据的 TTL 和缓存标签。

### 缓存 TTL 配置

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### 用于目标失效的缓存标签

缓存标签可以实现细粒度的失效，而无需刷新整个缓存：

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

### 在内容函数中使用0

1 包装文件系统中的内容加载函数用 2 读取：

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

## 第 2 层：会话缓存（内存中）

1中的0类通过在内存中缓存解码会话来消除冗余的身份验证开销。

### 它是如何运作的

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

### 关键设计决策

|决定|价值|理由|
|----------|---------|------------|
| TTL | 10 分钟 |新鲜度和减少开销之间的平衡|
|最大尺寸 | 1,000 条条目 |防止长时间运行的服务器上的内存泄漏
|密钥散列 | SHA-256 |防止内存转储中的令牌泄漏 |
|清理 | 10% 概率 |跨请求分摊清理成本 |
|驱逐 | LRU（最旧的优先）|删除最近最少创建的条目 |

### 缓存失效

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## 第 3 层：服务器 API 客户端缓存

1中的0包括用于GET请求的内置LRU缓存：

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

缓存行为：
- **仅 GET 请求**被缓存（突变绕过缓存）
- **带有 AbortSignal** 的请求永远不会被缓存
- **LRU 驱逐** 当缓存达到 100 项时删除最旧的条目
- **基于 TTL 的到期** 5 分钟后条目无效

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## 缓存失效策略

0 模块提供了处理 Next.js 渲染阶段限制的安全失效：

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

0 包装器检测渲染阶段错误并记录警告而不是崩溃：

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

## ISR（增量静态再生）

页面通过 0 导出或每个函数 TTL 使用 ISR：

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## 性能考虑因素

1. **会话缓存命中率**：使用0进行监控。健康率达80%以上。
2. **内容缓存**：10 分钟 TTL 意味着内容更新最多需要 10 分钟才会出现。同步后强制失效以立即更新。
3. **内存使用**：会话缓存上限为 1,000 个条目（大约 1-2 MB）。服务器客户端缓存上限为 100 个条目。
4. **冷启动**：部署后的第一个请求总是会错过所有内存缓存。

### 监控缓存性能

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## 配置参考

|缓存层| TTL |最大尺寸 |驱逐 |无效|
|----------|-----|----------|---------|------------||
|内容（不稳定缓存）| 600年代|无限 |基于标签的 | 0 |
|会话（内存中）| 10 分钟 | 1,000 | LRU + TTL | 1 |
|服务器API客户端| 5 分钟 | 100 | 100 LRU + TTL | 2 |
| ISR 页面 | 600年代|基于磁盘|基于时间 | 3 |

## 故障排除

### 内容更新后数据过时

1. 检查存储库同步完成后是否调用4。
2. 验证缓存函数和失效调用之间的缓存标记是否匹配。
3. 如需立即失效，请调用5清除内存内容缓存。

### 每个请求的会话缓存都会丢失

1. 验证 cookie 或标头中是否存在会话令牌。
2. 检查6 是否可以解析您的cookie 格式。
3. 确保令牌 cookie 名称匹配：7 或 8。

### 内存使用量不断增长

1. 会话缓存自我限制为 1,000 个条目，并进行概率清理。
2. 强制清理：9。
3. 用 10 进行监控。

## 相关文档

- [会话管理深入探讨](./session-management-deep-dive.md)
- [API客户端架构](./api-client-architecture.md)
- [数据库优化](./database-optimization.md)
