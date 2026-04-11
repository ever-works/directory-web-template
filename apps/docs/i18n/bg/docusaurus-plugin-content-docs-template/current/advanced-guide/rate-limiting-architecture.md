---
id: rate-limiting-architecture
title: Архитектура с ограничаване на скоростта
sidebar_label: Ограничаване на скоростта
sidebar_position: 5
---

# Архитектура с ограничаване на скоростта

Това ръководство обхваща системата за ограничаване на скоростта, включително съхраняването в паметта, конфигурация за всеки маршрут, поведение на плъзгащ се прозорец, заглавки на ограничение на скоростта и правила за заобикаляне.

## Преглед на архитектурата

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

## Основна функция за ограничаване на скоростта

Функцията `ratelimit` в `lib/utils/rate-limit.ts` имплементира ограничител на скоростта на фиксиран прозорец:

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

### Интерфейс за резултат от ограничение на скоростта

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## Съхранение в паметта

Ограничителят на скоростта използва `Map<string, RateLimitEntry>` за O(1) търсения:

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Автоматично почистване

Изтеклите записи се почистват на всеки 5 минути, за да се предотврати изтичане на памет:

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

## Конфигурация за всеки маршрут

### Препоръчителни лимити

| Образец на маршрут | Лимит | Прозорец | Обосновка |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 минути | Предотвратяване на груба сила |
| `POST /api/auth/register` | 3 | 1 час | Предотвратяване на спам в акаунта |
| `POST /api/comments` | 10 | 1 мин | Предотвратяване на спам в коментарите |
| `GET /api/items` | 100 | 1 мин | Разрешаване на сърфиране |
| `POST /api/submit` | 5 | 10 минути | Предотвратяване на спам при изпращане |
| `POST /api/contact` | 3 | 1 час | Предотвратяване на спам по имейл |
| `POST /api/webhook/*` | 1000 | 1 мин | Висока производителност за доставчици |

### Внедряване на ограничения за всеки маршрут

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

## Заглавки за ограничение на скоростта

Включете стандартни заглавки за ограничение на скоростта във всички отговори на API:

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

### Препратка към заглавието

| Заглавка | Описание | Пример |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Максимален брой заявки на прозорец | `100` |
| `X-RateLimit-Remaining` | Оставащи заявки в прозореца | `87` |
| `X-RateLimit-Reset` | Времево клеймо на Unix, когато прозорецът се нулира | `1709654400000` |
| `Retry-After` | Секунди до следващата разрешена заявка | `45` |

## Проверка на състоянието на лимита на скоростта

Запитване за текущо състояние без увеличаване на брояча:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Нулиране на ограниченията на скоростта

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Правила за заобикаляне

### Доверени източници

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

## Композитни ключови стратегии

### Базиран на IP (анонимен)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Базирано на потребителя (удостоверено)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Комбинирано (IP + маршрут)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Съображения за производителност

1. **Използване на памет**: Всеки запис използва ~100 байта. При 100 000 активни ключа това е ~10 MB.
2. **Честота на почистване**: 5-минутният интервал на почистване е добър баланс. Намалете за приложения с голям трафик.
3. **Ефективност на картата**: JavaScript `Map` предоставя O(1) get/set. Няма проблеми с производителността до милиони записи.
4. **Разпределено внедряване**: Съхранението в паметта не споделя състояние между инстанции. За внедрявания с няколко екземпляра използвайте ограничаване на скоростта, поддържано от Redis.

## Производствени съображения

### Внедрявания с няколко инстанции

Ограничителят на скоростта в паметта не споделя състояние между сървърни екземпляри. За производство:

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

### Плъзгащ се прозорец срещу фиксиран прозорец

Текущата реализация използва **фиксирани прозорци**. Това означава, че поредица от заявки на границата на прозореца може да позволи до `2 * limit` заявки за кратък период. За по-стриктно ограничаване приложете плъзгащ се прозорец:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Отстраняване на неизправности

### Лимитът на скоростта не е наложен

1. Проверете дали ключът е уникален за клиент (проверете извличането на IP).
2. Уверете се, че `ratelimit()` се извиква преди логиката на манипулатора на заявки.
3. Проверете дали отговорът се връща веднага на `!result.success` .

### Скоростта на всички заявки е ограничена незабавно

1. Проверете дали параметърът `limit` не е 0 или отрицателен.
2. Проверете дали параметърът `windowMs` е в милисекунди, а не в секунди.
3. Проверете ключа -- ако всички заявки споделят един и същ ключ, те споделят същия лимит.

### Паметта расте неограничено

1. 5-минутният интервал на почистване трябва да се справи с това. Проверете дали интервалният таймер работи.
2. Извикайте `resetRateLimit(key)` , за да изчистите ръчно конкретни ключове.
3. Следете размера на магазина в процес на разработка.

## Свързана документация

- [Модели за възстановяване на грешки](./error-recovery-patterns.md)
- [Архитектура на Webhook](./webhook-architecture.md)
- [Дълбоко потапяне в управлението на сесии](./session-management-deep-dive.md)
