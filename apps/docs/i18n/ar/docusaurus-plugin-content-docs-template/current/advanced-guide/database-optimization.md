---
id: database-optimization
title: تحسين قاعدة البيانات
sidebar_label: تحسين قاعدة البيانات
sidebar_position: 6
---

# تحسين قاعدة البيانات

يغطي هذا الدليل استراتيجيات تحسين قاعدة البيانات باستخدام Drizzle ORM، بما في ذلك أنماط الاستعلام وإدارة الاتصال ومنع N+1 واستراتيجيات الفهرسة وتحليل الاستعلام.

## نظرة عامة على الهندسة المعمارية

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

## أنماط الاستعلام الرذاذ

### التحديد الأساسي مع التصفية

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

### الاستعلامات العلائقية

استخدم واجهة برمجة التطبيقات للاستعلام العلائقي الخاصة بـ Drizzle لتجنب مشكلات N+1:

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

### نمط ترقيم الصفحات

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

### عمليات الدفعة

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

## تجمع الاتصال

### PostgreSQL (الإنتاج)

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

### SQLite (تطوير)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### تغيير حجم تجمع الاتصال

| البيئة | اتصالات ماكس | الأساس المنطقي |
|-------------|----------------|-----------|
| التنمية | 5 | SQLite أو الحد الأدنى من PG |
| التدريج | 10 | اختبار الحمل المعتدل |
| الإنتاج | 20 | التعامل مع الطلبات المتزامنة |
| بدون خادم | 1-5 | حدود الاتصال لكل مثيل |

بالنسبة إلى بدون خادم (Vercel)، فكر في استخدام مجمعات الاتصال مثل PgBouncer أو برنامج التشغيل بدون خادم الخاص بـ Neon.

## الوقاية N+1

### الكشف عن استعلامات N+1

تمكين تسجيل الاستعلام أثناء التطوير لاكتشاف أنماط N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

انتبه لأنماط مثل:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### حل N+1 مع تحميل الدفعة

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

## استراتيجيات الفهرسة

### المؤشرات الأساسية

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

### تعريفات مؤشر الرذاذ

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

## تحليل الاستعلام

### استخدام الشرح

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### قراءة شرح الإخراج

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

المؤشرات الرئيسية:
- **مسح الفهرس**: جيد - باستخدام فهرس
- **Seq Scan**: تحذير - فحص كامل للجدول، فكر في إضافة فهرس
- **حلقة متداخلة**: تحقق مما إذا كان الفحص الداخلي يستخدم فهرسًا
- **وقت التنفيذ**: الهدف أقل من 10 مللي ثانية للاستعلامات الشائعة

## أنماط المستودعات المحسنة

يستخدم القالب نمط مستودع للوصول إلى البيانات:

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

## اعتبارات الأداء

1. **تحديد الأعمدة المطلوبة فقط**: استخدم `.select({ id: items.id, title: items.title })` بدلاً من تحديد كافة الأعمدة.
2. **استخدم `findFirst` للحصول على نتائج فردية**: يضيف `LIMIT 1` تلقائيًا.
3. **تجنب `count()` في الجداول الكبيرة**: فكر في الأعداد التقريبية أو العدادات المخزنة مؤقتًا.
4. **استخدام المعاملات لعمليات متعددة الخطوات**: يضمن اتساق البيانات.
5. **ضبط مهلة الاستعلام**: منع الاستعلامات الهاربة من حظر تجمع الاتصال.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## أوامر قاعدة البيانات

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

## استكشاف الأخطاء وإصلاحها

### استعلامات بطيئة في الإنتاج

1. تمكين تسجيل الاستعلامات وتحديد الاستعلامات البطيئة.
2. قم بتشغيل `EXPLAIN ANALYZE` في الاستعلام البطيء.
3. تحقق مما إذا كان الاستعلام يستخدم فهرسًا (ابحث عن التحذيرات 1).
4. قم بإضافة فهارس مركبة لمجموعات التصفية والفرز الشائعة.

### استنفاد تجمع الاتصال

1. تحقق من إعداد التجمع بالنسبة للتزامن المتوقع.
2. تأكد من إرجاع الاتصالات إلى المجمع (تجنب الاحتفاظ بالاتصالات في العمليات طويلة الأمد).
3. مراقبة الاتصالات النشطة/الخاملة باستخدام مقاييس التجمع.
4. بالنسبة إلى الخدمة بدون خادم، استخدم مجمع الاتصال.

### صراعات الهجرة

1. قم دائمًا بتشغيل "3" قبل "4".
2. قم بمراجعة SQL التي تم إنشاؤها قبل تطبيقها في الإنتاج.
3. استخدم `pnpm db:studio` لفحص حالة المخطط الحالية.

## الوثائق ذات الصلة

- [التعمق في بنية التخزين المؤقت](./caching-deep-dive.md)
- [بنية عميل API](./api-client-architecture.md)
- [أنماط استرداد الأخطاء](./error-recovery-patterns.md)
