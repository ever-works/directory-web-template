---
id: database-optimization
title: 数据库优化
sidebar_label: 数据库优化
sidebar_position: 6
---

# 数据库优化

本指南涵盖了使用 Drizzle ORM 的数据库优化策略，包括查询模式、连接管理、N+1 预防、索引策略和查询分析。

## 架构概述

```
Database Access Architecture
==============================

  Server Component / API Route
       |
       v
  +-------------------+
  |   Service Layer    |  <-- lib/services/
  +-------------------+
       |
       v
  +-------------------+
  |  Repository Layer  |  <-- lib/repositories/
  +-------------------+
       |
       v
  +-------------------+
  |   Drizzle ORM     |  <-- Schema, queries, relations
  +-------------------+
       |
       v
  +-------------------+
  |  Database Driver   |  <-- PostgreSQL (prod) / SQLite (dev)
  +-------------------+
       |
       v
  +-------------------+
  |  Connection Pool   |  <-- Managed by driver
  +-------------------+
```

## Drizzle 查询模式

### 带过滤的基本选择

```typescript
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq, and, like, desc } from 'drizzle-orm';

// Simple select
const allItems = await db.select().from(items);

// Filtered select with ordering
const published = await db
  .select()
  .from(items)
  .where(and(
    eq(items.status, 'published'),
    like(items.title, `%${searchTerm}%`)
  ))
  .orderBy(desc(items.createdAt))
  .limit(20)
  .offset(0);
```

### 关系查询

使用 Drizzle 的关系查询 API 可以避免 N+1 问题：

```typescript
// Good: Single query with relations
const itemsWithCategories = await db.query.items.findMany({
  with: {
    category: true,
    tags: {
      with: {
        tag: true,
      },
    },
  },
  where: eq(items.status, 'published'),
  limit: 20,
});

// Bad: N+1 pattern (do NOT do this)
const allItems = await db.select().from(items);
for (const item of allItems) {
  // This creates N additional queries!
  const category = await db.select().from(categories)
    .where(eq(categories.id, item.categoryId));
}
```

### 分页模式

```typescript
interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function getPaginatedItems(options: PaginationOptions) {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;

  const [data, countResult] = await Promise.all([
    db.select()
      .from(items)
      .orderBy(sortOrder === 'desc' ? desc(items[sortBy]) : asc(items[sortBy]))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() })
      .from(items),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total: countResult[0].count,
      totalPages: Math.ceil(countResult[0].count / limit),
    },
  };
}
```

### 批量操作

```typescript
// Batch insert
await db.insert(items).values([
  { title: 'Item 1', status: 'draft' },
  { title: 'Item 2', status: 'draft' },
  { title: 'Item 3', status: 'draft' },
]);

// Batch update with conditions
await db.update(items)
  .set({ status: 'archived' })
  .where(and(
    eq(items.status, 'published'),
    lt(items.updatedAt, thirtyDaysAgo)
  ));

// Upsert (insert or update)
await db.insert(items)
  .values({ id: itemId, title: 'Updated Title' })
  .onConflictDoUpdate({
    target: items.id,
    set: { title: 'Updated Title', updatedAt: new Date() },
  });
```

## 连接池

### PostgreSQL（生产）

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool);
```

### SQLite（开发）

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### 连接池大小调整

|环境 |最大连接数 |理由|
|------------------------|----------------|------------|
|发展| 5 | SQLite 或最小 PG |
|分期| 10 | 10中等负载测试|
|生产| 20 |处理并发请求 |
|无服务器| 1-5 | 1-5每个实例的连接限制 |

对于无服务器 (Vercel)，请考虑使用连接池，例如 PgBouncer 或 Neon 的无服务器驱动程序。

## N+1预防

### 检测 N+1 查询

在开发中启用查询日志记录以检测 N+1 模式：

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

留意以下模式：
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### 通过批量加载求解 N+1

```typescript
// Instead of loading relations one by one, batch them:
const allItems = await db.select().from(items).limit(20);

// Collect all unique category IDs
const categoryIds = [...new Set(allItems.map(i => i.categoryId).filter(Boolean))];

// Single query for all categories
const allCategories = await db
  .select()
  .from(categories)
  .where(inArray(categories.id, categoryIds));

// Map categories to items
const categoryMap = new Map(allCategories.map(c => [c.id, c]));
const enrichedItems = allItems.map(item => ({
  ...item,
  category: categoryMap.get(item.categoryId),
}));
```

## 索引策略

### 基本指标

```sql
-- Primary lookup patterns
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_slug ON items(slug);
CREATE INDEX idx_items_created_at ON items(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_items_status_created ON items(status, created_at DESC);
CREATE INDEX idx_items_category_status ON items(category_id, status);

-- Full-text search (PostgreSQL)
CREATE INDEX idx_items_title_search ON items USING gin(to_tsvector('english', title));

-- Foreign key indexes (often missed)
CREATE INDEX idx_comments_item_id ON comments(item_id);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_tags_items_item_id ON tags_to_items(item_id);
CREATE INDEX idx_tags_items_tag_id ON tags_to_items(tag_id);
```

### 毛毛雨指数定义

```typescript
// In schema definition
import { index, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const items = pgTable('items', {
  id: text('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  categoryId: text('category_id').references(() => categories.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  statusIdx: index('idx_items_status').on(table.status),
  slugIdx: index('idx_items_slug').on(table.slug),
  statusCreatedIdx: index('idx_items_status_created').on(table.status, table.createdAt),
}));
```

## 查询分析

### 使用解释

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### 阅读 EXPLAIN 输出

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

关键指标：
- **索引扫描**：好——使用索引
- **Seq Scan**：警告——全表扫描，考虑添加索引
- **嵌套循环**：检查内部扫描是否使用索引
- **执行时间**：常见查询的目标低于 10 毫秒

## 优化的存储库模式

该模板使用存储库模式进行数据访问：

```typescript
// lib/repositories/items.repository.ts
export class ItemsRepository {
  async findPublished(options: PaginationOptions) {
    return db.query.items.findMany({
      where: eq(items.status, 'published'),
      with: { category: true },
      limit: options.limit,
      offset: (options.page - 1) * options.limit,
      orderBy: [desc(items.createdAt)],
    });
  }

  async findBySlug(slug: string) {
    return db.query.items.findFirst({
      where: eq(items.slug, slug),
      with: {
        category: true,
        tags: { with: { tag: true } },
      },
    });
  }
}
```

## 性能考虑因素

1. **仅选择需要的列**：使用 `.select({ id: items.id, title: items.title })` 而不是选择所有列。
2. **对单个结果使用1：自动添加2。
3. **在大型表上避免使用3**：考虑近似计数或缓存计数器。
4. **使用事务进行多步操作**：保证数据一致性。
5. **设置查询超时**：防止失控查询阻塞连接池。

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## 数据库命令

```bash
# Generate migrations from schema changes
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Seed development data
pnpm db:seed

# Open Drizzle Studio (visual DB browser)
pnpm db:studio
```

## 故障排除

### 生产中查询速度慢

1. 启用查询日志记录并识别慢查询。
2. 对慢速查询运行0。
3. 检查查询是否使用索引（查找 1 警告）。
4. 为常见的过滤+排序组合添加复合索引。

### 连接池耗尽

1. 检查与预期并发相关的2池设置。
2. 确保连接返回到池中（避免在长时间运行的操作中保留连接）。
3. 使用池指标监控活动/空闲连接。
4. 对于无服务器，使用连接池。

### 迁移冲突

1. 始终先运行3，然后运行4。
2. 在应用于生产之前检查生成的 SQL。
3. 使用5 检查当前模式状态。

## 相关文档

- [缓存架构深入探讨](./caching-deep-dive.md)
- [API客户端架构](./api-client-architecture.md)
- [错误恢复模式](./error-recovery-patterns.md)
