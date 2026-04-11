---
id: database-optimization
title: Optymalizacja bazy danych
sidebar_label: Optymalizacja bazy danych
sidebar_position: 6
---

# Optymalizacja bazy danych

Ten przewodnik omawia strategie optymalizacji baz danych przy użyciu Drizzle ORM, w tym wzorce zapytań, zarządzanie połączeniami, zapobieganie N+1, strategie indeksowania i analizę zapytań.

## Przegląd architektury

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

## Wzory zapytań Drizzle

### Podstawowy wybór z filtrowaniem

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

### Zapytania relacyjne

Użyj interfejsu API zapytań relacyjnych Drizzle, aby uniknąć problemów N+1:

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

### Wzór paginacji

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

### Operacje wsadowe

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

## Pula połączeń

### PostgreSQL (produkcja)

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

### SQLite (programowanie)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Rozmiar puli połączeń

| Środowisko | Maksymalna liczba połączeń | Uzasadnienie |
|------------|----------------|---------------|
| Rozwój | 5 | SQLite lub minimalny PG |
| Inscenizacja | 10 | Testowanie umiarkowanego obciążenia |
| Produkcja | 20 | Obsługa równoczesnych żądań |
| Bezserwerowy | 1-5 | Limity połączeń na instancję |

W przypadku rozwiązań bezserwerowych (Vercel) rozważ użycie modułów pul połączeń, takich jak PgBouncer lub sterownik bezserwerowy Neon.

## Zapobieganie N+1

### Wykrywanie zapytań N+1

Włącz rejestrowanie zapytań podczas programowania, aby wykryć wzorce N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Uważaj na wzory takie jak:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### Rozwiązywanie N+1 za pomocą ładowania wsadowego

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

## Strategie indeksowania

### Niezbędne indeksy

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

### Definicje indeksu mżawki

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

## Analiza zapytań

### Używanie WYJAŚNIJ

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Czytanie WYJAŚNIJ wyjście

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Kluczowe wskaźniki:
- **Skanowanie indeksu**: Dobrze — przy użyciu indeksu
- **Skanowanie sekwencyjne**: Ostrzeżenie — skanowanie pełnej tabeli, rozważ dodanie indeksu
- **Pętla zagnieżdżona**: Sprawdź, czy skanowanie wewnętrzne wykorzystuje indeks
- **Czas wykonania**: Docelowy czas poniżej 10 ms dla typowych zapytań

## Zoptymalizowane wzorce repozytorium

Szablon wykorzystuje wzorzec repozytorium do dostępu do danych:

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

## Względy wydajności

1. **Wybierz tylko potrzebne kolumny**: Użyj `.select({ id: items.id, title: items.title })` zamiast wybierać wszystkie kolumny.
2. **Użyj `findFirst` dla pojedynczych wyników**: Dodaje `LIMIT 1` automatycznie.
3. **Unikaj `count()` na dużych tabelach**: Weź pod uwagę przybliżone liczby lub liczniki w pamięci podręcznej.
4. **Wykorzystuj transakcje do operacji wieloetapowych**: Zapewnia spójność danych.
5. **Ustaw limity czasu zapytań**: Zapobiegaj blokowaniu puli połączeń przez niekontrolowane zapytania.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Polecenia bazy danych

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

## Rozwiązywanie problemów

### Powolne zapytania w środowisku produkcyjnym

1. Włącz rejestrowanie zapytań i identyfikuj powolne zapytania.
2. Uruchom `EXPLAIN ANALYZE` w przypadku wolnego zapytania.
3. Sprawdź, czy zapytanie korzysta z indeksu (poszukaj `Seq Scan` ostrzeżeń).
4. Dodaj indeksy złożone dla typowych kombinacji filtrów i sortowania.

### Wyczerpanie puli połączeń

1. Sprawdź ustawienie puli `max` względem oczekiwanej współbieżności.
2. Upewnij się, że połączenia wróciły do ​​puli (unikaj wstrzymywania połączeń podczas długotrwałych operacji).
3. Monitoruj aktywne/bezczynne połączenia za pomocą metryk puli.
4. W przypadku połączeń bezserwerowych użyj modułu puli połączeń.

### Konflikty migracyjne

1. Zawsze uruchamiaj `pnpm db:generate` przed `pnpm db:migrate` .
2. Przejrzyj wygenerowany kod SQL przed zastosowaniem go w środowisku produkcyjnym.
3. Użyj `pnpm db:studio` , aby sprawdzić bieżący stan schematu.

## Powiązana dokumentacja

- [Dogłębne zapoznanie się z architekturą buforowania](./caching-deep-dive.md)
- [Architektura klienta API](./api-client-architecture.md)
- [Wzorce odzyskiwania po błędach](./error-recovery-patterns.md)
