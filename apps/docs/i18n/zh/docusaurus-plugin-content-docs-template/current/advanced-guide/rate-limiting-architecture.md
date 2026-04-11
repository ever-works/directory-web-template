---
id: rate-limiting-architecture
title: 速率限制架构
sidebar_label: 速率限制
sidebar_position: 5
---

# 速率限制架构

本指南涵盖了速率限制系统，包括内存存储、每条路由配置、滑动窗口行为、速率限制标头和旁路规则。

## 架构概述

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

## 核心速率限制功能

1中的0函数实现固定窗口速率限制器：

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

### 限速结果接口

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## 内存存储

速率限制器使用 0 进行 O(1) 查找：

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### 自动清理

过期条目每 5 分钟清理一次，以防止内存泄漏：

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

## 每条路由的配置

### 建议限制

|路线模式|限制|窗口|理由|
|--------------|--------|--------|-----------|
| 0 | 5 | 15 分钟 |防止暴力破解 |
| 1 | 3 | 1小时|防止帐户垃圾邮件 |
| 2 | 10 | 10 1 分钟 |防止垃圾评论 |
| 3 | 100 | 100 1 分钟 |允许浏览 |
| 4 | 5 | 10 分钟 |防止提交垃圾邮件 |
| 5 | 3 | 1小时|防止垃圾邮件 |
| 6 | 1000 | 1000 1 分钟 |提供商的高吞吐量 |

### 实施每条路由的限制

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

## 速率限制标头

在所有 API 响应中包含标准速率限制标头：

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

### 标头参考

|标题|描述 |示例|
|--------|-------------|---------|
| 0 |每个窗口的最大请求数 | 1 |
| 2 |窗口中剩余的请求 | 3 |
| 4 |窗口重置时的 Unix 时间戳 | 5 |
| 6 |距下一个允许请求的秒数 | 7 |

## 检查速率限制状态

查询当前状态而不增加计数器：

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## 重置速率限制

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## 绕过规则

### 可信来源

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

## 综合关键策略

### 基于 IP（匿名）

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### 基于用户（经过身份验证）

```typescript
const key = `${route}:user:${session.user.id}`;
```

### 组合（IP + 路由）

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## 性能考虑因素

1. **内存使用**：每个条目使用约 100 字节。如果有 100,000 个活动密钥，则约为 10 MB。
2. **清理频率**：5分钟的清理间隔是一个很好的平衡。减少高流量应用程序。
3. **地图性能**：JavaScript 0 提供 O(1) 获取/设置。多达数百万个条目没有性能问题。
4. **分布式部署**：内存存储不跨实例共享状态。对于多实例部署，请使用 Redis 支持的速率限制。

## 生产注意事项

### 多实例部署

内存中速率限制器不会跨服务器实例共享状态。用于生产：

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

### 滑动窗口与固定窗口

当前的实现使用**固定窗口**。这意味着窗口边界处的请求突发可能会在短时间内允许多达 0 个请求。为了更严格的限制，实现滑动窗口：

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## 故障排除

### 未执行速率限制

1. 验证每个客户端的密钥是唯一的（检查 IP 提取）。
2. 确保在请求处理程序逻辑之前调用0。
3. 检查是否立即在1 返回响应。

### 所有请求速率立即受到限制

1. 检查 `limit` 参数不为0或负数。
2. 验证 `windowMs` 参数的单位是毫秒，而不是秒。
3. 检查密钥——如果所有请求共享相同的密钥，则它们共享相同的限制。

### 内存无限增长

1. 5 分钟的清理间隔应该可以解决这个问题。验证间隔计时器是否正在运行。
2. 拨打4手动清除特定按键。
3. 监控开发中的商店规模。

## 相关文档

- [错误恢复模式](./error-recovery-patterns.md)
- [Webhook架构](./webhook-architecture.md)
- [会话管理深入探讨](./session-management-deep-dive.md)
