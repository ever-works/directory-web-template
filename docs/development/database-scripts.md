---
id: database-scripts
title: "Database Scripts"
sidebar_label: "Database Scripts"
sidebar_position: 10
---

# Database Scripts

The template provides a suite of database management scripts for migrations, seeding, and maintenance. These scripts use Drizzle ORM and are designed to work across local development, CI/CD pipelines, and production Vercel deployments.

## Script Inventory

| Script | Command | Purpose |
|---|---|---|
| `build-migrate.ts` | `pnpm db:migrate` | Build-time migration runner |
| `cli-migrate.ts` | `pnpm db:migrate:cli` | Manual interactive migration |
| `cli-seed.ts` | `pnpm db:seed` | CLI entry point for seeding |
| `seed.ts` | Direct execution | Full database seeder |
| `seed-stripe-products.ts` | `npx tsx scripts/seed-stripe-products.ts` | Stripe product catalog setup |
| `clean-database.js` | `node scripts/clean-database.js` | Nuclear reset (drops everything) |

## Migration Scripts

### Build-Time Migration (build-migrate.ts)

Automatically runs during `pnpm build` on Vercel deployments. Designed for zero-downtime schema updates.

```mermaid
flowchart TD
    A[Build Start] --> B{SKIP_BUILD_MIGRATIONS?}
    B -->|true| C[Skip & Exit 0]
    B -->|false| D{CI Environment?}
    D -->|CI, not Vercel| C
    D -->|Vercel or Local| E{DATABASE_URL set?}
    E -->|No| C
    E -->|Yes| F[Run Drizzle Migrations]
    F --> G{Success?}
    G -->|Yes| H[Verify Schema]
    G -->|No| I{Production?}
    H --> J{Columns exist?}
    J -->|Yes| K[Exit 0 - Success]
    J -->|No| L[Exit 1 - Fail]
    I -->|Yes| L
    I -->|Preview| M{Connection error?}
    M -->|Yes| C
    M -->|Auth error| L
```

**Environment-Aware Behavior:**

| Environment | Migration Failure | Connection Error | Auth Error |
|---|---|---|---|
| Production (`VERCEL_ENV=production`) | Build fails | Build fails | Build fails |
| Preview (`VERCEL_ENV=preview`) | Build fails | Build passes (warning) | Build fails |
| CI (GitHub Actions) | Skipped entirely | Skipped entirely | Skipped entirely |
| Local development | Build fails | Build fails | Build fails |

**Schema Verification:**

After successful migration, the script verifies critical columns exist:

```typescript
// Verified columns in client_profiles table:
const requiredColumns = ['warning_count', 'suspended_at', 'banned_at'];
```

### Manual Migration CLI (cli-migrate.ts)

Interactive migration tool for manual execution against any database.

```bash
# Using package.json script
pnpm db:migrate:cli

# Direct execution with custom database
DATABASE_URL=postgres://user:pass@host:5432/db tsx scripts/cli-migrate.ts
```

**Three-Step Process:**

1. **Check Current State** -- Queries `drizzle.__drizzle_migrations` table for applied migration history
2. **Run Migrations** -- Calls `runMigrations()` from `lib/db/migrate.ts`
3. **Verify Schema** -- Confirms required columns exist

Example output:

```
============================================================
Database Migration CLI
============================================================
Database: postgres://***:***@host:5432/db

Step 1: Checking current migration state...
  Found 14 applied migrations:
    1. abc123... (2024-01-15T10:30:00Z)
    ...

Step 2: Running migrations...

Step 3: Verifying schema...
  All required moderation columns exist

============================================================
MIGRATION COMPLETED SUCCESSFULLY
============================================================
```

## Seeding Scripts

### Database Seeder (seed.ts)

Populates the database with realistic test data. Only seeds if tables are empty (idempotent for roles/permissions, user-count-gated for users).

```bash
DATABASE_URL=postgres://... pnpm seed
```

**Seeding Order and Dependencies:**

```mermaid
graph TD
    A[Roles] --> B[Permissions]
    B --> C[Role-Permission Links]
    C --> D[Users]
    D --> E[Client Profiles]
    D --> F[User Roles]
    E --> G[Newsletter Subscriptions]
    E --> H[Activity Logs]
    E --> I[Comments]
    E --> J[Votes]
```

**Data Generated:**

```typescript
// 20 users with sequential emails
{ email: 'user1@example.com', ... }
{ email: 'user2@example.com', ... }

// Client profiles with varied plans
{ plan: i % 5 === 0 ? 'premium' : i % 3 === 0 ? 'standard' : 'free' }

// Role assignment: first user = admin
{ roleId: i === 0 ? 'role-admin' : 'role-user' }

// Newsletter subscriptions: every 3rd user
users.filter((_, i) => i % 3 === 0)
```

**Connection Configuration:**

```typescript
const conn = postgres(databaseUrl, {
  max: 1,              // Single connection (safe for scripts)
  idle_timeout: 20,     // Close idle connections after 20s
  connect_timeout: 10,  // Fail fast on connection issues
  prepare: false,       // Disable prepared statements
});
```

### CLI Seed Entry Point (cli-seed.ts)

Wrapper script that loads environment variables and delegates to `lib/db/seed.ts`:

```bash
pnpm db:seed
```

The script looks for environment files in this order:
1. `.env.local` (preferred)
2. `.env` (fallback)
3. System environment variables only (if neither file exists)

### Stripe Product Seeder (seed-stripe-products.ts)

Creates the complete Stripe product catalog with subscription plans and one-time purchase items.

```bash
npx tsx scripts/seed-stripe-products.ts
```

**Required:** `STRIPE_SECRET_KEY` in `.env.local`

**Products and Pricing:**

| Product | Plan Key | Pricing Type | Metadata |
|---|---|---|---|
| Free | `free` | Subscription ($0/mo) | `type: subscription` |
| Standard | `standard` | $10/mo, $96/yr | `annualDiscount: 20` |
| Premium | `premium` | $20/mo, $180/yr | `annualDiscount: 25` |
| Sponsored Ad - Weekly | `sponsor_weekly` | $100 one-time | `type: sponsor_ad` |
| Sponsored Ad - Monthly | `sponsor_monthly` | $300 one-time | `type: sponsor_ad` |

**Product Metadata Structure:**

```typescript
interface ProductConfig {
  name: string;
  description: string;
  metadata: {
    plan: string;        // Plan identifier used by the app
    type: string;        // 'subscription' or 'sponsor_ad'
    features?: string;   // JSON-encoded feature list
    annualDiscount?: string; // Percentage discount for annual
  };
  prices: {
    monthly?: number;    // Amount in cents
    yearly?: number;     // Amount in cents
    oneTime?: number;    // For sponsor ads
  };
}
```

## Database Cleanup

### clean-database.js

Drops all tables and the Drizzle migration tracking schema. This provides a complete database reset.

```bash
node scripts/clean-database.js
```

**Operations performed:**

1. Drops all tables in the `public` schema using `CASCADE`
2. Drops the `drizzle` schema (migration history)

```sql
-- Step 1: Drop all public tables
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;

-- Step 2: Drop migration tracking
DROP SCHEMA IF EXISTS drizzle CASCADE;
```

**Warning:** This is irreversible. Always create a backup before running in any environment with real data.

## Common Workflows

### Fresh Development Setup

```bash
# 1. Start local PostgreSQL
docker compose up -d postgres

# 2. Generate migration files from schema
pnpm db:generate

# 3. Apply migrations
pnpm db:migrate:cli

# 4. Seed test data
pnpm db:seed

# 5. Seed Stripe products (if using payments)
npx tsx scripts/seed-stripe-products.ts
```

### Reset and Re-seed

```bash
# 1. Clean everything
node scripts/clean-database.js

# 2. Re-apply migrations
pnpm db:migrate:cli

# 3. Re-seed
pnpm db:seed
```

### Schema Changes

```bash
# 1. Modify schema in lib/db/schema.ts
# 2. Generate migration
pnpm db:generate

# 3. Apply locally
pnpm db:migrate:cli

# 4. Verify with Drizzle Studio
pnpm db:studio
```

## Environment Variables

| Variable | Required By | Purpose |
|---|---|---|
| `DATABASE_URL` | All scripts | PostgreSQL connection string |
| `SKIP_BUILD_MIGRATIONS` | build-migrate.ts | Set `true` to skip build migrations |
| `STRIPE_SECRET_KEY` | seed-stripe-products.ts | Stripe API key for product creation |
| `SEED_ADMIN_EMAIL` | seed.ts (via lib) | Admin account email |
| `SEED_ADMIN_PASSWORD` | seed.ts (via lib) | Admin account password |

## Error Handling

All database scripts follow these conventions:

- Exit code `0` for success or acceptable skip conditions
- Exit code `1` for failures that should halt the pipeline
- Connection strings are masked in logs (`://***:***@`)
- Detailed error messages are logged server-side
- Production errors always fail the build (no silent swallowing)
