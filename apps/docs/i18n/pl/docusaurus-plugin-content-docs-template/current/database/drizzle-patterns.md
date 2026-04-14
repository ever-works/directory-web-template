---
id: drizzle-patterns
title: "Mżawka Wzory ORM"
sidebar_label: "Wzory mżawki"
sidebar_position: 13
---

# Mżawka Wzory ORM

Szablon wykorzystuje Drizzle ORM z dialektem PostgreSQL (`drizzle-orm/postgres-js`). Na tej stronie opisano konwencje definicji schematów, typy kolumn, strategie indeksowania, definicje relacji, przepływ pracy migracji i wzorce konstruktora zapytań używane w całej bazie kodu.

## Definicja schematu (`lib/db/schema.ts`)

### Struktura tabeli

Tabele są zdefiniowane za pomocą `pgTable` i mają spójny wzór:

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

### Użycie typu kolumny

|Rodzaj mżawki|Typ PostgreSQLa|Używany do|
|-------------|----------------|----------|
|`text('col')`|`TEXT`|Identyfikatory, e-maile, nazwiska, ślimaki, adresy URL|
|`timestamp('col', { mode: 'date' })`|`TIMESTAMP`|Pola daty zwrócone jako JS `Date`|
|`timestamp('col')`|`TIMESTAMP`|Pola daty z trybem domyślnym|
|`boolean('col')`|`BOOLEAN`|Flagi (isAdmin, isActive itp.)|
|`integer('col')`|`INTEGER`|Liczniki numeryczne, OAuth wygasa_at|
|`serial('col')`|`SERIAL`|Automatyczne zwiększanie identyfikatorów|
|`varchar('col', { length: N })`|`VARCHAR(N)`|Struny o ograniczonej długości|
|`jsonb('col')`|`JSONB`|Ustrukturyzowane metadane|
|`doublePrecision('col')`|`DOUBLE PRECISION`|Współrzędne szerokości/długości geograficznej|

### Klucze podstawowe UUID

Wszystkie tabele używają kolumn `text` z funkcją domyślną `crypto.randomUUID()`:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Kolumny wyliczeniowe

Wyliczenia ciągów są zdefiniowane w kolumnie:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Złożone klucze podstawowe

Połącz tabele, używając `primaryKey` z wieloma kolumnami:

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

### Klucze obce

Klucze obce używają wbudowanego `.references()` z usuwaniem kaskadowym:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Definicje indeksów

Indeksy definiuje się w trzecim argumencie `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Typowe wzorce indeksów:
- `createdAt` indeksuje większość tabel w celu sortowania według czasu
- Indeksy stanu/flagi dla zapytań filtrujących
- Indeksy e-mailowe dla zapytań wyszukiwania
- Indeksy dostawców dla zapytań dotyczących kont uwierzytelniających

### Sprawdź ograniczenia

Używany do walidacji domeny na poziomie bazy danych:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Wpisz wnioskowanie

Drizzle automatycznie wnioskuje typy TypeScript na podstawie definicji tabel:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

Te wywnioskowane typy są eksportowane bezpośrednio z `lib/db/schema.ts` i używane w całej warstwie zapytań.

## Relacje (`lib/db/migrations/relations.ts`)

Relacje są definiowane oddzielnie przy użyciu pomocnika `relations()` dla API zapytań relacyjnych Drizzle:

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

### Typy relacji

|Pomocnik|Kardynalność|Przykład|
|--------|------------|---------|
|`one()`|Wiele do jednego|`clientProfile -> user`|
|`many()`|Jeden do wielu|`user -> accounts`|

## Przebieg migracji

### Konfiguracja zestawu do mżawki

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

### Polecenia migracji

|Polecenie|Opis|
|---------|-------------|
|`pnpm db:generate`|Generuj pliki migracji SQL na podstawie zmian schematu|
|`pnpm db:migrate`|Zastosuj oczekujące migracje do bazy danych|
|`pnpm db:seed`|Zasiej bazę danych danymi początkowymi|
|`pnpm db:studio`|Otwórz Drizzle Studio do wizualnego zarządzania bazami danych|

### Biegacz migracji

Funkcja `runMigrations()` w `lib/db/migrate.ts` jest idempotentna i bezpieczna do wywołania przy każdym uruchomieniu:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle śledzi zastosowane migracje w tabeli `drizzle.__drizzle_migrations` i uruchamia tylko nowe.

## Wzorce konstruktora zapytań

### Wybierz za pomocą Gdzie

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Wstaw z powrotem

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Aktualizuj za pomocą Powrotu

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Usuń z powrotem

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (w przypadku konfliktu)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### Dynamiczny SQL

Surowe wyrażenia SQL są używane w przypadku złożonych warunków i agregacji:

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

### Skład stanu

Filtry są budowane dynamicznie i składają się z `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Dołącz do wzorców

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
