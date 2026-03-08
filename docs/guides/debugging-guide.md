---
id: debugging-guide
title: "Debugging Guide"
sidebar_label: "Debugging Guide"
sidebar_position: 78
---

# Debugging Guide

This guide covers common debugging techniques, tools, and workflows for troubleshooting issues in the template. It covers both development and production debugging.

## Prerequisites

- Development environment set up (`pnpm dev` running)
- Familiarity with browser DevTools
- Access to Vercel logs (for production debugging)

---

## Development Debugging Tools

### 1. Logger Utility

The template includes a structured `Logger` class at `lib/logger.ts` that provides context-aware, level-filtered logging:

```typescript
import { Logger } from "@/lib/logger";

const logger = Logger.create("MyService");

logger.debug("Detailed trace info", { userId, itemSlug });
logger.info("Operation completed", { duration: "45ms" });
logger.warn("Potential issue detected", { field: "email" });
logger.error("Operation failed", error);
```

**Key behaviors:**

- In development: all log levels are printed with colored output (in browser)
- In production: only `WARN` and `ERROR` levels are printed
- The `context` parameter tags every log line for easy filtering

### 2. API Request Logging

The Logger has a dedicated `api()` method for tracing HTTP calls:

```typescript
logger.api("POST", "/api/bookmarks", { itemSlug: "my-tool" });
```

### 3. Performance Logging

Use the `performance()` method to track timing:

```typescript
const start = Date.now();
await expensiveOperation();
logger.performance("expensiveOperation", Date.now() - start);
```

---

## Debugging API Routes

### Check the Response

Use `curl` or the browser's Network tab to inspect API responses:

```bash
# Check an API endpoint
curl -v http://localhost:3000/api/health

# With authentication
curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  http://localhost:3000/api/admin/stats
```

### Inspect the Error Response

API routes in the template use `safeErrorResponse` and `safeErrorMessage` from `lib/utils/api-error.ts` to produce consistent error payloads:

```json
{
  "error": "Failed to create bookmark",
  "details": "Unique constraint violation on (user_id, item_slug)"
}
```

### Add Temporary Logging

For tricky bugs, add temporary `console.log` statements in the route handler. The output appears in the terminal running `pnpm dev`:

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  console.log("[DEBUG] Received body:", JSON.stringify(body, null, 2));
  // ...
}
```

Remove temporary logs before committing.

---

## Debugging Database Issues

### Drizzle Studio

Open an interactive database browser:

```bash
pnpm db:studio
```

This launches a web UI at `https://local.drizzle.studio` where you can browse tables, run queries, and inspect data.

### Check Migration Status

If tables are missing or schema is wrong, check migration state:

```bash
pnpm db:migrate
```

The migration runner logs which migrations are applied:

```
[Migration] Recent applied migrations: [{"hash":"abc123","created_at":"2025-01-15"}]
[Migration] Migrations completed (new migrations applied or already up-to-date)
```

### Common Database Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `relation "users" does not exist` | Migrations have not run | Run `pnpm db:migrate` |
| `DATABASE_URL environment variable is required` | Missing env var | Add `DATABASE_URL` to `.env.local` |
| `connection refused` | Database not running | Start your PostgreSQL server |
| `too many clients already` | Connection pool exhausted | Reduce `DB_POOL_SIZE` or check for connection leaks |
| `duplicate key value violates unique constraint` | Trying to insert a duplicate | Add upsert logic or check for existing records first |

### Query Debugging

To see the SQL being generated, add a temporary `.toSQL()` call:

```typescript
const query = db
  .select()
  .from(bookmarks)
  .where(eq(bookmarks.userId, userId));

console.log("[DEBUG] SQL:", query.toSQL());

const results = await query;
```

---

## Debugging Authentication

### Session Inspection

Check the current session in a Server Component:

```typescript
import { auth } from "@/lib/auth";

const session = await auth();
console.log("[DEBUG] Session:", JSON.stringify(session, null, 2));
```

### Common Auth Issues

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| Always redirected to login | `AUTH_SECRET` not set or changed | Set `AUTH_SECRET` and clear cookies |
| OAuth callback error | Wrong callback URL in provider dashboard | Update to `http://localhost:3000/api/auth/callback/<provider>` |
| Session expires immediately | `COOKIE_SECURE=true` in development | Set `COOKIE_SECURE=false` for local dev |
| "CSRF token mismatch" | Multiple auth secrets or domain mismatch | Ensure `AUTH_SECRET` matches across environments |

---

## Debugging Client-Side Issues

### React DevTools

Install the React DevTools browser extension to inspect component trees, props, and state.

### React Query DevTools

The template uses React Query for data fetching. The React Query DevTools overlay shows:

- Active queries and their status
- Cache state
- Refetch triggers

### PostHog Debug Mode

Enable PostHog debug logging to see events in the browser console:

```bash
NEXT_PUBLIC_POSTHOG_DEBUG=true
```

### Sentry Integration

In development, Sentry captures errors and sends them to the configured DSN. Check the Sentry dashboard for error details including:

- Stack traces
- Breadcrumbs (recent user actions)
- Environment metadata

---

## Debugging Production Issues

### Vercel Logs

Access real-time and historical logs in the Vercel dashboard:

1. Go to your project in Vercel
2. Click "Logs" in the sidebar
3. Filter by function name, status code, or time range

### Vercel Function Logs

Serverless function output (including `console.log` from API routes) appears in Vercel's function logs. Filter by:

- **Path**: `/api/cron/sync`, `/api/stripe/webhook`, etc.
- **Status**: `500`, `4xx` for errors
- **Level**: Error, Warning, Info

### Sentry Error Tracking

For production errors:

1. Check the Sentry dashboard for new issues
2. Review the stack trace and breadcrumbs
3. Check the release and environment tags
4. Use the "Discover" view to query error patterns

### Instrumentation Errors

The `instrumentation.ts` file logs database initialization status on every server start:

```
[Instrumentation] Running database initialization...
[Instrumentation] Database initialization completed
```

If initialization fails, you will see detailed error messages:

```
[Instrumentation] Database initialization failed: connection refused
[Instrumentation] Error details: { message: "...", stack: "...", name: "Error" }
```

---

## Debugging Webhooks

### Local Testing

Use a tunneling tool to test webhooks locally:

```bash
# Using ngrok
ngrok http 3000
```

Then configure the webhook URL in the provider dashboard to point to the ngrok URL.

### Webhook Debugging Checklist

1. Check the provider's webhook delivery logs (Stripe Dashboard, LemonSqueezy, etc.)
2. Verify the webhook secret matches the environment variable
3. Check Vercel function logs for the webhook endpoint
4. Look for signature verification failures in the logs
5. Verify the raw body is being read (not parsed JSON) before signature verification

---

## Debugging Build Failures

### Common Build Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Module not found: @/lib/...` | Import path typo | Check file paths and barrel exports |
| `Type error: Property X does not exist` | Type mismatch | Run `pnpm tsc --noEmit` locally to reproduce |
| `Error: NEXT_PUBLIC_* not available` | Missing env var in Vercel | Add the variable to Vercel project settings |
| `Build exceeded memory limit` | Large bundle or infinite loop | Check for circular imports; optimize imports |

### Build Debugging Workflow

```bash
# Step 1: Check TypeScript types
pnpm tsc --noEmit

# Step 2: Check linting
pnpm lint

# Step 3: Full build
pnpm build

# Step 4: If build fails, check the specific error in the build output
# and trace back to the source file
```

---

## Debugging Performance Issues

### Next.js Build Analyzer

Add `ANALYZE=true` to see a visual bundle analysis:

```bash
ANALYZE=true pnpm build
```

### Slow API Routes

Add timing to identify bottlenecks:

```typescript
export async function GET(request: Request) {
  const start = Date.now();

  const dbStart = Date.now();
  const data = await fetchData();
  console.log(`[PERF] DB query: ${Date.now() - dbStart}ms`);

  const transformStart = Date.now();
  const result = transformData(data);
  console.log(`[PERF] Transform: ${Date.now() - transformStart}ms`);

  console.log(`[PERF] Total: ${Date.now() - start}ms`);

  return NextResponse.json(result);
}
```

---

## Quick Reference: Debugging Commands

```bash
# Start development server with verbose output
pnpm dev

# Type check (catches many issues)
pnpm tsc --noEmit

# Lint check
pnpm lint

# Database inspection
pnpm db:studio

# Run migrations
pnpm db:migrate

# Check environment variables
node scripts/check-env.js
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Debugging in production with `console.log` | Use the Logger utility and Sentry instead; `console.log` in production adds noise |
| Leaving debug logs in committed code | Use `logger.debug()` which is automatically suppressed in production |
| Not checking the browser console | Client-side errors appear in the browser console, not the server terminal |
| Ignoring TypeScript errors | Always run `pnpm tsc --noEmit` before deploying; type errors can cause runtime failures |

---

## Related Pages

- [Logging](/template/guides/logging) -- structured logging setup
- [Error Handling](/template/guides/error-handling) -- error boundary and response patterns
- [Database Health Check](/template/guides/database-health-check) -- database connectivity monitoring
- [Performance Optimization](/template/guides/performance-optimization) -- identifying and fixing performance issues
- [Deployment Checklist](/template/guides/deployment-checklist) -- pre-deployment verification
