---
id: drizzle-config
title: Drizzle ORM Configuration
sidebar_label: Drizzle Config
sidebar_position: 9
---

# Drizzle ORM Configuration

This page documents the Drizzle ORM configuration used by the template for database schema management, migrations, and type-safe query building. The configuration lives in `drizzle.config.ts` at the project root.

## Overview

The template uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL as the database dialect. Drizzle provides type-safe database access, automatic migration generation, and a visual studio for inspecting your database.

## Configuration File

The full configuration is defined in `drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

// Use a dummy URL if DATABASE_URL is not set (DB is optional for this project)
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
```

## Configuration Properties

### `schema`

- **Value:** `"./lib/db/schema.ts"`
- **Purpose:** Points to the file containing all Drizzle table definitions. This is where your `pgTable` declarations live.

The schema file at `lib/db/schema.ts` defines tables using Drizzle's PostgreSQL column builders:

```ts
import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  uniqueIndex,
  index,
  jsonb,
  check,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique(),
  image: text("image"),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // ...additional columns
});
```

### `out`

- **Value:** `"./lib/db/migrations"`
- **Purpose:** Directory where generated SQL migration files are stored. Each time you run `drizzle-kit generate`, new migration files appear here.

### `dialect`

- **Value:** `"postgresql"`
- **Purpose:** Specifies the database engine. The template targets PostgreSQL for production deployments.

### `dbCredentials`

- **Value:** `{ url: databaseUrl }`
- **Purpose:** Connection string for the database. Read from the `DATABASE_URL` environment variable.

## Environment Variable Loading

The configuration loads environment variables from two files, in order:

1. `.env` -- Base environment variables
2. `.env.local` -- Local overrides (takes priority)

```ts
dotenv.config();
dotenv.config({ path: ".env.local" });
```

This dual-loading approach allows you to keep shared defaults in `.env` while overriding database URLs and secrets locally.

## Fallback Database URL

The configuration includes a fallback dummy URL:

```ts
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy_db";
```

This fallback exists because the database is optional for this project. It allows Drizzle Kit commands like `generate` to run even when no real database is available, which is useful during CI/CD or initial project setup.

## Common Commands

The template defines several database-related scripts in `package.json`:

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:migrate` | Apply pending migrations to the database |
| `pnpm db:seed` | Seed the database with initial data |
| `pnpm db:studio` | Open Drizzle Studio for visual database management |

### Generating Migrations

After modifying the schema at `lib/db/schema.ts`, generate a new migration:

```bash
pnpm db:generate
```

This creates a new SQL migration file in `lib/db/migrations/` containing the DDL statements needed to bring the database in sync with your schema.

### Running Migrations

Apply all pending migrations:

```bash
pnpm db:migrate
```

### Automatic Migration on Startup

The template also supports automatic migration during application startup via the instrumentation file. This serves as a fallback for preview deployments:

```ts
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // ...
  try {
    console.log("[Instrumentation] Running database initialization...");
    await initializeDatabase();
    console.log("[Instrumentation] Database initialization completed");
  } catch (error) {
    // In production, re-throw to signal critical failure
    // In development, allow app to start for debugging
  }
}
```

For production builds on Vercel, build-time migrations via `scripts/build-migrate.ts` are the preferred approach.

## Setting Up DATABASE_URL

### Local Development (PostgreSQL)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
```

### Vercel / Production

Set `DATABASE_URL` in your Vercel project environment variables, typically pointing to a managed PostgreSQL instance (Neon, Supabase, Railway, etc.):

```env
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
```

## Type Safety

Because Drizzle generates TypeScript types directly from your schema, all queries are fully type-checked at compile time. There is no separate code generation step required -- the schema file itself is the single source of truth for both database structure and TypeScript types.

## Related Resources

- [Environment Reference](/template/configuration/environment-reference) -- Full list of environment variables including `DATABASE_URL`
- [Database Health Check](/template/guides/database-health-check) -- Monitoring database connectivity
- [Instrumentation Guide](/template/guides/instrumentation) -- Automatic database initialization at startup
