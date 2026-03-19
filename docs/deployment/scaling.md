---
id: scaling
title: Scaling & High Availability
sidebar_label: Scaling
sidebar_position: 4
---

# Scaling & High Availability

This guide covers strategies for scaling the Ever Works Template from a single-instance deployment to a highly available production setup, including serverless configuration, connection pooling, CDN optimization, and edge functions.

## Deployment Architecture

The template supports multiple deployment architectures:

| Architecture | Best For | Scaling Model |
|---|---|---|
| Vercel (Serverless) | Most deployments | Automatic horizontal scaling |
| Docker (Standalone) | Self-hosted, on-premise | Manual or orchestrator-based scaling |
| Node.js (Direct) | Development, simple deployments | Single instance or PM2 cluster |

## Serverless Configuration (Vercel)

### Standalone Output

The template is configured with standalone output for optimal serverless deployment:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

Standalone mode produces a self-contained build in `.next/standalone/` that includes only the files necessary to run the application. This minimizes cold start times by reducing the deployment package size.

### Function Configuration

Configure serverless function settings in `vercel.json` or via route-level configuration:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // seconds (Pro plan: up to 300s)
export const dynamic = 'force-dynamic';
```

### Recommended Function Settings

| Route Type | Max Duration | Memory | Notes |
|---|---|---|---|
| API routes (simple) | 10s | 1024 MB | Default for most endpoints |
| API routes (data processing) | 30s | 1024 MB | For batch operations |
| Cron jobs | 60s | 1024 MB | Background task execution |
| Webhook handlers | 30s | 1024 MB | Payment, OAuth callbacks |
| Static pages | N/A | N/A | Pre-rendered at build time |

### Cold Start Optimization

Minimize cold starts with these techniques:

| Technique | Implementation | Impact |
|---|---|---|
| Minimize function size | `serverExternalPackages` in config | Reduces initialization time |
| Avoid top-level imports | Dynamic `import()` for heavy modules | Defers loading until needed |
| Use edge runtime where possible | `export const runtime = 'edge'` | Near-zero cold start |
| Warm functions | Health check endpoints with monitoring | Keeps functions active |

## Database Connection Pooling

### The Problem

In serverless environments, each function invocation may open a new database connection. Without pooling, this can exhaust the database's connection limit.

### Solution: Connection Pooler

Use a connection pooler between your application and database:

| Pooler | Provider | Setup |
|---|---|---|
| PgBouncer | Supabase (built-in) | Use the pooled connection string (port 6543) |
| Neon Pooler | Neon (built-in) | Use the `-pooler` connection string |
| PgBouncer | Self-hosted | Deploy PgBouncer alongside PostgreSQL |

### Configuration

Use different connection strings for pooled and direct connections:

```bash
# Pooled connection for application queries (serverless-safe)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Direct connection for migrations only
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Update `drizzle.config.ts` to use the direct connection for migrations:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Connection Limits

| Tier | Max Connections | Recommended Pool Size |
|---|---|---|
| Hobby (Neon/Supabase) | 50-100 | 10-20 |
| Pro (Neon/Supabase) | 200-500 | 50-100 |
| Enterprise | 1000+ | 100-200 |

### Connection Management in Code

The template's database module should reuse a single connection pool per function instance:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create connection pool once per serverless instance
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Maximum connections in pool
  idle_timeout: 20, // Close idle connections after 20s
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN and Caching

### Vercel Edge Network

When deployed to Vercel, the Edge Network automatically provides:

- Global CDN distribution across 30+ regions
- Automatic static asset caching
- Edge caching for ISR (Incremental Static Regeneration) pages
- DDoS protection

### Cache Control Headers

Configure caching for different content types:

```typescript
// API route with cache headers
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Caching Strategy by Content Type

| Content Type | Cache Strategy | TTL | Notes |
|---|---|---|---|
| Static assets (JS, CSS, images) | Immutable | 1 year | Content-hashed filenames |
| Public pages | ISR | 60-300s | Revalidate on demand |
| API responses (public) | `s-maxage` | 10-60s | CDN-level caching |
| API responses (authenticated) | `no-store` | 0 | Never cache user-specific data |
| CMS content pages | ISR | 300s | Revalidate after content sync |

### ISR (Incremental Static Regeneration)

Use ISR for content-heavy pages that change infrequently:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Regenerate every 5 minutes

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### On-Demand Revalidation

Trigger revalidation after content updates:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## Edge Functions

### When to Use Edge Runtime

Edge functions run on Cloudflare Workers (via Vercel) and provide near-zero cold start times. Use them for:

| Use Case | Example |
|---|---|
| Geolocation-based routing | Redirect users to regional content |
| A/B testing | Route to experiment variants |
| Authentication checks | Quick session validation |
| Response transformation | Add headers, modify responses |
| Simple API endpoints | Lightweight data lookups |

### Edge Runtime Limitations

| Limitation | Detail |
|---|---|
| No Node.js APIs | Cannot use `fs`, `child_process`, etc. |
| No native modules | Cannot use `bcryptjs`, `postgres` directly |
| Limited execution time | 30 seconds max (Vercel Pro) |
| Limited memory | 128 MB |
| No Drizzle ORM | Use edge-compatible database clients |

### Example Edge Function

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({
    country,
    city,
    timestamp: Date.now(),
  });
}
```

## Horizontal Scaling Strategies

### Stateless Application Design

The template is designed to be stateless at the application layer:

| Component | State Location | Scaling Impact |
|---|---|---|
| Sessions | Database or JWT | No shared state between instances |
| Background jobs | Job manager (per-instance or Trigger.dev) | Use Trigger.dev for multi-instance |
| File uploads | External storage (S3, Supabase) | No local filesystem dependency |
| CMS content | Git repository (cloned at build/startup) | Read-only, identical per instance |
| Cache | In-memory (per-instance) or Redis | Consider Redis for shared cache |

### Multi-Instance Considerations

When running multiple instances (Docker Swarm, Kubernetes, or multiple Vercel functions):

1. **Background jobs**: Use Trigger.dev or Vercel Cron instead of the `LocalJobManager` to avoid duplicate executions.
2. **Database connections**: Enable connection pooling to prevent connection exhaustion.
3. **Session storage**: Use database sessions instead of in-memory stores.
4. **Cache invalidation**: Implement a shared cache (Redis) or accept eventual consistency with per-instance caches.

## Monitoring at Scale

### Key Metrics to Track

| Metric | Tool | Threshold |
|---|---|---|
| Response time (p95) | Sentry, Vercel Analytics | < 500ms |
| Error rate | Sentry | < 1% |
| Database connection count | Database dashboard | < 80% of max |
| Function cold starts | Vercel Analytics | Monitor frequency |
| Cache hit rate | Application logs | > 80% |
| Memory usage | Vercel/Docker metrics | < 80% of limit |

### Sentry Performance Monitoring

The template configures Sentry with trace sampling:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Adjust `tracesSampleRate` based on traffic volume:

| Daily Requests | Recommended Sample Rate |
|---|---|
| < 10,000 | 1.0 (100%) |
| 10,000-100,000 | 0.1 (10%) |
| 100,000-1,000,000 | 0.01 (1%) |
| > 1,000,000 | 0.001 (0.1%) |

## Load Testing

### Recommended Tools

| Tool | Use Case | Complexity |
|---|---|---|
| `autocannon` | Quick HTTP benchmarks | Low |
| `k6` | Scripted load tests | Medium |
| `Artillery` | Complex scenarios | Medium |
| `Locust` | Python-based, distributed | High |

### Example Load Test

```bash
# Quick benchmark with autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# k6 script for more detailed testing
k6 run load-test.js
```

### Testing Checklist

| Test | Target | Pass Criteria |
|---|---|---|
| Homepage load | 100 concurrent users | p95 < 1s |
| API endpoint | 200 requests/second | p95 < 500ms, 0% errors |
| Search query | 50 concurrent users | p95 < 2s |
| Auth flow | 20 concurrent users | All succeed, no timeouts |

## Scaling Checklist

| Category | Item | Priority |
|---|---|---|
| **Database** | Enable connection pooling | Critical |
| **Database** | Use read replicas for heavy read loads | High |
| **Database** | Add indexes for slow queries | High |
| **Caching** | Configure CDN caching headers | Critical |
| **Caching** | Implement ISR for content pages | High |
| **Caching** | Add Redis for shared cache (if multi-instance) | Medium |
| **Compute** | Use edge runtime for lightweight routes | Medium |
| **Compute** | Optimize cold starts with external packages | High |
| **Jobs** | Switch to Trigger.dev for multi-instance | High |
| **Jobs** | Configure Vercel Cron for scheduled tasks | High |
| **Monitoring** | Set up Sentry with appropriate sampling | Critical |
| **Monitoring** | Configure alerts for error rate and latency | High |
| **Testing** | Run load tests before major launches | High |
