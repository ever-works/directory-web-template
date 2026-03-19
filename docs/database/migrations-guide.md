---
id: migrations-guide
title: Migrations Guide
sidebar_label: Migrations
sidebar_position: 4
---

# Migrations Guide

The Ever Works template uses **Drizzle Kit** for database migrations. Migrations are SQL files that track schema changes over time, ensuring consistent database state across environments and team members.

## How Migrations Work

Drizzle Kit compares the current schema definition (`lib/db/schema.ts`) against previously generated migrations and produces SQL migration files for any differences.

```
lib/db/schema.ts (source of truth)
        │
        ▼
  drizzle-kit generate
        │
        ▼
lib/db/migrations/
  ├── 0000_burly_darkstar.sql       (initial schema)
  ├── 0001_add_image_to_users.sql
  ├── 0002_silly_victor_mancha.sql
  ├── ...
  └── 0028_tiresome_mauler.sql      (latest)
```

## Migration Directory Structure

```
lib/db/migrations/
├── 0000_burly_darkstar.sql           # Initial schema (16KB - all core tables)
├── 0001_add_image_to_users.sql       # Add image column to users
├── 0002_silly_victor_mancha.sql      # Subscription and payment tables
├── 0003_gigantic_thunderbolts.sql    # Small schema adjustment
├── 0004_big_marrow.sql               # Small schema adjustment
├── 0005_sharp_malcolm_colcord.sql    # Favorites table
├── 0006_giant_the_phantom.sql        # Featured items table
├── 0007_tiresome_true_believers.sql  # Sponsor ads table
├── 0008_add_twenty_crm_singleton_constraint.sql  # CRM singleton
├── 0009_add_integration_mappings.sql # Integration mappings
├── 0010_convert_comments_timestamps_to_timestamptz.sql # Timezone fix
├── 0011_quiet_gravity.sql            # Companies table
├── 0012_purple_vindicator.sql        # Items-companies join
├── 0013_add_surveys_table.sql        # Survey system
├── 0014_fat_madame_masque.sql        # Seed status, item views, audit logs
├── 0015_previous_jack_flag.sql       # Report and moderation tables
├── 0016_solid_stellaris.sql          # Minor adjustment
├── 0017_whole_supreme_intelligence.sql # Minor adjustment
├── 0018_wooden_electro.sql           # Additional indexes
├── 0019_add_subscription_renewal_fields.sql # Auto-renewal support
├── 0020_chunky_naoko.sql             # Minor adjustment
├── 0021_redundant_dragon_lord.sql    # Additional indexes
├── 0022_tidy_dakota_north.sql        # Payment account improvements
├── 0023_boring_silverclaw.sql        # Collection tables
├── 0024_deep_wrecker.sql             # Additional improvements
├── 0025_overconfident_moon_knight.sql # Location features
├── 0026_exotic_clea.sql              # Minor adjustment
├── 0027_minor_mesmero.sql            # Minor adjustment
├── 0028_tiresome_mauler.sql          # Latest migration
├── meta/                             # Drizzle migration metadata
├── relations.ts                      # Drizzle relation definitions
└── schema.ts                         # Snapshot of schema at migration time
```

The `meta/` directory contains Drizzle Kit's internal tracking metadata. The `relations.ts` and `schema.ts` files in the migrations directory are reference snapshots and should not be edited manually.

## Commands

### Generate a Migration

After modifying `lib/db/schema.ts`, generate a migration:

```bash
pnpm db:generate
```

This runs `drizzle-kit generate` which:
1. Reads the current schema from `lib/db/schema.ts`
2. Compares it against the latest migration snapshot
3. Generates a new SQL file in `lib/db/migrations/`
4. Updates the migration metadata in `meta/`

### Run Pending Migrations

Apply any unapplied migrations to your database:

```bash
pnpm db:migrate
```

This calls `lib/db/migrate.ts` which:
1. Connects to the database using `DATABASE_URL`
2. Checks the `drizzle.__drizzle_migrations` table for applied migrations
3. Runs any migrations that have not been applied
4. Updates the tracking table

### Open Drizzle Studio

Launch a visual database editor:

```bash
pnpm db:studio
```

## Migration Runner (`lib/db/migrate.ts`)

The migration runner (`runMigrations()`) is idempotent and safe to call on every startup:

```typescript
export async function runMigrations(): Promise<boolean> {
  const { db } = await import('./drizzle');

  // Log current migration state
  // ...

  // Run migrations (Drizzle automatically skips applied ones)
  await migrate(db, { migrationsFolder: './lib/db/migrations' });

  return true;
}
```

Key behaviors:
- **Idempotent**: Drizzle tracks applied migrations in `drizzle.__drizzle_migrations`; already-applied migrations are skipped
- **Logging**: Reports recent applied migrations before and after execution
- **Error handling**: Returns `false` on failure with detailed error messages
- **Auto-startup**: Called during application startup via `lib/db/initialize.ts`

## Auto-Migration on Startup

The template automatically runs migrations when the application starts. This is triggered by `instrumentation.ts` which calls `initializeDatabase()` from `lib/db/initialize.ts`.

The startup flow:
1. Check if `DATABASE_URL` is configured (skip if not)
2. Run all pending migrations
3. Check if database has been seeded
4. If not seeded, acquire an advisory lock and run seed

In production, migration failures throw an error to signal to monitoring systems. In development and preview environments, the application continues with a warning.

## Creating New Migrations

### Step 1: Modify the Schema

Edit `lib/db/schema.ts` to add, modify, or remove table definitions:

```typescript
// Add a new table
export const newTable = pgTable('new_table', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Add a column to an existing table
// Just add the new column to the existing pgTable definition
```

### Step 2: Generate the Migration

```bash
pnpm db:generate
```

This creates a new SQL file like `0029_some_name.sql`.

### Step 3: Review the Generated SQL

Always review the generated migration before applying it. Check for:
- Correct table and column names
- Proper data types and constraints
- Index definitions
- Foreign key relationships
- Any destructive operations (DROP TABLE, DROP COLUMN)

### Step 4: Apply the Migration

```bash
pnpm db:migrate
```

### Step 5: Commit

Commit both the schema change and the generated migration file:
- `lib/db/schema.ts`
- `lib/db/migrations/XXXX_migration_name.sql`
- `lib/db/migrations/meta/` (updated metadata)

## Team Workflow

### Handling Concurrent Schema Changes

When multiple team members modify the schema simultaneously:

1. Each developer generates their own migration locally
2. On merge, migration files may need renumbering if sequence numbers conflict
3. Drizzle Kit tracks migrations by hash, not by number, so out-of-order execution is handled
4. After merging, run `pnpm db:migrate` to apply all new migrations

### Environment Considerations

| Environment | Migration Strategy |
|-------------|-------------------|
| Development | Auto-run on startup; generate and test locally |
| Preview/Staging | Auto-run on deployment via `instrumentation.ts` |
| Production | Auto-run on deployment; monitor for failures |

### Best Practices

1. **One concern per migration**: Keep migrations focused on a single feature or change
2. **Never edit existing migrations**: Once a migration has been applied anywhere, treat it as immutable
3. **Review generated SQL**: Always check what Drizzle Kit generates before applying
4. **Test migrations**: Run migrations against a test database before deploying to production
5. **Include migration files in code review**: Migration SQL should be reviewed just like application code
6. **Back up before destructive migrations**: Always back up before running migrations that drop tables or columns
