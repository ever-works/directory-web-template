---
id: database-management
title: Database Management
sidebar_label: Database Management
sidebar_position: 4
---

# Database Management

The Ever Works Template uses PostgreSQL with Drizzle ORM for all database operations. This guide covers production database management, migrations, connection pooling, monitoring, and the seeding system.

## Architecture

| Layer | File | Responsibility |
|-------|------|----------------|
| **Configuration** | `drizzle.config.ts` | Schema path, migration output, dialect |
| **Connection** | `lib/db/drizzle.ts` | Connection pooling, singleton instance, lazy init |
| **Config** | `lib/db/config.ts` | Script-safe database URL and env helpers |
| **Schema** | `lib/db/schema.ts` | Table definitions, indexes, constraints |
| **Migrations** | `lib/db/migrate.ts` | Idempotent migration runner |
| **Initialization** | `lib/db/initialize.ts` | Auto-migrate, seed, advisory locks |
| **Seeding** | `lib/db/seed.ts` | Initial data: roles, permissions, admin user |

## Connection Management

### Singleton with Lazy Initialization

The database connection is created on first use and cached via `globalThis` to survive HMR in development. From `lib/db/drizzle.ts`:

```typescript
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
  db: ReturnType<typeof drizzle> | undefined;
};

function initializeDatabase(): ReturnType<typeof drizzle> {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (globalForDb.db) {
    return globalForDb.db;
  }

  const poolSize = getPoolSize();
  const conn = postgres(getDatabaseUrl()!, {
    max: poolSize,
    idle_timeout: 20,
    connect_timeout: 30,
    prepare: false,
  });

  globalForDb.conn = conn;
  globalForDb.db = drizzle(conn, { schema });
  return globalForDb.db;
}
```

The exported `db` object uses a JavaScript Proxy for transparent lazy initialization:

```typescript
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const database = initializeDatabase();
    return database[prop as keyof typeof database];
  },
});
```

This means no database connection is established until the first actual query. Routes that do not use the database incur zero connection overhead.

### Connection Pool Configuration

| Setting | Production Default | Development Default | Description |
|---------|-------------------|---------------------|-------------|
| `max` | 20 | 10 | Maximum connections in pool |
| `idle_timeout` | 20s | 20s | Close idle connections after this duration |
| `connect_timeout` | 30s | 30s | Timeout for new connection attempts |
| `prepare` | false | false | Disable prepared statements (Vercel compatibility) |

Configure the pool size via environment variable:

```bash
# Allowed range: 1 to 50
DB_POOL_SIZE=20
```

The pool size is validated and clamped:

```typescript
const getPoolSize = (): number => {
  const envPoolSize = process.env.DB_POOL_SIZE;
  if (envPoolSize) {
    const parsed = parseInt(envPoolSize, 10);
    return isNaN(parsed) ? 20 : Math.max(1, Math.min(parsed, 50));
  }
  return getNodeEnv() === 'production' ? 20 : 10;
};
```

## Drizzle Configuration

The Drizzle Kit configuration in `drizzle.config.ts`:

```typescript
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL
  || "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

Note: A dummy URL fallback is used so that `drizzle-kit generate` can run without a live database connection (it only reads the schema file).

## Schema Overview

The schema at `lib/db/schema.ts` defines these core tables:

### Users and Authentication

```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').unique(),
  image: text('image'),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at')
}, (table) => ({
  createdAtIndex: index('users_created_at_idx').on(table.createdAt)
}));
```

### Role-Based Access Control

```typescript
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).default('active'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIndex: index('roles_status_idx').on(table.status),
  isAdminIndex: index('roles_is_admin_idx').on(table.isAdmin),
}));
```

### Full Table List

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `accounts` | OAuth provider links (NextAuth adapter) |
| `sessions` | Active user sessions |
| `roles` | Role definitions with admin flag |
| `permissions` | Permission definitions (resource:action) |
| `userRoles` | User-to-role assignments |
| `rolePermissions` | Role-to-permission assignments |
| `clientProfiles` | Extended user profiles for directory listings |
| `subscriptions` | Payment subscription records |
| `subscriptionHistory` | Subscription change audit trail |
| `paymentProviders` | Multi-provider payment setup |
| `paymentAccounts` | Provider-specific account details |
| `activityLogs` | User action audit trail |
| `comments` | User comments on items |
| `votes` | User votes/ratings |
| `favorites` | User favorites/bookmarks |
| `notifications` | In-app notifications |
| `seedStatus` | Seed tracking (singleton record) |

## Migration System

### Migration Commands

| Command | Script | Description |
|---------|--------|-------------|
| `pnpm db:generate` | `drizzle-kit generate` | Generate SQL from schema changes |
| `pnpm db:migrate` | `drizzle-kit migrate` | Apply pending migrations (Drizzle CLI) |
| `pnpm db:migrate:cli` | `scripts/cli-migrate.ts` | Apply migrations with detailed logging |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI |

### Migration Files

Migrations are stored as SQL files in `lib/db/migrations/`:

```
lib/db/migrations/
  0000_burly_darkstar.sql
  0001_add_image_to_users.sql
  0002_silly_victor_mancha.sql
  ...
  0028_tiresome_mauler.sql
  meta/
    _journal.json
```

Each file contains the SQL statements for that migration. Drizzle tracks applied migrations in the `drizzle.__drizzle_migrations` table.

### Idempotent Migration Runner

The migration runner at `lib/db/migrate.ts` is safe to call on every application startup:

```typescript
export async function runMigrations(): Promise<boolean> {
  try {
    const { db } = await import('./drizzle');

    // Log current migration state
    const result = await db.execute(sql`
      SELECT hash, created_at
      FROM drizzle.__drizzle_migrations
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Run migrations (skips already-applied ones)
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    return true;
  } catch (error) {
    console.error('[Migration] Database migrations failed:', error);
    return false;
  }
}
```

### Build-Time Migrations

The `scripts/build-migrate.ts` script runs during `pnpm build` to ensure the schema is up-to-date before deployment:

- **Production builds**: Migration failures fail the build
- **Preview deployments**: Connection errors are tolerated
- **CI builds** (non-Vercel): Migrations are skipped
- **Schema verification**: Checks that critical columns exist after migration

```bash
# Skip build-time migrations for environments without DB
SKIP_BUILD_MIGRATIONS=true pnpm build
```

### CLI Migration Tool

The `scripts/cli-migrate.ts` provides a verbose migration tool for manual operations:

```bash
# Run against DATABASE_URL from .env.local
pnpm db:migrate:cli

# Run against a specific database
DATABASE_URL=postgres://... tsx scripts/cli-migrate.ts
```

It performs three steps:
1. Check current migration state (list applied migrations)
2. Run pending migrations
3. Verify schema integrity (check for required columns)

## Database Initialization

### Automatic Init on Startup

The `instrumentation.ts` file triggers `initializeDatabase()` on every application start:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    await initializeDatabase();
  } catch (error) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      throw error; // Fail fast in production
    }
    // In dev/preview, allow app to start for debugging
  }
}
```

### Initialization Sequence

The `lib/db/initialize.ts` performs these steps:

1. **Skip if no DATABASE_URL** -- the database is optional for content-only mode
2. **Run migrations** -- Drizzle handles idempotency (only new migrations run)
3. **Check seed status** -- query the `seed_status` table
4. **Acquire advisory lock** -- prevents race conditions in multi-instance deployments
5. **Run seed** -- populate roles, permissions, admin user
6. **Release lock** -- always released, even on failure

```typescript
// Advisory lock prevents concurrent seeding
const lockResult = await db.execute(
  sql`SELECT pg_try_advisory_lock(12345) as locked`
);
```

### Seed Status Tracking

The `seedStatus` table uses a singleton pattern:

| Status | Meaning |
|--------|---------|
| `seeding` | Seed operation is currently running |
| `completed` | Database has been successfully seeded |
| `failed` | Seed operation failed (will be retried) |

Failed seeds are automatically cleaned up on the next startup. Stale `seeding` records (older than 5 minutes) are also cleaned up.

## Seeding

### Manual Seeding

```bash
# Seed the database with initial data
pnpm db:seed
```

The seed script at `lib/db/seed.ts`:

1. Verifies `DATABASE_URL` is set
2. Checks table existence before inserting
3. Seeds roles (super-admin, admin, editor, user, viewer)
4. Seeds permissions (items, categories, tags, roles, users, analytics, system)
5. Creates role-permission mappings
6. Creates an admin user (from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` or auto-generated)

### Admin Credentials

In production, set explicit admin credentials:

```bash
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=your-secure-password
```

If not set, the seed script auto-generates credentials and logs them to the console.

## Monitoring

### Drizzle Studio

Browse the database with a graphical interface:

```bash
pnpm db:studio
```

Opens at `https://local.drizzle.studio` with table browsing, query execution, and relationship visualization.

### Connection Health

| Scenario | Behavior |
|----------|----------|
| Server start | No connection until first query (lazy init) |
| Connection drop | Auto-reconnect on next query |
| Pool exhausted | Requests queue until a connection is available |
| Idle timeout | Connections released after 20 seconds |
| HMR reload | Reuses existing pool via `globalThis` |

### Database Health Check

The `/api/health` endpoint can verify database connectivity. Use it for uptime monitoring:

```bash
curl -s https://yourdomain.com/api/health
```

## Related Files

| File | Purpose |
|------|---------|
| `drizzle.config.ts` | Drizzle Kit configuration |
| `lib/db/config.ts` | Script-safe env helpers |
| `lib/db/drizzle.ts` | Connection pool and singleton |
| `lib/db/schema.ts` | Complete schema definitions |
| `lib/db/migrate.ts` | Idempotent migration runner |
| `lib/db/initialize.ts` | Auto-migrate, seed, lock management |
| `lib/db/seed.ts` | Database seeding logic |
| `scripts/build-migrate.ts` | Build-time migration runner |
| `scripts/cli-migrate.ts` | Manual migration CLI |
| `scripts/cli-seed.ts` | Manual seed CLI |
| `scripts/clean-database.js` | Database reset utility |
