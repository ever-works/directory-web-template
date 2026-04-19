---
id: drizzle-patterns
title: "Nieselregen Sie ORM-Muster"
sidebar_label: "Nieselregenmuster"
sidebar_position: 13
---

# Nieselregen Sie ORM-Muster

Die Vorlage verwendet Drizzle ORM mit dem PostgreSQL-Dialekt (`drizzle-orm/postgres-js`). Auf dieser Seite werden Schemadefinitionskonventionen, Spaltentypen, Indexstrategien, Beziehungsdefinitionen, Migrationsworkflow und die in der gesamten Codebasis verwendeten Abfrage-Builder-Muster behandelt.

## Schemadefinition (`lib/db/schema.ts`)

### Tabellenstruktur

Tabellen werden mit `pgTable` definiert und folgen einem einheitlichen Muster:

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

### Verwendung des Spaltentyps

|Nieselregentyp|PostgreSQL-Typ|Verwendet für|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|IDs, E-Mails, Namen, Slugs, URLs|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Als JS zurückgegebene Datumsfelder `Date`|
|`timestamp('col')`|`TIMESTAMP`|Datumsfelder mit Standardmodus|
|`boolean('col')`|`BOOLEAN`|Flags (isAdmin, isActive usw.)|
|`integer('col')`|`INTEGER`|Numerische Zähler, OAuth Expires_at|
|`serial('col')`|`SERIAL`|Automatisch inkrementierende IDs|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Längenbeschränkte Zeichenfolgen|
|`jsonb('col')`|`JSONB`|Strukturierte Metadaten|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Breitengrad-/Längengradkoordinaten|

### UUID-Primärschlüssel

Alle Tabellen verwenden `text`-Spalten mit `crypto.randomUUID()` als Standardfunktion:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Enum-Spalten

String-Aufzählungen werden inline für die Spalte definiert:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Zusammengesetzte Primärschlüssel

Join-Tabellen verwenden `primaryKey` mit mehreren Spalten:

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

### Fremdschlüssel

Fremdschlüssel verwenden inline `.references()` mit Kaskadenlöschung:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Indexdefinitionen

Indizes werden im dritten Argument von `pgTable` definiert:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Gängige Indexmuster:
- `createdAt` Indizes für die meisten Tabellen zur zeitbasierten Sortierung
- Status-/Flag-Indizes für Filterabfragen
- E-Mail-Indizes für Suchabfragen
- Anbieterindizes für Authentifizierungskontoabfragen

### Überprüfen Sie die Einschränkungen

Wird zur Domänenvalidierung auf Datenbankebene verwendet:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Typinferenz

Drizzle leitet automatisch TypeScript-Typen aus Tabellendefinitionen ab:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Diese abgeleiteten Typen werden direkt aus `lib/db/schema.ts` exportiert und in der gesamten Abfrageebene verwendet.

## Beziehungen (`lib/db/migrations/relations.ts`)

Beziehungen werden separat mithilfe des Hilfsprogramms `relations()` für die relationale Abfrage-API von Drizzle definiert:

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

### Beziehungstypen

|Helfer|Kardinalität|Beispiel|
|--------|------------|---------|
|`one()`|Viele-zu-eins|`clientProfile -> user`|
|`many()`|Eins-zu-viele|`user -> accounts`|

## Migrationsworkflow

### Konfiguration des Nieselregen-Kits

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

### Migrationsbefehle

|Befehl|Beschreibung|
|---------|-------------|
|`pnpm db:generate`|Generieren Sie SQL-Migrationsdateien aus Schemaänderungen|
|`pnpm db:migrate`|Anstehende Migrationen auf die Datenbank anwenden|
|`pnpm db:seed`|Füllen Sie die Datenbank mit Anfangsdaten aus|
|`pnpm db:studio`|Öffnen Sie Drizzle Studio für die visuelle Datenbankverwaltung|

### Migrationsläufer

Die Funktion `runMigrations()` in `lib/db/migrate.ts` ist idempotent und kann bei jedem Start sicher aufgerufen werden:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle verfolgt angewendete Migrationen in der Tabelle `drizzle.__drizzle_migrations` und führt nur neue aus.

## Abfrage-Generator-Muster

### Wählen Sie mit „Wo“ aus

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Einfügen mit Returning

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Update mit Rückkehr

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Mit Zurückkehren löschen

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (Über Konflikt)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### Dynamisches SQL

Rohe SQL-Ausdrücke werden für komplexe Bedingungen und Aggregationen verwendet:

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

### Zustandszusammensetzung

Filter werden dynamisch erstellt und mit `and()` zusammengesetzt:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Verbinden Sie Muster

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
