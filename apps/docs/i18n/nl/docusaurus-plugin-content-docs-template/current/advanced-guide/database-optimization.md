---
id: database-optimization
title: Database-optimalisatie
sidebar_label: Database-optimalisatie
sidebar_position: 6
---

# Database-optimalisatie

Deze gids behandelt database-optimalisatiestrategieën met behulp van Drizzle ORM, inclusief querypatronen, verbindingsbeheer, N+1-preventie, indexeringsstrategieën en queryanalyse.

## Architectuuroverzicht

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

## Motregen-querypatronen

### Basisselectie met filtering

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

### Relationele vragen

Gebruik de relationele query-API van Drizzle om N+1-problemen te voorkomen:

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

### Pagineringspatroon

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

### Batchbewerkingen

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

## Verbindingspooling

### PostgreSQL (productie)

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

### SQLite (ontwikkeling)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Grootte van verbindingspool

| Milieu | Maximale verbindingen | Reden |
|------------|---------------|----------|
| Ontwikkeling | 5 | SQLite of minimale PG |
| Enscenering | 10 | Matige belasting testen |
| Productie | 20 | Gelijktijdige verzoeken verwerken |
| Serverloos | 1-5 | Verbindingslimieten per exemplaar |

Voor serverloos (Vercel) kunt u overwegen om verbindingspoolers zoals PgBouncer of het serverloze stuurprogramma van Neon te gebruiken.

## N+1 Preventie

### N+1-query's detecteren

Schakel het loggen van query's in tijdens de ontwikkeling om N+1-patronen te detecteren:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Let op patronen zoals:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### N+1 oplossen met batchladen

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

## Indexeringsstrategieën

### Essentiële indexen

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

### Drizzle Index-definities

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

## Queryanalyse

### Met EXPLAIN

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Lezen EXPLAIN Uitvoer

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Belangrijkste indicatoren:
- **Indexscan**: goed -- met behulp van een index
- **Seq Scan**: Waarschuwing -- volledige tabelscan, overweeg een index toe te voegen
- **Geneste lus**: controleer of de binnenste scan een index gebruikt
- **Uitvoeringstijd**: streef naar minder dan 10 ms voor veelvoorkomende zoekopdrachten

## Geoptimaliseerde opslagpatronen

De sjabloon gebruikt een repositorypatroon voor gegevenstoegang:

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

## Prestatieoverwegingen

1. **Selecteer alleen de benodigde kolommen**: gebruik `.select({ id: items.id, title: items.title })` in plaats van alle kolommen te selecteren.
2. **Gebruik `findFirst` voor afzonderlijke resultaten**: Voegt automatisch `LIMIT 1` toe.
3. **Vermijd `count()` aan grote tafels**: houd rekening met geschatte aantallen of in de cache opgeslagen tellers.
4. **Gebruik transacties voor bewerkingen in meerdere stappen**: Garandeert gegevensconsistentie.
5. **Stel time-outs voor query's in**: voorkom dat op hol geslagen query's de verbindingspool blokkeren.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Databaseopdrachten

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

## Problemen oplossen

### Trage zoekopdrachten in productie

1. Schakel het loggen van zoekopdrachten in en identificeer langzame zoekopdrachten.
2. Voer `EXPLAIN ANALYZE` uit op de langzame query.
3. Controleer of de zoekopdracht een index gebruikt (let op `Seq Scan` waarschuwingen).
4. Voeg samengestelde indexen toe voor algemene filter- en sorteercombinaties.

### Uitputting van het verbindingszwembad

1. Controleer de `max` poolinstelling ten opzichte van de verwachte gelijktijdigheid.
2. Zorg ervoor dat de aansluitingen naar het zwembad worden teruggestuurd (vermijd het vasthouden van aansluitingen bij langdurig gebruik).
3. Bewaak actieve/inactieve verbindingen met poolstatistieken.
4. Gebruik voor serverloos een verbindingspooler.

### Migratieconflicten

1. Laat altijd `pnpm db:generate` draaien vóór `pnpm db:migrate` .
2. Controleer de gegenereerde SQL voordat u deze in productie toepast.
3. Gebruik `pnpm db:studio` om de huidige schemastatus te inspecteren.

## Gerelateerde documentatie

- [Caching-architectuur diepe duik](./caching-deep-dive.md)
- [API-clientarchitectuur] (./api-client-architectuur.md)
- [Foutherstelpatronen] (./error-recovery-patterns.md)
