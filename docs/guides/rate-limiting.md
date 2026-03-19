---
id: rate-limiting
title: "Rate Limiting"
sidebar_label: "Rate Limiting"
sidebar_position: 22
---

# Rate Limiting

The template includes a simple, in-memory rate limiting utility for protecting API routes from abuse. It provides a sliding-window counter with automatic cleanup.

**Source:** `lib/utils/rate-limit.ts`

## Overview

The rate limiter operates as an in-memory store (a JavaScript `Map`) that tracks request counts per key within configurable time windows. It is designed for single-server deployments; for production environments with multiple server instances, consider using Redis or a dedicated rate limiting service.

Key features:
- **Per-key tracking** -- rate limit by IP address, user ID, API key, or any identifier
- **Configurable windows** -- set custom time windows per endpoint
- **Automatic cleanup** -- expired entries are purged every 5 minutes
- **Status inspection** -- check remaining quota without consuming a request
- **Manual reset** -- clear rate limits for specific keys

## Core Function

### `ratelimit(key, limit, windowMs)`

The primary rate limiting function. Returns a result indicating whether the request should be allowed:

```ts
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  'api:items:192.168.1.1',  // unique key
  100,                       // max 100 requests
  60 * 1000                  // per 60 seconds
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfter),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(result.resetTime),
    },
  });
}
```

### RateLimitResult

```ts
interface RateLimitResult {
  success: boolean;      // Whether the request is allowed
  remaining: number;     // Requests remaining in current window
  resetTime: number;     // Timestamp when the window resets (ms)
  retryAfter?: number;   // Seconds until retry is possible (only when blocked)
}
```

## How It Works

The rate limiter uses a **fixed window** strategy:

1. **First request** -- creates a new entry with `count: 1` and a `resetTime` set to `now + windowMs`
2. **Subsequent requests** -- if the window has not expired, increments the counter
3. **Window expired** -- if `now > entry.resetTime`, resets the counter to 1 and sets a new window
4. **Limit reached** -- if `count >= limit`, returns `success: false` with `retryAfter` in seconds

### Window Behavior

```
Time:  0s        30s       60s       90s
       |---------|---------|---------|
       Window 1 (60s)     Window 2 (60s)
       count: 1..100      count: 1..

At 30s: count=50, remaining=50
At 60s: window expires, count resets
```

## Helper Functions

### Check Status Without Incrementing

```ts
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus('api:items:192.168.1.1', 100);
// { remaining: 73, resetTime: 1706123456789 }

// If no active window exists:
// { remaining: 100, resetTime: null }
```

### Reset a Rate Limit

Manually clear the rate limit for a specific key:

```ts
import { resetRateLimit } from '@/lib/utils/rate-limit';

resetRateLimit('api:items:192.168.1.1');
```

## Automatic Cleanup

Expired entries are automatically purged every 5 minutes to prevent memory growth:

```ts
// Internal cleanup runs automatically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

## API Route Integration

### Basic Pattern

```ts
import { ratelimit } from '@/lib/utils/rate-limit';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') ?? 'unknown';

  // 10 requests per minute
  const rateLimitResult = await ratelimit(`submit:${ip}`, 10, 60 * 1000);

  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfter),
        },
      }
    );
  }

  // Process the request...
}
```

### Different Limits per Endpoint

```ts
// Strict limit for auth endpoints
const authLimit = await ratelimit(`auth:${ip}`, 5, 15 * 60 * 1000);

// Moderate limit for API reads
const readLimit = await ratelimit(`read:${ip}`, 100, 60 * 1000);

// Strict limit for write operations
const writeLimit = await ratelimit(`write:${ip}`, 20, 60 * 1000);
```

### User-Based Rate Limiting

```ts
// Rate limit by authenticated user instead of IP
const session = await getSession();
const key = session?.user?.id
  ? `user:${session.user.id}`
  : `ip:${ip}`;

const result = await ratelimit(key, 50, 60 * 1000);
```

### Composite Keys

Combine multiple identifiers for granular control:

```ts
// Per-user, per-endpoint limiting
const key = `${session.user.id}:items:create`;
const result = await ratelimit(key, 10, 60 * 1000);

// Per-IP, per-route limiting
const key = `${ip}:api:search`;
const result = await ratelimit(key, 30, 60 * 1000);
```

## Response Headers

When implementing rate limiting, include standard headers in your responses:

```ts
const responseHeaders = {
  'X-RateLimit-Limit': String(limit),
  'X-RateLimit-Remaining': String(result.remaining),
  'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
};

if (!result.success) {
  responseHeaders['Retry-After'] = String(result.retryAfter);
}
```

## Recommended Limits

| Endpoint Type       | Suggested Limit | Window    |
|---------------------|-----------------|-----------|
| Authentication      | 5 requests      | 15 minutes|
| Item submission     | 10 requests     | 1 minute  |
| Search / listing    | 100 requests    | 1 minute  |
| File upload         | 5 requests      | 5 minutes |
| Webhook endpoints   | 200 requests    | 1 minute  |
| Admin operations    | 50 requests     | 1 minute  |

## Limitations

- **Single-server only** -- the in-memory store is not shared across server instances. For multi-instance deployments, replace with a Redis-backed implementation.
- **Fixed window** -- the current implementation uses fixed windows, which can allow brief bursts at window boundaries. A sliding window or token bucket algorithm would provide smoother rate limiting.
- **No persistence** -- rate limit counters are lost on server restart.
- **Memory usage** -- each key-value pair in the Map uses minimal memory, but extremely high cardinality keys (e.g., per-request UUIDs) could grow the map. The 5-minute cleanup mitigates this.
