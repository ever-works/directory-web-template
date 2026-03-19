---
id: database-health-check
title: "Database Health Check"
sidebar_label: "Database Health Check"
sidebar_position: 23
---

# Database Health Check

The `database-check` module (`lib/utils/database-check.ts`) provides a lightweight utility for verifying database availability in API routes. It checks whether the `DATABASE_URL` environment variable is configured and returns an appropriate HTTP response when the database is unavailable.

## Overview

Many features in the template require a database connection. Rather than letting those features fail with cryptic errors when the database is not configured, the health check utility provides a clean guard that returns a structured JSON error with HTTP status `503` (Service Unavailable).

This is particularly useful for:

- **Local development** -- Running the template without a database to test non-database features
- **Deployment validation** -- Catching misconfigured environments early
- **API route guards** -- Providing consistent error responses when database features are unavailable

## Function

### checkDatabaseAvailability

Checks if the `DATABASE_URL` environment variable is set. Returns `null` if the database is available, or a `NextResponse` with a 503 error if not:

```ts
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export async function GET() {
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) {
    return dbCheck; // Returns 503 response
  }

  // Proceed with database operations
  const data = await db.query.items.findMany();
  return Response.json(data);
}
```

### Implementation

```ts
import { NextResponse } from 'next/server';

export function checkDatabaseAvailability(): NextResponse | null {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: 'Database not configured',
        code: 'DATABASE_UNAVAILABLE',
        message: 'This feature requires database configuration',
      },
      { status: 503 }
    );
  }
  return null;
}
```

### Return Values

| Condition | Return Value |
|-----------|-------------|
| `DATABASE_URL` is set | `null` (proceed normally) |
| `DATABASE_URL` is not set | `NextResponse` with 503 status |

### Error Response Format

When the database is unavailable, the response body follows the template's standard error format:

```json
{
  "error": "Database not configured",
  "code": "DATABASE_UNAVAILABLE",
  "message": "This feature requires database configuration"
}
```

| Field | Value | Purpose |
|-------|-------|---------|
| `error` | `"Database not configured"` | Human-readable error summary |
| `code` | `"DATABASE_UNAVAILABLE"` | Machine-readable error code for client handling |
| `message` | `"This feature requires database configuration"` | Detailed explanation |

The HTTP status code is `503` (Service Unavailable), which correctly signals that the service is temporarily unable to handle the request due to a configuration issue.

## Usage Patterns

### API Route Guard

The most common pattern is placing the check at the top of an API route handler:

```ts
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Guard: ensure database is available
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) return dbCheck;

  // Safe to use database
  const users = await db.query.users.findMany();
  return NextResponse.json({ data: users });
}

export async function POST(request: Request) {
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) return dbCheck;

  const body = await request.json();
  const user = await db.insert(users).values(body);
  return NextResponse.json({ data: user }, { status: 201 });
}
```

### Multiple Route Handlers

When a route file exports multiple HTTP method handlers, add the check to each one:

```ts
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export async function GET() {
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) return dbCheck;
  // ...
}

export async function PUT(request: Request) {
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) return dbCheck;
  // ...
}

export async function DELETE(request: Request) {
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) return dbCheck;
  // ...
}
```

### Conditional Feature Availability

Use the check to conditionally disable database-dependent features:

```ts
import { checkDatabaseAvailability } from '@/lib/utils/database-check';

export async function GET(request: Request) {
  const dbCheck = checkDatabaseAvailability();

  if (dbCheck) {
    // Database not available, return static/cached data
    return Response.json({
      data: getStaticFallbackData(),
      source: 'static',
    });
  }

  // Database available, return live data
  const data = await db.query.items.findMany();
  return Response.json({ data, source: 'database' });
}
```

### Combining with Other Guards

The database check works alongside other route guards:

```ts
import { checkDatabaseAvailability } from '@/lib/utils/database-check';
import { validatePaginationParams } from '@/lib/utils/pagination-validation';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
  // 1. Database availability check
  const dbCheck = checkDatabaseAvailability();
  if (dbCheck) return dbCheck;

  // 2. Authentication check
  const session = await requireAuth(request);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Pagination validation
  const { searchParams } = new URL(request.url);
  const pagination = validatePaginationParams(searchParams);
  if ('error' in pagination) {
    return Response.json(
      { error: pagination.error },
      { status: pagination.status }
    );
  }

  // All guards passed, proceed with request
  const data = await fetchPaginatedData(pagination);
  return Response.json(data);
}
```

## Client-Side Handling

When consuming an API that may return the `DATABASE_UNAVAILABLE` error, clients can check the error code:

```ts
async function fetchData() {
  const response = await fetch('/api/items');

  if (!response.ok) {
    const error = await response.json();

    if (error.code === 'DATABASE_UNAVAILABLE') {
      // Show user-friendly message
      showMessage('This feature is not available. Database is not configured.');
      return;
    }

    throw new Error(error.message);
  }

  return response.json();
}
```

## Design Decisions

### Why Check Environment Variable Instead of Connection

The utility checks `process.env.DATABASE_URL` rather than attempting an actual database connection. This is intentional for several reasons:

1. **Fast** -- No network round-trip required
2. **No side effects** -- Does not create connections or consume pool resources
3. **Early failure** -- Catches misconfiguration before any database code runs
4. **Synchronous** -- Can be called without `await`

For actual connection health monitoring (testing that the database is reachable and responding), use a dedicated health check endpoint that performs a test query.

### Why Return NextResponse Instead of Throwing

Returning a `NextResponse` instead of throwing an error keeps the control flow explicit and avoids the need for error boundary handling in every route. The calling code simply checks if the result is non-null:

```ts
const dbCheck = checkDatabaseAvailability();
if (dbCheck) return dbCheck;
```

This pattern is consistent with the `validatePaginationParams` discriminated union pattern used elsewhere in the template.

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/database-check.ts` | Database availability guard utility |
