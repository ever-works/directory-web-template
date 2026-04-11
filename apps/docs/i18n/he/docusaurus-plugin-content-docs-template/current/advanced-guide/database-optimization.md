---
id: database-optimization
title: אופטימיזציה של מסדי נתונים
sidebar_label: אופטימיזציה של מסדי נתונים
sidebar_position: 6
---

# אופטימיזציה של מסדי נתונים

מדריך זה מכסה אסטרטגיות אופטימיזציה של מסד נתונים באמצעות Drizzle ORM, כולל דפוסי שאילתות, ניהול חיבורים, מניעת N+1, אסטרטגיות אינדקס וניתוח שאילתות.

## סקירה כללית של אדריכלות

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

## דפוסי שאילתות טפטוף

### בחירה בסיסית עם סינון

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

### שאילתות יחסים

השתמש בממשק ה-API של השאילתה ההתייחסותית של Drizzle כדי למנוע בעיות N+1:

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

### דפוס עימוד

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

### פעולות אצווה

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

## איחוד חיבורים

### PostgreSQL (הפקה)

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

### SQLite (פיתוח)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### גודל בריכת חיבור

| סביבה | מקסימום חיבורים | נימוק |
|------------|----------------|--------|
| פיתוח | 5 | SQLite או PG מינימלי |
| בימוי | 10 | בדיקת עומס בינוני |
| הפקה | 20 | טיפול בבקשות במקביל |
| ללא שרת | 1-5 | מגבלות חיבור לכל מופע |

עבור חסרי שרתים (Vercel), שקול להשתמש במאגרי חיבורים כמו PgBouncer או מנהל ההתקן ללא שרת של Neon.

## N+1 מניעה

### זיהוי N+1 שאילתות

אפשר פיתוח התחברות לשאילתות כדי לזהות תבניות N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

שימו לב לתבניות כמו:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### פתרון N+1 עם טעינת אצווה

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

## אסטרטגיות אינדקס

### אינדקסים חיוניים

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

### הגדרות אינדקס טפטוף

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

## ניתוח שאילתות

### באמצעות EXPLAIN

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### קריאה הסבר פלט

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

אינדיקטורים מרכזיים:
- **סריקת אינדקס**: טוב -- באמצעות אינדקס
- **סריקת Seq**: אזהרה -- סריקת טבלה מלאה, שקול להוסיף אינדקס
- **לולאה מקוננת**: בדוק אם הסריקה הפנימית משתמשת באינדקס
- **זמן ביצוע**: יעד מתחת ל-10 אלפיות השנייה עבור שאילתות נפוצות

## דפוסי מאגר אופטימליים

התבנית משתמשת בדפוס מאגר לגישה לנתונים:

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

## שיקולי ביצועים

1. **בחר רק עמודות נחוצות**: השתמש ב- `.select({ id: items.id, title: items.title })` במקום לבחור בכל העמודות.
2. **השתמש ב- `findFirst` לתוצאות בודדות**: מוסיף `LIMIT 1` באופן אוטומטי.
3. **הימנע מ- `count()` בטבלאות גדולות**: שקול ספירות משוערות או מונים בקובץ שמור.
4. **השתמש בעסקאות לפעולות מרובות שלבים**: מבטיח עקביות נתונים.
5. **הגדר זמן קצוב לשאילתה**: מנע משאילתות נמלטות לחסום את מאגר החיבורים.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## פקודות מסד נתונים

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

## פתרון בעיות

### שאילתות איטיות בייצור

1. אפשר רישום שאילתות וזיהוי שאילתות איטיות.
2. הפעל את `EXPLAIN ANALYZE` על השאילתה האיטית.
3. בדוק אם השאילתה משתמשת באינדקס (חפש אזהרות `Seq Scan` ).
4. הוסף אינדקסים מרוכבים לשילובי פילטר + מיון נפוצים.

### מיצוי בריכת חיבור

1. בדוק את הגדרת הבריכה `max` ביחס לציפוי במקביל.
2. ודא שהחיבורים מוחזרים לבריכה (הימנע מהחזקת חיבורים בפעולות ארוכות טווח).
3. מעקב אחר חיבורים פעילים/בטלים עם מדדי מאגר.
4. לחסרי שרת, השתמש ב-pooler של חיבורים.

### התנגשויות הגירה

1. הפעל תמיד את `pnpm db:generate` לפני `pnpm db:migrate` .
2. סקירת SQL שנוצר לפני יישום בייצור.
3. השתמש ב- `pnpm db:studio` כדי לבדוק את מצב הסכימה הנוכחי.

## תיעוד קשור

- [Caching Architecture Deep Dive](./caching-deep-dive.md)
- [API Client Architecture](./api-client-architecture.md)
- [דפוסי שחזור שגיאות](./error-recovery-patterns.md)
