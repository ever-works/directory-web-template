---
id: database-optimization
title: Otimização de banco de dados
sidebar_label: Otimização de banco de dados
sidebar_position: 6
---

# Otimização de banco de dados

Este guia cobre estratégias de otimização de banco de dados usando Drizzle ORM, incluindo padrões de consulta, gerenciamento de conexão, prevenção N+1, estratégias de indexação e análise de consulta.

## Visão geral da arquitetura

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

## Padrões de consulta de garoa

### Seleção básica com filtragem

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

### Consultas relacionais

Use a API de consulta relacional do Drizzle para evitar problemas N+1:

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

### Padrão de paginação

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

### Operações em lote

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

## Pool de conexões

### PostgreSQL (Produção)

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

### SQLite (Desenvolvimento)

```typescript
// lib/db/index.ts (development)
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database('dev.db');
export const db = drizzle(sqlite);
```

### Dimensionamento do pool de conexões

| Meio Ambiente | Máximo de conexões | Justificativa |
|------------|----------------|-----------|
| Desenvolvimento | 5 | SQLite ou PG mínimo |
| Encenação | 10 | Teste de carga moderada |
| Produção | 20 | Lidar com solicitações simultâneas |
| Sem servidor | 1-5 | Limites de conexão por instância |

Para serverless (Vercel), considere usar poolers de conexão como PgBouncer ou o driver serverless do Neon.

## Prevenção N+1

### Detectando consultas N+1

Habilite o registro de consultas em desenvolvimento para detectar padrões N+1:

```typescript
const db = drizzle(pool, {
  logger: {
    logQuery(query, params) {
      console.log('[DB]', query.substring(0, 100));
    },
  },
});
```

Observe padrões como:
```
[DB] SELECT * FROM items LIMIT 20
[DB] SELECT * FROM categories WHERE id = $1   -- repeated 20 times
[DB] SELECT * FROM categories WHERE id = $1
[DB] SELECT * FROM categories WHERE id = $1
...
```

### Resolvendo N+1 com carregamento em lote

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

## Estratégias de indexação

### Índices Essenciais

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

### Definições do índice de garoa

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

## Análise de consulta

### Usando EXPLAIN

```typescript
// PostgreSQL EXPLAIN
const explanation = await db.execute(
  sql`EXPLAIN ANALYZE SELECT * FROM items WHERE status = 'published' ORDER BY created_at DESC LIMIT 20`
);

console.log(explanation.rows);
```

### Lendo a saída EXPLAIN

```
Limit  (cost=0.42..1.23 rows=20 width=512) (actual time=0.034..0.089 rows=20 loops=1)
  ->  Index Scan using idx_items_status_created on items  (cost=0.42..45.67 rows=1200 width=512)
        Index Cond: (status = 'published')
Planning Time: 0.123 ms
Execution Time: 0.134 ms
```

Indicadores principais:
- **Varredura de índice**: Bom – usando um índice
- **Seq Scan**: Aviso – verificação completa da tabela, considere adicionar um índice
- **Nested Loop**: Verifique se a varredura interna usa um índice
- **Tempo de execução**: meta abaixo de 10 ms para consultas comuns

## Padrões de repositório otimizados

O modelo usa um padrão de repositório para acesso a dados:

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

## Considerações de desempenho

1. **Selecione apenas as colunas necessárias**: Use `.select({ id: items.id, title: items.title })` em vez de selecionar todas as colunas.
2. **Use `findFirst` para resultados únicos**: Adiciona `LIMIT 1` automaticamente.
3. **Evite `count()` em tabelas grandes**: Considere contagens aproximadas ou contadores em cache.
4. **Use transações para operações em várias etapas**: Garante a consistência dos dados.
5. **Definir tempos limite de consulta**: evita que consultas descontroladas bloqueiem o pool de conexões.

```typescript
// Transaction example
await db.transaction(async (tx) => {
  await tx.insert(items).values(newItem);
  await tx.insert(auditLog).values({ action: 'create', itemId: newItem.id });
});
```

## Comandos de banco de dados

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

## Solução de problemas

### Consultas lentas na produção

1. Habilite o registro de consultas e identifique consultas lentas.
2. Execute `EXPLAIN ANALYZE` na consulta lenta.
3. Verifique se a consulta utiliza índice (procure pelos avisos `Seq Scan` ).
4. Adicione índices compostos para combinações comuns de filtro + classificação.

### Esgotamento do pool de conexões

1. Verifique a configuração do pool `max` em relação à simultaneidade esperada.
2. Certifique-se de que as conexões sejam retornadas ao pool (evite reter conexões em operações de longa duração).
3. Monitore conexões ativas/inativas com métricas de pool.
4. Para sem servidor, use um pooler de conexões.

### Conflitos de migração

1. Sempre execute `pnpm db:generate` antes de `pnpm db:migrate` .
2. Revise o SQL gerado antes de aplicar na produção.
3. Use `pnpm db:studio` para inspecionar o estado atual do esquema.

## Documentação Relacionada

- [Aprofundamento da arquitetura de cache](./caching-deep-dive.md)
- [Arquitetura de cliente API](./api-client-architecture.md)
- [Padrões de recuperação de erros](./error-recovery-patterns.md)
