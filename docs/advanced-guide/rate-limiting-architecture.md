---
id: rate-limiting-architecture
title: Rate Limiting Architecture
sidebar_label: Rate Limiting
sidebar_position: 5
---

# Rate Limiting Architecture

This guide covers the rate limiting system, including the in-memory store, per-route configuration, sliding window behavior, rate limit headers, and bypass rules.

## Architecture Overview

```
Rate Limiting Flow
===================

  Incoming Request
       |
       v
  +------------------------+
  | Extract Identifier     |  <-- IP address, user ID, API key
  +------------------------+
       |
       v
  +------------------------+
  | Build Rate Limit Key   |  <-- "ip:192.168.1.1:/api/items"
  +------------------------+
       |
       v
  +------------------------+
  | Check In-Memory Store  |
  |   Entry exists?        |
  |   Window expired?      |
  |   Count < limit?       |
  +------------------------+
       |
  +----+----+
  ALLOW     DENY
  |         |
  v         v
  Increment   Return 429
  counter     + Retry-After
  Continue    + Rate limit headers
```

## Core Rate Limiting Function

The `ratelimit` function in `lib/utils/rate-limit.ts` implements a fixed-window rate limiter:

```typescript
// lib/utils/rate-limit.ts
export async function ratelimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + windowMs;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment counter
  entry.count++;
  return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}
```

### Rate Limit Result Interface

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## In-Memory Store

The rate limiter uses a `Map<string, RateLimitEntry>` for O(1) lookups:

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Automatic Cleanup

Expired entries are cleaned up every 5 minutes to prevent memory leaks:

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

## Per-Route Configuration

### Recommended Limits

| Route Pattern | Limit | Window | Rationale |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 min | Prevent brute force |
| `POST /api/auth/register` | 3 | 1 hour | Prevent account spam |
| `POST /api/comments` | 10 | 1 min | Prevent comment spam |
| `GET /api/items` | 100 | 1 min | Allow browsing |
| `POST /api/submit` | 5 | 10 min | Prevent submission spam |
| `POST /api/contact` | 3 | 1 hour | Prevent email spam |
| `POST /api/webhook/*` | 1000 | 1 min | High throughput for providers |

### Implementing Per-Route Limits

```typescript
// In an API route handler
import { ratelimit } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `signin:${ip}`;

  const result = await ratelimit(key, 5, 15 * 60 * 1000);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  // Process the request...
}
```

## Rate Limit Headers

Include standard rate limit headers in all API responses:

```typescript
function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  if (!result.success && result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter));
  }

  return response;
}
```

### Header Reference

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests per window | `100` |
| `X-RateLimit-Remaining` | Requests remaining in window | `87` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1709654400000` |
| `Retry-After` | Seconds until next allowed request | `45` |

## Checking Rate Limit Status

Query current status without incrementing the counter:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Resetting Rate Limits

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Bypass Rules

### Trusted Sources

```typescript
const BYPASS_IPS = new Set([
  '127.0.0.1',           // Localhost
  '::1',                 // IPv6 localhost
]);

const BYPASS_AGENTS = new Set([
  'stripe-webhook',
  'lemonsqueezy-webhook',
]);

function shouldBypass(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') || '';

  // Bypass for trusted IPs
  if (ip && BYPASS_IPS.has(ip)) return true;

  // Bypass for webhook providers
  if (BYPASS_AGENTS.has(userAgent)) return true;

  // Bypass for authenticated admin users
  // (check session in middleware)

  return false;
}
```

## Composite Key Strategies

### IP-Based (Anonymous)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### User-Based (Authenticated)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Combined (IP + Route)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Performance Considerations

1. **Memory usage**: Each entry uses ~100 bytes. At 100,000 active keys, that is ~10 MB.
2. **Cleanup frequency**: The 5-minute cleanup interval is a good balance. Reduce for high-traffic applications.
3. **Map performance**: JavaScript `Map` provides O(1) get/set. No performance concerns up to millions of entries.
4. **Distributed deployment**: The in-memory store does not share state across instances. For multi-instance deployments, use Redis-backed rate limiting.

## Production Considerations

### Multi-Instance Deployments

The in-memory rate limiter does not share state across server instances. For production:

```typescript
// Option 1: Redis-backed rate limiter (recommended for production)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Option 2: Accept per-instance limiting
// Each instance has its own counter. Effective limit = limit * instance_count.
```

### Sliding Window vs. Fixed Window

The current implementation uses **fixed windows**. This means a burst of requests at the window boundary could allow up to `2 * limit` requests in a short period. For stricter limiting, implement a sliding window:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Troubleshooting

### Rate limit not enforced

1. Verify the key is unique per client (check IP extraction).
2. Ensure `ratelimit()` is called before the request handler logic.
3. Check that the response is returned immediately on `!result.success`.

### All requests rate limited immediately

1. Check that the `limit` parameter is not 0 or negative.
2. Verify that the `windowMs` parameter is in milliseconds, not seconds.
3. Check the key -- if all requests share the same key, they share the same limit.

### Memory growing without bound

1. The 5-minute cleanup interval should handle this. Verify the interval timer is running.
2. Call `resetRateLimit(key)` to manually clear specific keys.
3. Monitor the store size in development.

## Related Documentation

- [Error Recovery Patterns](./error-recovery-patterns.md)
- [Webhook Architecture](./webhook-architecture.md)
- [Session Management Deep Dive](./session-management-deep-dive.md)
