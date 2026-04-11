---
id: database-optimization
title: Optimización de la base de datos
sidebar_label: Optimización de la base de datos
sidebar_position: 6
---

# Optimización de la base de datos

Esta guía cubre estrategias de optimización de bases de datos utilizando Drizzle ORM, incluidos patrones de consulta, administración de conexiones, prevención N+1, estrategias de indexación y análisis de consultas.

## Descripción general de la arquitectura

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

## Patrones de consulta de llovizna

### Selección básica con filtrado

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

### Consultas relacionales

Utilice la API de consulta relacional de Drizzle para evitar problemas N+1:

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

### Patrón de paginación

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

### Operaciones por lotes

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

## Agrupación de conexiones

### PostgreSQL (Producción)

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

### SQLite (Desarrollo)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Dimensionamiento del grupo de conexiones

| Medio ambiente | Conexiones máximas | Justificación |
|-------------|----------------|-----------|
| Desarrollo | 5 | SQLite o PG mínimo |
| Puesta en escena | 10 | Pruebas de carga moderada |
| Producción | 20 | Manejar solicitudes simultáneas |
| Sin servidor | 1-5 | Límites de conexión por instancia |

Para sistemas sin servidor (Vercel), considere usar agrupadores de conexiones como PgBouncer o el controlador sin servidor de Neon.

## Prevención N+1

### Detección de consultas N+1

Habilite el registro de consultas en desarrollo para detectar patrones N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Esté atento a patrones como:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### Resolviendo N+1 con carga por lotes

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

## Estrategias de indexación

### Índices esenciales

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

### Definiciones del índice de llovizna

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

## Análisis de consultas

### Usando EXPLICAR

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Lectura EXPLICAR Salida

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Indicadores clave:
- **Escaneo de índice**: Bueno, usando un índice
- **Seq Scan**: Advertencia: escaneo completo de la tabla, considere agregar un índice
- **Bucle anidado**: compruebe si el análisis interno utiliza un índice
- **Tiempo de ejecución**: objetivo inferior a 10 ms para consultas comunes

## Patrones de repositorio optimizados

La plantilla utiliza un patrón de repositorio para el acceso a datos:

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

## Consideraciones de rendimiento

1. **Seleccione solo las columnas necesarias**: use `.select({ id: items.id, title: items.title })` en lugar de seleccionar todas las columnas.
2. **Utilice `findFirst` para resultados individuales**: Agrega `LIMIT 1` automáticamente.
3. **Evite `count()` en tablas grandes**: considere recuentos aproximados o contadores almacenados en caché.
4. **Utilice transacciones para operaciones de varios pasos**: garantiza la coherencia de los datos.
5. **Establecer tiempos de espera de consulta**: evite que las consultas fuera de control bloqueen el grupo de conexiones.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Comandos de base de datos

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

## Solución de problemas

### Consultas lentas en producción.

1. Habilite el registro de consultas e identifique consultas lentas.
2. Ejecute `EXPLAIN ANALYZE` en la consulta lenta.
3. Compruebe si la consulta utiliza un índice (busque `Seq Scan` advertencias).
4. Agregue índices compuestos para combinaciones comunes de filtro + clasificación.

### Agotamiento del grupo de conexiones

1. Verifique la configuración del grupo `max` en relación con la simultaneidad esperada.
2. Asegúrese de que las conexiones se devuelvan al grupo (evite retener las conexiones en operaciones de larga duración).
3. Supervise las conexiones activas/inactivas con métricas del grupo.
4. Para sistemas sin servidor, utilice un grupo de conexiones.

### Conflictos migratorios

1. Ejecute siempre `pnpm db:generate` antes de `pnpm db:migrate` .
2. Revisar el SQL generado antes de aplicarlo en producción.
3. Utilice `pnpm db:studio` para inspeccionar el estado actual del esquema.

## Documentación relacionada

- [Análisis profundo de la arquitectura de almacenamiento en caché] (./caching-deep-dive.md)
- [Arquitectura de cliente API] (./api-client-architecture.md)
- [Patrones de recuperación de errores](./error-recovery-patterns.md)
