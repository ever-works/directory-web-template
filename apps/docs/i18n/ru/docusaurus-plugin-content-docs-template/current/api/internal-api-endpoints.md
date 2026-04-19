---
id: internal-api-endpoints
title: Внутренние конечные точки API
sidebar_label: Внутренний API
sidebar_position: 64
---

# Внутренние конечные точки API

Внутренний API предоставляет конечные точки системного уровня, используемые для операций инфраструктуры. Эти конечные точки доступны только в режиме разработки и недоступны в рабочей среде.

**Исходный каталог:** `template/app/api/internal/`

---

## Database Initialization

Triggers automatic database migration and seeding if the database is not yet initialized.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/internal/db-init` |
| **Auth** | Development mode only |
| **Runtime** | `nodejs` |
| **Caching** | `force-dynamic` |
| **Source** | `internal/db-init/route.ts` |

### Security

This endpoint is **only accessible in development mode** (`NODE_ENV === 'development'`). In production, it returns a `403 Forbidden` response.

### Response

**Status 200** -- Database initialization completed.

```json
{
  "success": true,
  "message": "Database initialization completed"
}
```

**Status 403** -- Production environment (access denied).

```json
{
  "error": "Not available in production"
}
```

**Status 500** -- Initialization failed.

```json
{
  "success": false,
  "error": "Database initialization failed"
}
```

### What It Does

When called, the endpoint dynamically imports and executes `initializeDatabase()` from `@/lib/db/initialize`, which:

1. Runs pending Drizzle database migrations.
2. Seeds initial data if the database is empty (e.g., default admin user, initial configuration).
3. Ensures the database schema is up to date for development.

### curl Example

```bash
# Initialize database (development only)
curl -s http://localhost:3000/api/internal/db-init
```

### TypeScript Usage

```typescript
// Typically called during development setup
async function initializeDevDatabase(): Promise<void> {
  const res = await fetch('/api/internal/db-init');
  const data = await res.json();

  if (data.success) {
    console.log('Database initialized successfully');
  } else {
    console.error('Database initialization failed:', data.error);
  }
}
```

### Implementation Notes

- The `initializeDatabase()` function is dynamically imported using `await import()` to avoid loading database initialization code in production bundles.
- The route is configured with `export const runtime = 'nodejs'` to ensure it runs in the Node.js runtime (not the Edge runtime), as database operations require full Node.js APIs.
- The route uses `export const dynamic = 'force-dynamic'` to prevent Next.js from caching the response.
- Error handling uses `safeErrorResponse()` to return generic error messages while logging detailed errors server-side.
- This endpoint is designed for use during local development setup and CI/CD pipelines. It should never be exposed in production.

### Related Commands

For manual database operations outside of the API, use the CLI commands:

```bash
# Generate migration files
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed database
pnpm db:seed

# Open database studio
pnpm db:studio
```
