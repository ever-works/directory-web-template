---
id: drizzle-patterns
title: "Drizzle ORM Patterns"
sidebar_label: "Drizzle Patterns"
sidebar_position: 13
---

# Drizzle ORM Patterns

The template uses Drizzle ORM with the PostgreSQL dialect (`drizzle-orm/postgres-js`). This page covers schema definition conventions, column types, index strategies, relation definitions, migration workflow, and the query builder patterns used throughout the codebase.

## Schema Definition (`lib/db/schema.ts`)

### Table Structure

Tables are defined with `pgTable` and follow a consistent pattern:

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

### Column Type Usage

| Drizzle Type | PostgreSQL Type | Used For |
|-------------|----------------|----------|
| `text('col')` | `TEXT` | IDs, emails, names, slugs, URLs |
| `timestamp('col', { mode: 'date' })` | `TIMESTAMP` | Date fields returned as JS `Date` |
| `timestamp('col')` | `TIMESTAMP` | Date fields with default mode |
| `boolean('col')` | `BOOLEAN` | Flags (isAdmin, isActive, etc.) |
| `integer('col')` | `INTEGER` | Numeric counters, OAuth expires_at |
| `serial('col')` | `SERIAL` | Auto-incrementing IDs |
| `varchar('col', { length: N })` | `VARCHAR(N)` | Length-constrained strings |
| `jsonb('col')` | `JSONB` | Structured metadata |
| `doublePrecision('col')` | `DOUBLE PRECISION` | Latitude/longitude coordinates |

### UUID Primary Keys

All tables use `text` columns with `crypto.randomUUID()` as the default function:

```typescript
id: text('id')
  .primaryKey()
  .$defaultFn(() => crypto.randomUUID()),
```

### Enum Columns

String enums are defined inline on the column:

```typescript
status: text('status', {
  enum: ['active', 'inactive', 'suspended', 'banned', 'trial']
}).default('active'),

plan: text('plan', {
  enum: ['free', 'standard', 'premium']
}).default('free'),
```

### Composite Primary Keys

Join tables use `primaryKey` with multiple columns:

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

### Foreign Keys

Foreign keys use inline `.references()` with cascade delete:

```typescript
userId: text('userId')
  .notNull()
  .references(() => users.id, { onDelete: 'cascade' }),
```

### Index Definitions

Indexes are defined in the third argument of `pgTable`:

```typescript
(table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
  createdAtIndex: index('roles_created_at_idx').on(table.createdAt)
})
```

Common index patterns:
- `createdAt` indexes on most tables for time-based sorting
- Status/flag indexes for filter queries
- Email indexes for lookup queries
- Provider indexes for auth account queries

### Check Constraints

Used for domain validation at the database level:

```typescript
(table) => ({
  ratingCheck: check('rating_check', sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
})
```

## Type Inference

Drizzle automatically infers TypeScript types from table definitions:

```typescript
// Select type (all fields, with defaults resolved)
export type User = typeof users.$inferSelect;

// Insert type (optional fields for columns with defaults)
export type NewUser = typeof users.$inferInsert;
```

These inferred types are exported directly from `lib/db/schema.ts` and used throughout the query layer.

## Relations (`lib/db/migrations/relations.ts`)

Relations are defined separately using the `relations()` helper for Drizzle's relational query API:

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

### Relation Types

| Helper | Cardinality | Example |
|--------|------------|---------|
| `one()` | Many-to-one | `clientProfile -> user` |
| `many()` | One-to-many | `user -> accounts` |

## Migration Workflow

### Drizzle Kit Configuration

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

### Migration Commands

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate SQL migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:seed` | Seed the database with initial data |
| `pnpm db:studio` | Open Drizzle Studio for visual database management |

### Migration Runner

The `runMigrations()` function in `lib/db/migrate.ts` is idempotent and safe to call on every startup:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  return true;
}
```

Drizzle tracks applied migrations in the `drizzle.__drizzle_migrations` table and only runs new ones.

## Query Builder Patterns

### Select with Where

```typescript
const [user] = await db
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

### Insert with Returning

```typescript
const [profile] = await db
  .insert(clientProfiles)
  .values(insertData)
  .returning();
```

### Update with Returning

```typescript
const [updated] = await db
  .update(clientProfiles)
  .set({ ...data, updatedAt: new Date() })
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Delete with Returning

```typescript
const [deleted] = await db
  .delete(clientProfiles)
  .where(eq(clientProfiles.id, id))
  .returning();
```

### Upsert (On Conflict)

```typescript
const result = await db
  .insert(itemViews)
  .values(view)
  .onConflictDoNothing()
  .returning({ id: itemViews.id });
```

### Dynamic SQL

Raw SQL expressions are used for complex conditions and aggregations:

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

### Condition Composition

Filters are built dynamically and composed with `and()`:

```typescript
import { and, eq, gte, isNull, or, type SQL } from 'drizzle-orm';

const conditions: SQL[] = [];
if (status) conditions.push(eq(table.status, status));
if (search) conditions.push(sql`${table.name} ILIKE ${`%${search}%`}`);

const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
```

### Join Patterns

```typescript
// Inner join (required relation)
.innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))

// Left join (optional relation, often for exclusion)
.leftJoin(userRoles, eq(userRoles.userId, clientProfiles.userId))
.leftJoin(roles, and(eq(userRoles.roleId, roles.id), eq(roles.isAdmin, true)))
.where(isNull(roles.id))  // Exclude admins
```
