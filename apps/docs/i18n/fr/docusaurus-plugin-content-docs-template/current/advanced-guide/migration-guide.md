---
id: migration-guide
title: Guide de migration de version
sidebar_label: Migration Guide
sidebar_position: 8
---

# Guide de migration de version

This guide covers upgrading your Ever Works Template installation, handling database migrations between versions, managing breaking changes, writing and applying migration scripts, and rollback procedures.

## Upgrade Workflow Overview

Upgrading the template follows a structured process to minimize risk:

```
1. Review changelog for breaking changes
2. Back up your database (pg_dump)
3. Create a feature branch for the upgrade
4. Update dependencies (pnpm install)
5. Generate and apply database migrations
6. Run lint, type check, and build locally
7. Test critical paths (auth, payments, content)
8. Deploy to staging / preview
9. Verify staging
10. Deploy to production
```

## Database Migration System

### How Migrations Work

The template uses Drizzle ORM with Drizzle Kit for schema migrations. The schema is defined in `lib/db/schema.ts` and migrations are generated as SQL files into `lib/db/migrations/`.

Configuration in `drizzle.config.ts`:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

### Migration Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm db:generate` | Generate SQL from schema changes | After modifying `lib/db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations (Drizzle CLI) | Before starting the app after changes |
| `pnpm db:migrate:cli` | Apply with verbose logging | For debugging migration issues |
| `pnpm db:seed` | Populate initial data | After fresh migration or seed changes |
| `pnpm db:studio` | Visual database inspection | For debugging or data review |

### Migration File Structure

Migrations are stored as numbered SQL files:

```
lib/db/migrations/
  0000_burly_darkstar.sql          # Initial schema
  0001_add_image_to_users.sql      # Add image column
  ...
  0019_add_subscription_renewal_fields.sql
  ...
  0028_tiresome_mauler.sql         # Latest migration
  meta/
    _journal.json                  # Migration journal
```

Drizzle tracks applied migrations in `drizzle.__drizzle_migrations`:

```sql
SELECT hash, created_at
FROM drizzle.__drizzle_migrations
ORDER BY created_at DESC;
```

### Generating a New Migration

After modifying `lib/db/schema.ts`:

```bash
# Generate the migration SQL
pnpm db:generate

# Review the generated file
# (check lib/db/migrations/ for the new file)

# Apply to your local database
pnpm db:migrate
```

### Automatic Migrations

The template runs migrations automatically in two places:

**Build-time** (via `scripts/build-migrate.ts`):

```typescript
// Production builds: failure causes build to fail
if (isProduction) {
  process.exit(1);
}

// Preview deployments: connection errors are tolerated
if (isConnectionError && !isAuthError) {
  process.exit(0); // Allow preview to deploy
}
```

**Runtime** (via `instrumentation.ts`):

```typescript
export async function register() {
  try {
    await initializeDatabase(); // Runs migrate then seed
  } catch (error) {
    if (isProduction) throw error; // Fail fast
    // Dev/preview: log and continue
  }
}
```

### Migration Safety by Environment

| Environment | Build-Time | Runtime | On Failure |
|-------------|-----------|---------|------------|
| Production | Required | Fallback | Build fails / app throws |
| Preview | Connection errors tolerated | Active | Logs warning, app starts |
| Development | Not used | Active | Logs warning, app starts |
| CI (non-Vercel) | Skipped | Not used | N/A |

## Rollback Procedures

### Drizzle Does Not Support Automatic Rollback

Drizzle Kit generates forward-only migrations. To reverse a migration:

**Option 1: Manual reverse migration**

1. Identify the problematic migration in `lib/db/migrations/`
2. Write reverse SQL manually:

```sql
-- Example: reverse adding a column
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

3. Apply directly to the database:

```bash
psql $DATABASE_URL -f reverse-migration.sql
```

4. Remove the forward migration file from `lib/db/migrations/`
5. Update the Drizzle journal if needed

**Option 2: Restore from backup**

The safest rollback approach for complex migrations:

```bash
# Restore from pre-migration backup
pg_restore -c -d your-db-name pre_migration_backup.dump

# Verify the restored state
pnpm db:migrate:cli  # Shows which migrations are applied
```

**Option 3: Revert schema and regenerate**

```bash
# Revert schema.ts to the previous version
git checkout HEAD~1 -- lib/db/schema.ts

# Generate a new migration that reverses the changes
pnpm db:generate

# Review and apply
pnpm db:migrate
```

## Dependency Updates

### Updating Dependencies

```bash
# Check for outdated packages
pnpm outdated

# Update all dependencies
pnpm update

# Update a specific package
pnpm update next@latest
```

### Critical Dependencies

These packages require careful testing when upgrading:

| Package | Risk | Notes |
|---------|------|-------|
| `next` | High | Major versions change APIs, routing, config |
| `next-auth` | High | Auth API changes, session strategy |
| `drizzle-orm` / `drizzle-kit` | High | Schema API, migration format changes |
| `next-intl` | Medium | Routing and message loading changes |
| `@sentry/nextjs` | Medium | Instrumentation hook compatibility |
| `stripe` | Medium | Payment API versioning |
| `@heroui/react` | Medium | UI component prop changes |
| `@trigger.dev/sdk` | Medium | Job scheduling API changes |

### pnpm Overrides

The template uses pnpm overrides in `package.json` to force consistent versions:

```json
{
  "pnpm": {
    "overrides": {
      "@types/react": "19.2.7",
      "@types/react-dom": "19.2.3",
      "esbuild": "0.27.0",
      "@opentelemetry/api": "1.9.0"
    }
  }
}
```

When upgrading React or esbuild, update these overrides to match.

## Breaking Changes Checklist

When upgrading between template versions, review each category:

### Schema Changes

- [ ] Compare `lib/db/schema.ts` with upstream for new/modified columns
- [ ] Generate migrations: `pnpm db:generate`
- [ ] Review generated SQL for destructive operations (column drops, type changes)
- [ ] Apply to a test database first
- [ ] Verify seed compatibility: `pnpm db:seed`

### API Route Changes

- [ ] Check for renamed or removed routes in `app/api/`
- [ ] Update external integrations and webhook URLs
- [ ] Verify cron endpoint paths still match `vercel.json`

### Configuration Changes

- [ ] Compare `.env.example` for new or renamed variables
- [ ] Review `next.config.ts` changes (headers, webpack, plugins)
- [ ] Check `vercel.json` for cron schedule changes
- [ ] Review `drizzle.config.ts` for path changes

### Authentication Changes

- [ ] Compare `auth.config.ts` with upstream
- [ ] Verify session strategy compatibility
- [ ] Test OAuth callback URLs
- [ ] Review permission definitions in `lib/permissions/definitions.ts`

### UI and Styling Changes

- [ ] Compare `tailwind.config.ts` for theme changes
- [ ] Visually inspect key pages
- [ ] Test responsive layouts
- [ ] Verify theme customizations still apply

## Step-by-Step Upgrade Process

### 1. Prepare

```bash
# Back up your database
pg_dump -Fc $DATABASE_URL -f backup_pre_upgrade.dump

# Create a feature branch
git checkout -b feature/template-upgrade
```

### 2. Merge Upstream

If you track the template as an upstream remote:

```bash
git fetch upstream
git merge upstream/main --no-commit
```

Resolve conflicts, paying attention to:
- `lib/db/schema.ts` -- schema changes
- `next.config.ts` -- build configuration
- `auth.config.ts` -- auth providers
- `package.json` -- dependency versions

### 3. Install and Migrate

```bash
pnpm install
pnpm db:generate   # Generate any needed migrations
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Re-seed if needed
```

### 4. Verify Locally

```bash
pnpm tsc --noEmit  # Type check
pnpm lint          # Lint
pnpm build         # Full build
pnpm start         # Manual testing
```

### 5. Test Critical Paths

| Area | What to Test |
|------|-------------|
| Authentication | Login, logout, OAuth, session persistence |
| Payments | Subscription flows, webhook handling |
| Content | Page rendering, search, filtering |
| Admin | Dashboard access, RBAC enforcement |
| i18n | Locale switching, translation completeness |
| Background jobs | Console logs for job registration |

### 6. Deploy

1. Push the feature branch for CI verification
2. Deploy to staging / preview environment
3. Run smoke tests on staging
4. Merge to `main` for production deployment

## Version Compatibility

### Node.js

The minimum version is defined in `package.json`:

```json
{ "engines": { "node": ">=20.19.0" } }
```

### Database

| Provider | Supported | Notes |
|----------|-----------|-------|
| PostgreSQL 14+ | Yes | Production recommended |
| Supabase | Yes | With connection pooling |
| Neon | Yes | Serverless PostgreSQL |

### Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| Vercel | Primary target | Full cron, preview, and edge support |
| Docker | Supported | Standalone output for containers |
| Self-hosted | Supported | Requires process management |

## Troubleshooting Upgrades

| Symptom | Likely Cause | Solution |
|---------|-------------|---------|
| Build fails | Incompatible deps | Run `pnpm outdated`, resolve peer conflicts |
| DB errors on startup | Unapplied migrations | `pnpm db:generate && pnpm db:migrate` |
| Auth broken | Provider config changed | Compare `auth.config.ts` with upstream |
| Missing translations | New keys added | Check `messages/` for missing entries |
| Styling broken | Tailwind config changed | Compare `tailwind.config.ts` |
| Types mismatch | Schema updated | Re-run `pnpm db:generate` |