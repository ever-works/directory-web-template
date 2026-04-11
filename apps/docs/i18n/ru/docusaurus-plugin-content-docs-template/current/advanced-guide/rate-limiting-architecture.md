---
id: rate-limiting-architecture
title: Архитектура ограничения скорости
sidebar_label: Ограничение скорости
sidebar_position: 5
---

# Архитектура ограничения скорости

В этом руководстве рассматривается система ограничения скорости, включая хранилище в памяти, настройку каждого маршрута, поведение скользящего окна, заголовки ограничения скорости и правила обхода.

## Обзор архитектуры

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

## Функция ограничения частоты ядра

Функция `ratelimit` в `lib/utils/rate-limit.ts` реализует ограничитель скорости с фиксированным окном:

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

### Интерфейс результата ограничения скорости

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## Хранилище в памяти

Ограничитель скорости использует `Map<string, RateLimitEntry>` для поиска O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Автоматическая очистка

Записи с истекшим сроком действия очищаются каждые 5 минут, чтобы предотвратить утечку памяти:

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

## Конфигурация для каждого маршрута

### Рекомендуемые пределы

| Схема маршрута | Лимит | Окно | Обоснование |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 мин | Предотвратить грубую силу |
| `POST /api/auth/register` | 3 | 1 час | Предотвращение спама в аккаунте |
| `POST /api/comments` | 10 | 1 мин | Предотвращение спама в комментариях |
| `GET /api/items` | 100 | 1 мин | Разрешить просмотр |
| `POST /api/submit` | 5 | 10 мин | Предотвращение спама |
| `POST /api/contact` | 3 | 1 час | Предотвращение спама в электронной почте |
| `POST /api/webhook/*` | 1000 | 1 мин | Высокая пропускная способность для провайдеров |

### Реализация ограничений на маршрут

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

## Заголовки ограничения скорости

Включите стандартные заголовки ограничения скорости во все ответы API:

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

### Ссылка на заголовок

| Заголовок | Описание | Пример |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Максимальное количество запросов на окно | `100` |
| `X-RateLimit-Remaining` | Запросы, оставшиеся в окне | `87` |
| `X-RateLimit-Reset` | Временная метка Unix при перезагрузке окна | `1709654400000` |
| `Retry-After` | Секунды до следующего разрешенного запроса | `45` |

## Проверка состояния ограничения скорости

Запросить текущий статус без увеличения счетчика:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Сброс ограничений скорости

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Правила обхода

### Доверенные источники

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

## Составные ключевые стратегии

### На основе IP (анонимно)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### На основе пользователя (с аутентификацией)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Комбинированный (IP + маршрут)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Вопросы производительности

1. **Использование памяти**: каждая запись занимает около 100 байт. При 100 000 активных ключей это ~10 МБ.
2. **Частота очистки**. 5-минутный интервал очистки является хорошим балансом. Уменьшите для приложений с высоким трафиком.
3. **Производительность карты**: JavaScript `Map` обеспечивает операцию получения/установки O(1). Никакая производительность не касается миллионов записей.
4. **Распределенное развертывание**. Хранилище в памяти не передает состояние между экземплярами. Для развертываний с несколькими экземплярами используйте ограничение скорости на основе Redis.

## Производственные соображения

### Развертывания с несколькими экземплярами

Ограничитель скорости в памяти не разделяет состояние между экземплярами сервера. Для производства:

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

### Скользящее окно и фиксированное окно

Текущая реализация использует **фиксированные окна**. Это означает, что пакет запросов на границе окна может разрешить до `2 * limit` запросов за короткий период. Для более строгого ограничения реализуйте скользящее окно:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Устранение неполадок

### Ограничение скорости не применяется

1. Убедитесь, что ключ уникален для каждого клиента (проверьте извлечение IP-адреса).
2. Убедитесь, что `ratelimit()` вызывается перед логикой обработчика запроса.
3. Убедитесь, что ответ возвращается немедленно на `!result.success` .

### Скорость всех запросов немедленно ограничена

1. Убедитесь, что параметр `limit` не равен 0 и не является отрицательным.
2. Убедитесь, что параметр `windowMs` указан в миллисекундах, а не в секундах.
3. Проверьте ключ: если все запросы используют один и тот же ключ, они имеют один и тот же лимит.

### Память растет без ограничений

1. Пятиминутный интервал очистки должен решить эту проблему. Убедитесь, что интервальный таймер работает.
2. Позвоните `resetRateLimit(key)` , чтобы вручную удалить определенные клавиши.
3. Следите за размером магазина в разработке.

## Сопутствующая документация

- [Шаблоны восстановления ошибок](./error-recovery-patterns.md)
- [Архитектура вебхука](./webhook-architecture.md)
- [Подробное описание управления сеансами](./session-management-deep-dive.md)
