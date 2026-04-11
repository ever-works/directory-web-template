---
id: database-optimization
title: Оптимизация базы данных
sidebar_label: Оптимизация базы данных
sidebar_position: 6
---

# Оптимизация базы данных

В этом руководстве рассматриваются стратегии оптимизации базы данных с использованием Drizzle ORM, включая шаблоны запросов, управление соединениями, предотвращение N+1, стратегии индексации и анализ запросов.

## Обзор архитектуры

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

## Шаблоны запросов дождя

### Базовый выбор с фильтрацией

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

### Реляционные запросы

Используйте API реляционных запросов Drizzle, чтобы избежать проблем N+1:

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

### Шаблон нумерации страниц

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

### Пакетные операции

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

## Пул соединений

### PostgreSQL (производственная версия)

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

### SQLite (в разработке)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Определение размера пула соединений

| Окружающая среда | Макс. соединения | Обоснование |
|-------------|----------------|-----------|
| Развитие | 5 | SQLite или минимальный PG |
| Постановка | 10 | Умеренное нагрузочное тестирование |
| Производство | 20 | Обработка одновременных запросов |
| Бессерверное | 1-5 | Ограничения на количество подключений на экземпляр |

Для бессерверной системы (Vercel) рассмотрите возможность использования пулов соединений, таких как PgBouncer или бессерверный драйвер Neon.

## N+1 Предотвращение

### Обнаружение запросов N+1

Включите ведение журнала запросов в разработке для обнаружения шаблонов N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Следите за такими закономерностями, как:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### Решение N+1 с пакетной загрузкой

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

## Стратегии индексирования

### Основные индексы

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

### Определения индекса моросящего дождя

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

## Анализ запросов

### Использование EXPLAIN

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Чтение вывода EXPLAIN

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Ключевые показатели:
- **Индексное сканирование**: Хорошо – с использованием индекса.
- **Seq Scan**: предупреждение – полное сканирование таблицы, рассмотрите возможность добавления индекса.
- **Вложенный цикл**: проверьте, использует ли внутреннее сканирование индекс.
- **Время выполнения**: целевое значение менее 10 мс для распространенных запросов.

## Оптимизированные шаблоны репозиториев

Шаблон использует шаблон репозитория для доступа к данным:

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

## Вопросы производительности

1. **Выберите только необходимые столбцы**: используйте `.select({ id: items.id, title: items.title })` вместо выбора всех столбцов.
2. **Используйте `findFirst` для отдельных результатов**: автоматически добавляет `LIMIT 1` .
3. **Избегайте `count()` в больших таблицах**: учитывайте приблизительные значения или кэшированные счетчики.
4. **Используйте транзакции для многоэтапных операций**: обеспечивает согласованность данных.
5. **Установите тайм-ауты запросов**. Не допускайте блокировки пула соединений неконтролируемыми запросами.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Команды базы данных

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

## Устранение неполадок

### Медленные запросы в рабочей среде

1. Включите ведение журнала запросов и определите медленные запросы.
2. Запустите `EXPLAIN ANALYZE` для медленного запроса.
3. Проверьте, использует ли запрос индекс (ищите предупреждения `Seq Scan` ).
4. Добавьте составные индексы для общих комбинаций фильтр + сортировка.

### Исчерпание пула соединений

1. Проверьте настройку пула `max` относительно ожидаемого параллелизма.
2. Убедитесь, что соединения возвращены в пул (избегайте задержки соединений в длительных операциях).
3. Отслеживайте активные/бездействующие соединения с помощью показателей пула.
4. Для бессерверной системы используйте пул соединений.

### Миграционные конфликты

1. Всегда запускайте `pnpm db:generate` перед `pnpm db:migrate` .
2. Просмотрите сгенерированный SQL-код перед применением в рабочей среде.
3. Используйте `pnpm db:studio` для проверки текущего состояния схемы.

## Сопутствующая документация

- [Подробный обзор архитектуры кэширования](./caching-deep-dive.md)
- [Архитектура клиента API](./api-client-architecture.md)
- [Шаблоны восстановления ошибок](./error-recovery-patterns.md)
