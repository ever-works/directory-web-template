---
id: how-to-add-a-database-table
title: "How to Add a Database Table"
sidebar_label: "Add a Database Table"
sidebar_position: 71
---

# How to Add a Database Table

This guide covers the full lifecycle of adding a new database table to the template: defining the Drizzle schema, generating a migration, writing query functions, and running the migration against your database.

## Prerequisites

- PostgreSQL database accessible via `DATABASE_URL`
- Drizzle ORM basics (the template uses `drizzle-orm` with `postgres-js`)
- Development environment set up (`pnpm install` completed)

---

## Architecture Overview

Database-related files are organized under `lib/db/`:

```
lib/db/
  schema.ts          <-- All table definitions (Drizzle pgTable)
  drizzle.ts         <-- Database connection (singleton)
  config.ts          <-- Database URL and env helpers
  migrate.ts         <-- Migration runner
  seed.ts            <-- Seed data
  queries/
    company.queries.ts
    user.queries.ts
    ...              <-- One file per entity for CRUD operations
  migrations/
    0000_burly_darkstar.sql
    0001_add_image_to_users.sql
    ...              <-- Auto-generated SQL migration files
```

The Drizzle config lives at the project root:

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

---

## Step 1: Define the Schema

Open `lib/db/schema.ts` and add your new table definition. Follow the conventions used by existing tables:

```typescript
// lib/db/schema.ts

// ######################### Bookmarks Schema #########################
export const bookmarks = pgTable(
  "bookmarks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemSlug: text("item_slug").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userItemUnique: uniqueIndex("bookmarks_user_item_idx").on(
      table.userId,
      table.itemSlug
    ),
    userIndex: index("bookmarks_user_idx").on(table.userId),
    createdAtIndex: index("bookmarks_created_at_idx").on(table.createdAt),
  })
);

// Type helpers (used in queries and services)
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
```

### Schema Conventions

| Convention | Example |
|-----------|---------|
| Primary key | `text("id")` with `crypto.randomUUID()` default |
| Timestamps | `createdAt` and `updatedAt` with `defaultNow()` |
| Foreign keys | `.references(() => parentTable.id, { onDelete: "cascade" })` |
| Indexes | Defined in the third argument of `pgTable` |
| Section comments | `// ##### SectionName Schema #####` |
| Column naming | snake_case in the database, camelCase in TypeScript |

---

## Step 2: Generate the Migration

Run the Drizzle Kit generate command to create a SQL migration file:

```bash
pnpm db:generate
```

This compares `lib/db/schema.ts` against the previous migration state and outputs a new SQL file in `lib/db/migrations/`:

```
lib/db/migrations/
  0020_add_bookmarks_table.sql   <-- generated
```

Review the generated SQL to verify it matches your intent:

```sql
CREATE TABLE IF NOT EXISTS "bookmarks" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "item_slug" text NOT NULL,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "bookmarks_user_item_idx"
  ON "bookmarks" ("user_id", "item_slug");
CREATE INDEX IF NOT EXISTS "bookmarks_user_idx"
  ON "bookmarks" ("user_id");
CREATE INDEX IF NOT EXISTS "bookmarks_created_at_idx"
  ON "bookmarks" ("created_at");

ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE cascade ON UPDATE no action;
```

---

## Step 3: Run the Migration

Apply the migration to your local database:

```bash
pnpm db:migrate
```

Under the hood this calls `runMigrations()` from `lib/db/migrate.ts`, which uses Drizzle's idempotent migrator -- it tracks applied migrations in a `drizzle.__drizzle_migrations` table and skips anything already applied.

To inspect the database interactively:

```bash
pnpm db:studio
```

---

## Step 4: Write Query Functions

Create a queries file for CRUD operations on the new table:

```typescript
// lib/db/queries/bookmark.queries.ts

import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "../drizzle";
import { bookmarks, type Bookmark, type NewBookmark } from "../schema";

// ===================== Bookmark CRUD =====================

/**
 * Create a new bookmark
 */
export async function createBookmark(
  data: NewBookmark
): Promise<Bookmark> {
  const [bookmark] = await db
    .insert(bookmarks)
    .values(data)
    .returning();

  return bookmark;
}

/**
 * Get bookmark by ID
 */
export async function getBookmarkById(
  id: string
): Promise<Bookmark | null> {
  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.id, id))
    .limit(1);

  return bookmark || null;
}

/**
 * List bookmarks for a user with pagination
 */
export async function getBookmarksByUser(
  userId: string,
  params: { page?: number; limit?: number } = {}
): Promise<{
  bookmarks: Bookmark[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId));

  const total = Number(countResult[0]?.count || 0);

  const items = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    bookmarks: items,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Delete a bookmark (with ownership check)
 */
export async function deleteBookmark(
  id: string,
  userId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .returning();

  return !!deleted;
}
```

### Query Conventions

| Convention | Details |
|-----------|---------|
| One file per entity | `<entity>.queries.ts` in `lib/db/queries/` |
| Pagination return shape | `{ items, total, page, totalPages }` |
| Null for not-found | Return `null` (not `undefined`) when a record is missing |
| Ownership checks | Include `userId` in WHERE clauses for user-owned resources |
| JSDoc comments | Document each function's parameters and return values |

---

## Step 5: Wire It All Together

Your new table is now ready to be consumed by a service and exposed via an API route:

1. **Service**: `lib/services/bookmark.service.ts` -- orchestrates query calls and adds business logic (see [How to Add a Service](/docs/guides/how-to-add-a-service))
2. **API Route**: `app/api/bookmarks/route.ts` -- thin handler that validates input, calls the service, and returns HTTP responses (see [How to Add an API Endpoint](/docs/guides/how-to-add-an-api-endpoint))

---

## Production Migrations

On Vercel, migrations run automatically at two points:

1. **Build time** -- the `scripts/build-migrate.ts` script runs migrations during `pnpm build` before the app starts
2. **Runtime fallback** -- `instrumentation.ts` calls `initializeDatabase()` which runs `runMigrations()` on server startup as a safety net for preview deployments

For manual control:

```bash
# Generate migration after schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Seed the database (optional)
pnpm db:seed
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Forgetting to run `pnpm db:generate` after schema changes | Always generate before migrating; the migration file is what actually alters the database |
| Column name mismatch between TypeScript and SQL | Use explicit column names in `pgTable` (e.g., `text("user_id")`) and keep TypeScript names camelCase |
| Missing indexes on foreign keys | Drizzle does not auto-index foreign keys; add explicit indexes for columns used in JOINs or WHERE clauses |
| Breaking changes in production | Never rename or drop columns directly; use a two-step migration (add new column, migrate data, remove old column) |
| Large migrations timing out on Vercel | Split large data migrations into batches or run them outside of the deployment pipeline |

---

## Related Pages

- [How to Add a Service](/docs/guides/how-to-add-a-service) -- building the business logic layer on top of your new table
- [How to Write Database Migrations](/docs/guides/how-to-write-database-migrations) -- advanced migration techniques
- [Repository Patterns](/docs/architecture/repository-patterns) -- when to use repositories vs. queries
- [Database Health Check](/docs/guides/database-health-check) -- monitoring your database in production
