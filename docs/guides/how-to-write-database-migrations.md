---
id: how-to-write-database-migrations
title: "How to Write Database Migrations"
sidebar_label: "Write Database Migrations"
sidebar_position: 7
---

# How to Write Database Migrations

This guide covers the complete Drizzle ORM migration workflow: making schema changes, generating migration files, running migrations, handling rollbacks, and seeding data.

## Prerequisites

- PostgreSQL database running and `DATABASE_URL` configured in `.env.local`
- Drizzle Kit installed (included in project dependencies)
- Familiarity with the Drizzle ORM schema definition API
- Understanding of `lib/db/schema.ts`

---

## Architecture Overview

The database layer is organized as follows:

```
lib/db/
  schema.ts              # All table definitions (Drizzle ORM)
  migrations/
    schema.ts            # Auto-generated schema snapshot
    relations.ts         # Auto-generated relation definitions
    meta/                # Drizzle Kit metadata (journal, snapshots)
    0000_burly_darkstar.sql
    0001_add_image_to_users.sql
    ...                  # Sequential migration files
drizzle.config.ts        # Drizzle Kit configuration
```

The `drizzle.config.ts` points to:
- **schema**: `./lib/db/schema.ts`
- **out**: `./lib/db/migrations`
- **dialect**: `postgresql`

---

## Step 1: Modify the Schema

Open `lib/db/schema.ts` and make your changes. Drizzle Kit will diff the schema against the last snapshot to generate the migration.

### Adding a New Table

```ts
// lib/db/schema.ts

export const coupons = pgTable(
  'coupons',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: varchar('code', { length: 50 }).notNull().unique(),
    discountPercent: integer('discount_percent').notNull(),
    maxUses: integer('max_uses'),
    usageCount: integer('usage_count').notNull().default(0),
    status: text('status', { enum: ['active', 'expired', 'disabled'] })
      .notNull()
      .default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIndex: uniqueIndex('coupons_code_unique').on(table.code),
    statusIndex: index('coupons_status_idx').on(table.status),
    createdAtIndex: index('coupons_created_at_idx').on(table.createdAt),
  }),
);
```

### Adding a Column to an Existing Table

```ts
// Add to the existing users table definition
export const users = pgTable('users', {
  // ... existing columns ...
  avatarUrl: text('avatar_url'),  // New column
});
```

### Adding a Foreign Key Relationship

```ts
export const couponUsages = pgTable(
  'coupon_usages',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    couponId: text('coupon_id')
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    usedAt: timestamp('used_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    couponUserUnique: uniqueIndex('coupon_usages_coupon_user_unique').on(
      table.couponId,
      table.userId,
    ),
    couponIndex: index('coupon_usages_coupon_idx').on(table.couponId),
    userIndex: index('coupon_usages_user_idx').on(table.userId),
  }),
);
```

---

## Step 2: Generate the Migration

Run the Drizzle Kit generate command:

```bash
pnpm db:generate
```

This compares your current `schema.ts` against the last snapshot in `lib/db/migrations/meta/` and produces a new SQL file, for example:

```
lib/db/migrations/0029_add_coupons.sql
```

---

## Step 3: Review the Generated SQL

Always review the generated SQL before running it. Open the file and verify:

```sql
-- lib/db/migrations/0029_add_coupons.sql

CREATE TABLE IF NOT EXISTS "coupons" (
  "id" text PRIMARY KEY NOT NULL,
  "code" varchar(50) NOT NULL,
  "discount_percent" integer NOT NULL,
  "max_uses" integer,
  "usage_count" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_unique" ON "coupons" USING btree ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_status_idx" ON "coupons" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupons_created_at_idx" ON "coupons" USING btree ("created_at");
```

Things to check:
- Column types match your intentions
- `NOT NULL` constraints are correct
- Default values are sensible
- Indexes are on the right columns
- Foreign keys reference the correct tables

---

## Step 4: Run the Migration

Apply the migration to your database:

```bash
pnpm db:migrate
```

This executes all pending migration files in order against the database specified by `DATABASE_URL`.

---

## Step 5: Verify the Migration

Use Drizzle Studio to inspect the database:

```bash
pnpm db:studio
```

This opens a web UI where you can browse tables, inspect data, and verify the schema looks correct.

---

## Writing Custom SQL Migrations

Sometimes Drizzle Kit cannot generate the exact SQL you need. You can write custom migration files.

### Data Migrations

When you need to transform existing data:

```sql
-- lib/db/migrations/0030_migrate_coupon_data.sql

-- Backfill the new status column based on expiry date
UPDATE "coupons"
SET "status" = 'expired'
WHERE "expires_at" IS NOT NULL AND "expires_at" < NOW();
--> statement-breakpoint
UPDATE "coupons"
SET "status" = 'active'
WHERE "expires_at" IS NULL OR "expires_at" >= NOW();
```

### Conditional Migrations

Use `IF NOT EXISTS` and `DO $$ ... $$` blocks for safety:

```sql
-- Safe table creation
CREATE TABLE IF NOT EXISTS "coupons" ( ... );
--> statement-breakpoint

-- Safe constraint addition
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_code_unique'
  ) THEN
    ALTER TABLE "coupons"
    ADD CONSTRAINT "coupons_code_unique" UNIQUE ("code");
  END IF;
END $$;
--> statement-breakpoint

-- Safe index creation
CREATE INDEX IF NOT EXISTS "coupons_status_idx"
ON "coupons" USING btree ("status");
```

### Statement Breakpoints

Drizzle migrations use `--> statement-breakpoint` comments to separate SQL statements. Each statement between breakpoints is executed individually. Always include these between your SQL statements.

---

## Handling Rollbacks

Drizzle Kit does not generate automatic rollback migrations. To roll back a migration:

### Option A: Create a Reverse Migration

Write a new migration that undoes the previous changes:

```sql
-- lib/db/migrations/0031_rollback_coupons.sql

DROP TABLE IF EXISTS "coupon_usages";
--> statement-breakpoint
DROP TABLE IF EXISTS "coupons";
```

### Option B: Manual Rollback (Development Only)

In development, you can drop and recreate:

```bash
# Drop all tables (DESTRUCTIVE -- development only!)
pnpm db:push --force

# Or reset the database and re-run all migrations
pnpm db:migrate
```

### Option C: Revert Schema and Regenerate

1. Undo your changes in `schema.ts`
2. Delete the generated migration file
3. Delete the corresponding snapshot from `lib/db/migrations/meta/`
4. Run `pnpm db:generate` to verify no diff

---

## Seeding Data

Use the seed script to populate tables with initial data:

```bash
pnpm db:seed
```

To add seed data for your new table, create or update the seed script:

```ts
// scripts/seed.ts or lib/db/seed.ts

import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';

async function seedCoupons() {
  const existingCoupons = await db.select().from(coupons).limit(1);
  if (existingCoupons.length > 0) {
    console.log('Coupons already seeded, skipping.');
    return;
  }

  await db.insert(coupons).values([
    {
      code: 'WELCOME10',
      discountPercent: 10,
      maxUses: 100,
      status: 'active',
    },
    {
      code: 'SUMMER25',
      discountPercent: 25,
      maxUses: 50,
      status: 'active',
      expiresAt: new Date('2025-09-01'),
    },
  ]);

  console.log('Coupons seeded successfully.');
}
```

Always check for existing data before inserting to make the seed script idempotent.

---

## Schema Conventions Reference

| Convention | Example |
|-----------|---------|
| Primary key | `text('id').primaryKey().$defaultFn(() => crypto.randomUUID())` |
| Created timestamp | `timestamp('created_at').notNull().defaultNow()` |
| Timezone-aware timestamp | `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()` |
| Soft delete | `timestamp('deleted_at')` (nullable) |
| Status enum | `text('status', { enum: ['active', 'inactive'] }).default('active')` |
| Foreign key with cascade | `.references(() => users.id, { onDelete: 'cascade' })` |
| Composite primary key | `primaryKey({ columns: [table.col1, table.col2] })` |
| Unique index | `uniqueIndex('name').on(table.column)` |
| Regular index | `index('name').on(table.column)` |

---

## Common Pitfalls

| Issue | Solution |
|-------|----------|
| `pnpm db:generate` produces empty migration | Your schema matches the last snapshot. Check that you saved `schema.ts` and that your changes are in the correct file. |
| Migration fails with "relation already exists" | Use `CREATE TABLE IF NOT EXISTS` in custom SQL or check if you ran generate twice. |
| Foreign key constraint violation during migration | Ensure referenced tables exist first. Drizzle Kit usually orders these correctly. |
| `drizzle.config.ts` not found | Ensure the file is at the project root, not inside `lib/`. |
| Migration order matters | Migrations run sequentially by filename prefix (`0000_`, `0001_`, etc.). Never rename or reorder. |
| Timezone issues | Use `{ withTimezone: true }` for `timestamp` columns that deal with user-facing dates. |

---

## Drizzle Kit Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate SQL migration from schema diff |
| `pnpm db:migrate` | Run all pending migrations |
| `pnpm db:seed` | Populate tables with seed data |
| `pnpm db:studio` | Open Drizzle Studio (visual database browser) |
| `pnpm db:push` | Push schema directly (development only, bypasses migrations) |

---

## Checklist

- [ ] Schema changes made in `lib/db/schema.ts`
- [ ] `pnpm db:generate` run to create migration file
- [ ] Generated SQL reviewed and verified
- [ ] `pnpm db:migrate` run successfully
- [ ] Database verified via `pnpm db:studio`
- [ ] Seed data added if needed (idempotent)
- [ ] Rollback plan documented or reverse migration prepared
- [ ] Migration file committed to version control
- [ ] `pnpm tsc --noEmit` passes (schema types updated)

---

## Related Guides

- [How to Add a New Feature](./how-to-add-a-new-feature.md)
- [How to Add an API Endpoint](./how-to-add-an-api-endpoint.md)
