---
id: rate-limiting-architecture
title: Architektura ograniczająca szybkość
sidebar_label: Ograniczanie szybkości
sidebar_position: 5
---

# Architektura ograniczająca szybkość

W tym przewodniku omówiono system ograniczania szybkości, w tym magazyn w pamięci, konfigurację poszczególnych tras, zachowanie przesuwającego się okna, nagłówki limitów szybkości i reguły obejścia.

## Przegląd architektury

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

## Funkcja ograniczania szybkości rdzenia

Funkcja `ratelimit` w `lib/utils/rate-limit.ts` implementuje ogranicznik prędkości o stałym oknie:

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

### Interfejs wyników limitu dawki

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## Przechowywanie w pamięci

Ogranicznik szybkości używa `Map<string, RateLimitEntry>` do wyszukiwań O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Automatyczne czyszczenie

Wygasłe wpisy są czyszczone co 5 minut, aby zapobiec wyciekom pamięci:

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

## Konfiguracja według trasy

### Zalecane limity

| Wzór trasy | Limit | Okno | Uzasadnienie |
|-------------|-------|--------|----------|
| `POST /api/auth/signin` | 5 | 15 minut | Zapobiegaj brutalnej sile |
| `POST /api/auth/register` | 3 | 1 godzina | Zapobiegaj spamowi na koncie |
| `POST /api/comments` | 10 | 1 minuta | Zapobiegaj spamowi w komentarzach |
| `GET /api/items` | 100 | 1 minuta | Zezwalaj na przeglądanie |
| `POST /api/submit` | 5 | 10 minut | Zapobiegaj przesyłaniu spamu |
| `POST /api/contact` | 3 | 1 godzina | Zapobiegaj spamowi e-mailowemu |
| `POST /api/webhook/*` | 1000 | 1 minuta | Wysoka przepustowość dla dostawców |

### Wdrażanie limitów na trasę

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

## Nagłówki limitów szybkości

Dołącz nagłówki standardowych limitów szybkości we wszystkich odpowiedziach API:

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

### Odniesienie do nagłówka

| Nagłówek | Opis | Przykład |
|------------|------------|--------|
| `X-RateLimit-Limit` | Maksymalna liczba żądań na okno | `100` |
| `X-RateLimit-Remaining` | Żądania pozostające w oknie | `87` |
| `X-RateLimit-Reset` | Znacznik czasu Uniksa podczas resetowania okna | `1709654400000` |
| `Retry-After` | Sekundy do następnego dozwolonego żądania | `45` |

## Sprawdzanie statusu limitu szybkości

Zapytanie o aktualny stan bez zwiększania licznika:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Resetowanie limitów szybkości

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Zasady obejścia

### Zaufane źródła

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

## Złożone kluczowe strategie

### Oparte na adresie IP (anonimowe)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Oparte na użytkownikach (uwierzytelnione)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Połączone (IP + trasa)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Względy wydajności

1. **Wykorzystanie pamięci**: Każdy wpis zajmuje ~100 bajtów. Przy 100 000 aktywnych kluczy, czyli ~10 MB.
2. **Częstotliwość czyszczenia**: 5-minutowy odstęp między czyszczeniem jest odpowiednią równowagą. Zmniejsz w przypadku zastosowań o dużym natężeniu ruchu.
3. **Wydajność mapy**: JavaScript `Map` zapewnia O(1) get/set. Brak problemów z wydajnością do milionów wpisów.
4. **Wdrożenie rozproszone**: Magazyn w pamięci nie udostępnia stanu pomiędzy instancjami. W przypadku wdrożeń z wieloma instancjami użyj ograniczania szybkości obsługiwanego przez Redis.

## Zagadnienia produkcyjne

### Wdrożenia z wieloma instancjami

Ogranicznik szybkości w pamięci nie udostępnia stanu między instancjami serwera. Do produkcji:

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

### Okno przesuwne a okno stałe

Obecna implementacja wykorzystuje **stałe okna**. Oznacza to, że seria żądań na granicy okna może pozwolić na maksymalnie 0 żądań w krótkim czasie. Aby uzyskać bardziej rygorystyczne ograniczenia, zaimplementuj przesuwane okno:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Rozwiązywanie problemów

### Limit stawki nie jest egzekwowany

1. Sprawdź, czy klucz jest unikalny dla każdego klienta (sprawdź wyodrębnianie adresu IP).
2. Upewnij się, że przed logiką obsługi żądań wywołano `ratelimit()` .
3. Sprawdź, czy odpowiedź została zwrócona natychmiast po `!result.success` .

### Liczba wszystkich żądań jest natychmiast ograniczona

1. Sprawdź, czy parametr `limit` nie jest równy 0 ani ujemny.
2. Sprawdź, czy parametr `windowMs` jest podany w milisekundach, a nie sekundach.
3. Sprawdź klucz — jeśli wszystkie żądania mają ten sam klucz, mają ten sam limit.

### Pamięć rośnie bez ograniczeń

1. 5-minutowy interwał czyszczenia powinien sobie z tym poradzić. Sprawdź, czy licznik interwałów jest uruchomiony.
2. Zadzwoń pod numer `resetRateLimit(key)` , aby ręcznie wyczyścić określone klawisze.
3. Monitoruj wielkość sklepu w fazie rozwoju.

## Powiązana dokumentacja

- [Wzorce odzyskiwania po błędach](./error-recovery-patterns.md)
- [Architektura webhooka](./webhook-architecture.md)
- [Dogłębne nurkowanie dotyczące zarządzania sesją](./session-management-deep-dive.md)
