---
id: drizzle-patterns
title: "Padrões ORM de chuvisco"
sidebar_label: "Padrões de chuvisco"
sidebar_position: 13
---

# Padrões ORM de chuvisco

O modelo usa Drizzle ORM com o dialeto PostgreSQL (`drizzle-orm/postgres-js`). Esta página aborda convenções de definição de esquema, tipos de coluna, estratégias de índice, definições de relação, fluxo de trabalho de migração e os padrões do construtor de consultas usados ​​em toda a base de código.

## Definição de esquema (`lib/db/schema.ts`)

### Estrutura da tabela

As tabelas são definidas com `pgTable` e seguem um padrão consistente:

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').unique(),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    createdAtIndex: index('users_created_at_idx').on(table.createdAt)
  })
);
```

### Uso do tipo de coluna

|Tipo de chuvisco|Tipo PostgreSQL|Usado para|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|IDs, e-mails, nomes, slugs, URLs|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Campos de data retornados como JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Campos de data com modo padrão|
|`boolean('col')`|`BOOLEAN`|Sinalizadores (isAdmin, isActive, etc.)|
|`integer('col')`|`INTEGER`|Contadores numéricos, OAuth expires_at|
|`serial('col')`|`SERIAL`|IDs de incremento automático|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Strings com comprimento restrito|
|`jsonb('col')`|`JSONB`|Metadados estruturados|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Coordenadas de latitude/longitude|

### Chaves primárias UUID

Todas as tabelas usam colunas `text` com `crypto.randomUUID()` como função padrão:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Colunas Enum

As enumerações de string são definidas in-line na coluna:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Chaves primárias compostas

Unir tabelas usa `primaryKey` com múltiplas colunas:

```typescript
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow()
  },
  (table) => ({
    rolePermissionPk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);
```

### Chaves Estrangeiras

Chaves estrangeiras usam inline `.references()` com exclusão em cascata:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Definições de índice

Os índices são definidos no terceiro argumento de `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Padrões de índice comuns:
- `createdAt` índices na maioria das tabelas para classificação baseada em tempo
- Índices de status/sinalização para consultas de filtro
- Índices de e-mail para consultas de pesquisa
- Índices de provedores para consultas de contas de autenticação

### Verifique as restrições

Usado para validação de domínio no nível do banco de dados:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Inferência de tipo

O Drizzle infere automaticamente os tipos TypeScript das definições da tabela:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Esses tipos inferidos são exportados diretamente de `lib/db/schema.ts` e usados em toda a camada de consulta.

## Relações (`lib/db/migrations/relations.ts`)

As relações são definidas separadamente usando o auxiliar `relations()` para a API de consulta relacional do Drizzle:

```typescript
import { relations } from "drizzle-orm/relations";

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  activityLogs: many(activityLogs),
  clientProfiles: many(clientProfiles),
  favorites: many(favorites),
  notifications: many(notifications),
  paymentAccounts: many(paymentAccounts),
  subscriptions: many(subscriptions),
  userRoles: many(userRoles),
}));

export const clientProfilesRelations = relations(clientProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [clientProfiles.userId],
    references: [users.id]
  }),
  comments: many(comments),
  votes: many(votes),
}));
```

### Tipos de relacionamento

|Ajudante|Cardinalidade|Exemplo|
|--------|------------|---------|
|`one()`|Muitos para um|`clientProfile -> user`|
|`many()`|Um para muitos|`user -> accounts`|

## Fluxo de trabalho de migração

### Configuração do kit de chuvisco

```typescript
// drizzle.config.ts
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Comandos de migração

|Comando|Descrição|
|---------|-------------|
|`pnpm db:generate`|Gere arquivos de migração SQL a partir de alterações de esquema|
|`pnpm db:migrate`|Aplicar migrações pendentes ao banco de dados|
|`pnpm db:seed`|Propagar o banco de dados com dados iniciais|
|`pnpm db:studio`|Abra o Drizzle Studio para gerenciamento visual de banco de dados|

### Corredor de migração

A função `runMigrations()` em `lib/db/migrate.ts` é idempotente e segura para ser chamada em cada inicialização:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

O Drizzle rastreia migrações aplicadas na tabela `drizzle.__drizzle_migrations` e executa apenas novas.

## Padrões do Construtor de Consultas

### Selecione com onde

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Inserir com Retorno

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Atualizar com retorno

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Excluir com retorno

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (em conflito)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### SQL Dinâmico

Expressões SQL brutas são usadas para condições e agregações complexas:

```typescript
import { sql } from 'drizzle-orm';

// Conditional SUM
sql<number>`SUM(CASE WHEN vote_type = 'upvote' THEN 1 ELSE -1 END)`

// ILIKE search
sql`${clientProfiles.name} ILIKE ${`%${search}%`}`

// COALESCE with subquery
sql<string>`coalesce(
  (SELECT provider FROM ${accounts}
   WHERE ${accounts.userId} = ${clientProfiles.userId}
   LIMIT 1),
  'unknown'
)`

// Date formatting
sql<string>`to_char(${votes.createdAt}, 'IYYY-IW')`
```

### Composição da condição

Os filtros são construídos dinamicamente e compostos com `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Unir Padrões

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
