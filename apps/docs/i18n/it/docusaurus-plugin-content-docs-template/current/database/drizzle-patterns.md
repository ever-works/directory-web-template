---
id: drizzle-patterns
title: "Modelli ORM piovigginosi"
sidebar_label: "Modelli di pioggerellina"
sidebar_position: 13
---

# Modelli ORM piovigginosi

Il modello utilizza Drizzle ORM con il dialetto PostgreSQL (`drizzle-orm/postgres-js`). Questa pagina copre le convenzioni di definizione dello schema, i tipi di colonna, le strategie di indice, le definizioni di relazione, il flusso di lavoro di migrazione e i modelli di creazione di query utilizzati in tutto il codice base.

## Definizione dello schema (`lib/db/schema.ts`)

### Struttura della tabella

Le tabelle sono definite con `pgTable` e seguono uno schema coerente:

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

### Utilizzo del tipo di colonna

|Tipo pioviggine|Tipo PostgreSQL|Usato per|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|ID, e-mail, nomi, slug, URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Campi data restituiti come JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Campi data con modalità predefinita|
|`boolean('col')`|`BOOLEAN`|Flag (isAdmin, isActive, ecc.)|
|`integer('col')`|`INTEGER`|Contatori numerici, OAuth scade_at|
|`serial('col')`|`SERIAL`|ID a incremento automatico|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Stringhe con vincoli di lunghezza|
|`jsonb('col')`|`JSONB`|Metadati strutturati|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Coordinate di latitudine/longitudine|

### Chiavi primarie UUID

Tutte le tabelle utilizzano le colonne `text` con `crypto.randomUUID()` come funzione predefinita:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Colonne di enumerazione

Le enumerazioni di stringhe sono definite in linea sulla colonna:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Chiavi primarie composite

Le tabelle di join utilizzano `primaryKey` con più colonne:

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

### Chiavi esterne

Le chiavi esterne utilizzano in linea `.references()` con eliminazione a cascata:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Definizioni dell'indice

Gli indici sono definiti nel terzo argomento di `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Modelli di indice comuni:
- `createdAt` indici sulla maggior parte delle tabelle per l'ordinamento basato sul tempo
- Indici di stato/flag per le query di filtro
- Indici di posta elettronica per query di ricerca
- Indici dei provider per le query sugli account di autenticazione

### Controlla i vincoli

Utilizzato per la convalida del dominio a livello di database:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Digitare Inferenza

Drizzle deduce automaticamente i tipi TypeScript dalle definizioni delle tabelle:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Questi tipi dedotti vengono esportati direttamente da `lib/db/schema.ts` e utilizzati in tutto il livello di query.

## Relazioni (`lib/db/migrations/relations.ts`)

Le relazioni vengono definite separatamente utilizzando l'helper `relations()` per l'API di query relazionale di Drizzle:

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

### Tipi di relazione

|Aiutante|Cardinalità|Esempio|
|--------|------------|---------|
|`one()`|Molti a uno|`clientProfile -> user`|
|`many()`|Uno a molti|`user -> accounts`|

## Flusso di lavoro di migrazione

### Configurazione del kit Drizzle

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

### Comandi di migrazione

|Comando|Descrizione|
|---------|-------------|
|`pnpm db:generate`|Genera file di migrazione SQL dalle modifiche dello schema|
|`pnpm db:migrate`|Applicare le migrazioni in sospeso al database|
|`pnpm db:seed`|Semina il database con i dati iniziali|
|`pnpm db:studio`|Apri Drizzle Studio per la gestione visiva del database|

### Corridore di migrazione

La funzione `runMigrations()` in `lib/db/migrate.ts` è idempotente e sicura da richiamare ad ogni avvio:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle tiene traccia delle migrazioni applicate nella tabella `drizzle.__drizzle_migrations` ed esegue solo quelle nuove.

## Modelli del generatore di query

### Seleziona con Dove

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Inserisci con ritorno

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Aggiornamento con restituzione

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Elimina con Ritorno

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (sul conflitto)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### SQL dinamico

Le espressioni SQL grezze vengono utilizzate per condizioni e aggregazioni complesse:

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

### Composizione delle condizioni

I filtri sono costruiti dinamicamente e composti con `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Unisciti ai modelli

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
