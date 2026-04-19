---
id: drizzle-patterns
title: "Motregen ORM-patronen"
sidebar_label: "Motregenpatronen"
sidebar_position: 13
---

# Motregen ORM-patronen

De sjabloon gebruikt Drizzle ORM met het PostgreSQL-dialect (`drizzle-orm/postgres-js`). Op deze pagina worden schemadefinitieconventies, kolomtypen, indexstrategieën, relatiedefinities, migratieworkflow en de querybuilderpatronen gebruikt die in de codebase worden gebruikt.

## Schemadefinitie (`lib/db/schema.ts`)

### Tabelstructuur

Tabellen worden gedefinieerd met `pgTable` en volgen een consistent patroon:

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

### Gebruik van kolomtype

|Soort motregen|PostgreSQL-type|Gebruikt voor|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|ID's, e-mails, namen, slugs, URL's|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Datumvelden geretourneerd als JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Datumvelden met standaardmodus|
|`boolean('col')`|`BOOLEAN`|Vlaggen (isAdmin, isActive, etc.)|
|`integer('col')`|`INTEGER`|Numerieke tellers, OAuth expireert_at|
|`serial('col')`|`SERIAL`|Automatisch oplopende ID's|
|`varchar('col', { length: N })`|`VARCHAR(N)`|In lengte beperkte snaren|
|`jsonb('col')`|`JSONB`|Gestructureerde metagegevens|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Coördinaten voor breedtegraad/lengtegraad|

### UUID primaire sleutels

Alle tabellen gebruiken `text` kolommen met `crypto.randomUUID()` als de standaardfunctie:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Kolommen opsommen

Tekenreeksenums worden inline in de kolom gedefinieerd:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Samengestelde primaire sleutels

Samenvoegtabellen gebruiken `primaryKey` met meerdere kolommen:

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

### Buitenlandse sleutels

Externe sleutels gebruiken inline `.references()` met trapsgewijze verwijdering:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Indexdefinities

Indexen worden gedefinieerd in het derde argument van `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Algemene indexpatronen:
- `createdAt` indexen op de meeste tabellen voor op tijd gebaseerd sorteren
- Status-/vlagindexen voor filterquery's
- E-mailindexen voor opzoekquery's
- Providerindexen voor verificatieaccountquery's

### Controleer beperkingen

Gebruikt voor domeinvalidatie op databaseniveau:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Typ gevolgtrekking

Drizzle leidt TypeScript-typen automatisch af uit tabeldefinities:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Deze afgeleide typen worden rechtstreeks vanuit `lib/db/schema.ts` geëxporteerd en in de hele querylaag gebruikt.

## Relaties (`lib/db/migrations/relations.ts`)

Relaties worden afzonderlijk gedefinieerd met behulp van de `relations()` helper voor de relationele query-API van Drizzle:

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

### Relatietypen

|Helper|Kardinaliteit|Voorbeeld|
|--------|------------|---------|
|`one()`|Veel-tegen-één|`clientProfile -> user`|
|`many()`|Eén-op-veel|`user -> accounts`|

## Migratiewerkstroom

### Motregenkitconfiguratie

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

### Migratieopdrachten

|Commando|Beschrijving|
|---------|-------------|
|`pnpm db:generate`|Genereer SQL-migratiebestanden op basis van schemawijzigingen|
|`pnpm db:migrate`|Pas lopende migraties toe op de database|
|`pnpm db:seed`|Zaai de database met initiële gegevens|
|`pnpm db:studio`|Open Drizzle Studio voor visueel databasebeheer|

### Migratie Runner

De `runMigrations()`-functie in `lib/db/migrate.ts` is idempotent en veilig om bij elke startup aan te roepen:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle houdt toegepaste migraties bij in de `drizzle.__drizzle_migrations` tabel en voert alleen nieuwe migraties uit.

## Patronen voor het maken van query's

### Selecteer met Waar

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Invoegen met retourneren

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Update met retourneren

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Verwijderen met retourneren

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (over conflicten)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### Dynamische SQL

Ruwe SQL-expressies worden gebruikt voor complexe voorwaarden en aggregaties:

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

### Conditie Samenstelling

Filters worden dynamisch opgebouwd en samengesteld met `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Sluit je aan bij patronen

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
