---
id: database-optimization
title: Ottimizzazione della base di dati
sidebar_label: Ottimizzazione della base di dati
sidebar_position: 6
---

# Ottimizzazione del database

Questa guida copre le strategie di ottimizzazione del database utilizzando Drizzle ORM, inclusi modelli di query, gestione della connessione, prevenzione N+1, strategie di indicizzazione e analisi delle query.

## Panoramica dell'architettura

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

## Modelli di query Drizzle

### Selezione di base con filtro

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

### Query relazionali

Utilizza l'API di query relazionale di Drizzle per evitare N+1 problemi:

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

### Modello di impaginazione

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

### Operazioni batch

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

## Pool di connessioni

### PostgreSQL (produzione)

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

### SQLite (sviluppo)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Dimensionamento del pool di connessioni

| Ambiente | Connessioni massime | Motivazione |
|-------------|----------|-----------|
| Sviluppo | 5| SQLite o PG minimo |
| Messa in scena | 10| Test di carico moderato |
| Produzione | 20| Gestire richieste simultanee |
| Senza server | 1-5 | Limiti di connessione per istanza |

Per serverless (Vercel), considera l'utilizzo di pool di connessioni come PgBouncer o il driver serverless di Neon.

## Prevenzione N+1

### Rilevamento di N+1 query

Abilita la registrazione delle query in fase di sviluppo per rilevare modelli N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Fai attenzione a modelli come:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### Risolvere N+1 con caricamento batch

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

## Strategie di indicizzazione

### Indici essenziali

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

### Definizioni dell'indice Drizzle

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

## Analisi delle query

### Utilizzo di SPIEGAZIONE

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Lettura dell'output SPIEGA

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Indicatori chiave:
- **Scansione indice**: Buona: utilizza un indice
- **Seq Scan**: Avviso: scansione completa della tabella, valutare l'aggiunta di un indice
- **Loop nidificato**: controlla se la scansione interna utilizza un indice
- **Tempo di esecuzione**: target inferiore a 10 ms per le query comuni

## Modelli di repository ottimizzati

Il modello utilizza un modello di repository per l'accesso ai dati:

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

## Considerazioni sulle prestazioni

1. **Seleziona solo le colonne necessarie**: utilizza `.select({ id: items.id, title: items.title })` invece di selezionare tutte le colonne.
2. **Usa `findFirst` per risultati singoli**: aggiunge `LIMIT 1` automaticamente.
3. **Evita `count()` su tabelle di grandi dimensioni**: considera conteggi approssimativi o contatori memorizzati nella cache.
4. **Utilizza transazioni per operazioni in più passaggi**: garantisce la coerenza dei dati.
5. **Imposta timeout delle query**: impedisce alle query in fuga di bloccare il pool di connessioni.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Comandi del database

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

## Risoluzione dei problemi

### Query lente in produzione

1. Abilita la registrazione delle query e identifica le query lente.
2. Eseguire `EXPLAIN ANALYZE` sulla query lenta.
3. Controlla se la query utilizza un indice (cerca gli avvisi `Seq Scan` ).
4. Aggiungi indici compositi per combinazioni comuni di filtro + ordinamento.

### Esaurimento del pool di connessioni

1. Controllare l'impostazione del pool `max` relativa alla concorrenza prevista.
2. Assicurarsi che le connessioni vengano restituite al pool (evitare di mantenere le connessioni nelle operazioni a lunga esecuzione).
3. Monitorare le connessioni attive/inattive con le metriche del pool.
4. Per serverless, utilizzare un pooler di connessioni.

### Conflitti di migrazione

1. Esegui sempre `pnpm db:generate` prima di `pnpm db:migrate` .
2. Esaminare l'SQL generato prima di applicarlo in produzione.
3. Utilizzare `pnpm db:studio` per controllare lo stato attuale dello schema.

## Documentazione correlata

- [Approfondimento sull'architettura della memorizzazione nella cache](./caching-deep-dive.md)
- [Architettura client API](./api-client-architecture.md)
- [Modelli di ripristino degli errori](./error-recovery-patterns.md)
