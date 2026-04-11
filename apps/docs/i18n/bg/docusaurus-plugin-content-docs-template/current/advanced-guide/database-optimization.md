---
id: database-optimization
title: Оптимизация на бази данни
sidebar_label: Оптимизация на бази данни
sidebar_position: 6
---

# Оптимизация на бази данни

Това ръководство обхваща стратегии за оптимизиране на бази данни с помощта на Drizzle ORM, включително модели на заявки, управление на връзката, предотвратяване на N+1, стратегии за индексиране и анализ на заявки.

## Преглед на архитектурата

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

## Шаблони за заявка за дъжд

### Основен избор с филтриране

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

### Релационни заявки

Използвайте API за релационни заявки на Drizzle, за да избегнете проблеми с N+1:

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

### Модел на пагинация

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

### Пакетни операции

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

## Обединяване на връзки

### PostgreSQL (производство)

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

### SQLite (Разработка)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Оразмеряване на пула за връзки

| Околна среда | Макс. връзки | Обосновка |
|-------------|----------------|-----------|
| Развитие | 5 | SQLite или минимален PG |
| Постановка | 10 | Тестване с умерено натоварване |
| Производство | 20 | Обработка на едновременни заявки |
| Без сървър | 1-5 | Ограничения на връзката за екземпляр |

За сървър без сървър (Vercel), обмислете използването на пулери за свързване като PgBouncer или безсървърния драйвер на Neon.

## N+1 Превенция

### Откриване на N+1 заявки

Активирайте записването на заявки в разработката, за да откриете N+1 модели:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Следете за модели като:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### Решаване на N+1 с пакетно зареждане

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

## Стратегии за индексиране

### Основни индекси

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

### Дефиниции на индекса на дъжд

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

## Анализ на заявка

### Използване на EXPLAIN

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Четене EXPLAIN Изход

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Ключови индикатори:
- **Индексно сканиране**: Добре -- използване на индекс
- **Seq Scan**: Предупреждение -- пълно сканиране на таблица, помислете за добавяне на индекс
- **Вложен цикъл**: Проверете дали вътрешното сканиране използва индекс
- **Време за изпълнение**: Цел под 10ms за често срещани заявки

## Оптимизирани модели на хранилище

Шаблонът използва модел на хранилище за достъп до данни:

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

## Съображения за производителност

1. **Изберете само необходимите колони**: Използвайте `.select({ id: items.id, title: items.title })` вместо да избирате всички колони.
2. **Използвайте `findFirst` за единични резултати**: Добавя `LIMIT 1` автоматично.
3. **Избягвайте `count()` на големи таблици**: Помислете за приблизителни преброявания или кеширани броячи.
4. **Използване на транзакции за многоетапни операции**: Осигурява последователност на данните.
5. **Задаване на времеви изчаквания на заявки**: Предотвратете блокиране на пула за връзка от избягали заявки.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Команди за бази данни

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

## Отстраняване на неизправности

### Бавни заявки в производството

1. Разрешете записването на заявки и идентифицирайте бавните заявки.
2. Изпълнете `EXPLAIN ANALYZE` на бавната заявка.
3. Проверете дали заявката използва индекс (потърсете `Seq Scan` предупреждения).
4. Добавяне на съставни индекси за общи комбинации от филтър + сортиране.

### Изчерпване на пула за връзки

1. Проверете настройката на пула `max` спрямо очакваната едновременност.
2. Уверете се, че връзките са върнати към пула (избягвайте задържането на връзки при продължителни операции).
3. Наблюдавайте активни/неактивни връзки с показатели на пула.
4. За сървър без сървър, използвайте пул за свързване.

### Миграционни конфликти

1. Винаги изпълнявайте `pnpm db:generate` преди `pnpm db:migrate` .
2. Прегледайте генерирания SQL преди да приложите в производството.
3. Използвайте `pnpm db:studio` , за да проверите текущото състояние на схемата.

## Свързана документация

- [Дълбоко потапяне в кеширащата архитектура](./caching-deep-dive.md)
- [API клиентска архитектура](./api-client-architecture.md)
- [Модели за възстановяване на грешки](./error-recovery-patterns.md)
