---
id: database-optimization
title: Datenbankoptimierung
sidebar_label: Datenbankoptimierung
sidebar_position: 6
---

# Datenbankoptimierung

Dieser Leitfaden behandelt Datenbankoptimierungsstrategien mit Drizzle ORM, einschließlich Abfragemustern, Verbindungsmanagement, N+1-Verhinderung, Indizierungsstrategien und Abfrageanalyse.

## Architekturübersicht

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

## Nieselregen-Abfragemuster

### Einfache Auswahl mit Filterung

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

### Relationale Abfragen

Verwenden Sie die relationale Abfrage-API von Drizzle, um N+1-Probleme zu vermeiden:

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

### Paginierungsmuster

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

### Batch-Operationen

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

## Verbindungspooling

### PostgreSQL (Produktion)

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

### SQLite (Entwicklung)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Dimensionierung des Verbindungspools

| Umwelt | Max. Verbindungen | Begründung |
|-------------|----------------|-----------|
| Entwicklung | 5 | SQLite oder minimales PG |
| Inszenierung | 10 | Moderate Belastungstests |
| Produktion | 20 | Gleichzeitige Anfragen verarbeiten |
| Serverlos | 1-5 | Verbindungslimits pro Instanz |

Erwägen Sie für Serverless (Vercel) die Verwendung von Verbindungspoolern wie PgBouncer oder dem Serverless-Treiber von Neon.

## N+1 Prävention

### Erkennen von N+1-Abfragen

Aktivieren Sie die Abfrageprotokollierung in der Entwicklung, um N+1-Muster zu erkennen:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Achten Sie auf Muster wie:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### N+1 mit Stapelladen lösen

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

## Indexierungsstrategien

### Wesentliche Indizes

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

### Definitionen des Drizzle-Index

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

## Abfrageanalyse

### Mit EXPLAIN

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### EXPLAIN-Ausgabe lesen

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Schlüsselindikatoren:
- **Index-Scan**: Gut – mithilfe eines Index
- **Seq Scan**: Warnung – vollständiger Tabellenscan, erwägen Sie das Hinzufügen eines Index
- **Verschachtelte Schleife**: Überprüfen Sie, ob der innere Scan einen Index verwendet
- **Ausführungszeit**: Ziel ist es, für häufige Abfragen weniger als 10 ms zu verwenden

## Optimierte Repository-Muster

Die Vorlage verwendet ein Repository-Muster für den Datenzugriff:

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

## Leistungsüberlegungen

1. **Nur benötigte Spalten auswählen**: Verwenden Sie `.select({ id: items.id, title: items.title })` , anstatt alle Spalten auszuwählen.
2. **Verwenden Sie `findFirst` für Einzelergebnisse**: Addiert automatisch `LIMIT 1` .
3. **Vermeiden Sie `count()` bei großen Tabellen**: Berücksichtigen Sie ungefähre Zählungen oder zwischengespeicherte Zähler.
4. **Verwenden Sie Transaktionen für mehrstufige Vorgänge**: Gewährleistet die Datenkonsistenz.
5. **Abfrage-Timeouts festlegen**: Verhindern Sie, dass außer Kontrolle geratene Abfragen den Verbindungspool blockieren.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Datenbankbefehle

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

## Fehlerbehebung

### Langsame Abfragen in der Produktion

1. Aktivieren Sie die Abfrageprotokollierung und identifizieren Sie langsame Abfragen.
2. Führen Sie `EXPLAIN ANALYZE` für die langsame Abfrage aus.
3. Überprüfen Sie, ob die Abfrage einen Index verwendet (achten Sie auf `Seq Scan` Warnungen).
4. Fügen Sie zusammengesetzte Indizes für gängige Filter- und Sortierkombinationen hinzu.

### Erschöpfung des Verbindungspools

1. Überprüfen Sie die `max` -Pool-Einstellung im Verhältnis zur erwarteten Parallelität.
2. Stellen Sie sicher, dass Verbindungen zum Pool zurückgegeben werden (vermeiden Sie das Halten von Verbindungen bei Vorgängen mit langer Laufzeit).
3. Überwachen Sie aktive/inaktive Verbindungen mit Pool-Metriken.
4. Für serverlose Verbindungen verwenden Sie einen Verbindungspooler.

### Migrationskonflikte

1. Führen Sie immer `pnpm db:generate` vor `pnpm db:migrate` durch.
2. Überprüfen Sie das generierte SQL, bevor Sie es in der Produktion anwenden.
3. Verwenden Sie `pnpm db:studio` , um den aktuellen Schemastatus zu überprüfen.

## Verwandte Dokumentation

- [Deep Dive zur Caching-Architektur](./caching-deep-dive.md)
- [API-Client-Architektur](./api-client-architecture.md)
- [Fehlerbehebungsmuster](./error-recovery-patterns.md)
