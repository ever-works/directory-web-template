---
id: rate-limiting-architecture
title: Snelheidsbeperkende architectuur
sidebar_label: Tariefbeperking
sidebar_position: 5
---

# Snelheidsbeperkende architectuur

Deze handleiding behandelt het snelheidsbeperkende systeem, inclusief de opslag in het geheugen, de configuratie per route, het gedrag van het schuifvenster, kopteksten voor snelheidslimieten en bypass-regels.

## Architectuuroverzicht

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

## Kernsnelheidsbegrenzende functie

De functie `ratelimit` in `lib/utils/rate-limit.ts` implementeert een snelheidsbegrenzer met een vast venster:

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

### Interface voor snelheidslimietresultaten

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## In-memory-opslag

De snelheidsbegrenzer gebruikt een `Map<string, RateLimitEntry>` voor O(1)-zoekopdrachten:

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Automatisch opschonen

Verlopen vermeldingen worden elke 5 minuten opgeschoond om geheugenlekken te voorkomen:

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

## Configuratie per route

### Aanbevolen limieten

| Routepatroon | Limiet | Venster | Reden |
|-------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 minuten | Voorkom bruut geweld |
| `POST /api/auth/register` | 3 | 1 uur | Accountspam voorkomen |
| `POST /api/comments` | 10 | 1 minuut | Voorkom reactiespam |
| `GET /api/items` | 100 | 1 minuut | Browsen toestaan ​​|
| `POST /api/submit` | 5 | 10 minuten | Voorkom inzendingsspam |
| `POST /api/contact` | 3 | 1 uur | Voorkom e-mailspam |
| `POST /api/webhook/*` | 1000 | 1 minuut | Hoge doorvoer voor providers |

### Limieten per route implementeren

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

## Kopteksten voor tarieflimieten

Neem headers voor standaardtarieflimieten op in alle API-reacties:

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

### Kopreferentie

| Kop | Beschrijving | Voorbeeld |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximaal aantal aanvragen per raam | `100` |
| `X-RateLimit-Remaining` | Resterende verzoeken in venster | `87` |
| `X-RateLimit-Reset` | Unix-tijdstempel wanneer venster opnieuw wordt ingesteld | `1709654400000` |
| `Retry-After` | Seconden tot het volgende toegestane verzoek | `45` |

## Status van snelheidslimiet controleren

Actuele status opvragen zonder de teller te verhogen:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Tarieflimieten opnieuw instellen

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Regels omzeilen

### Vertrouwde bronnen

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

## Samengestelde sleutelstrategieën

### IP-gebaseerd (anoniem)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Op gebruiker gebaseerd (geauthenticeerd)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Gecombineerd (IP + route)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Prestatieoverwegingen

1. **Geheugengebruik**: elke invoer gebruikt ~100 bytes. Bij 100.000 actieve sleutels is dat ~10 MB.
2. **Opruimfrequentie**: het opruiminterval van 5 minuten is een goede balans. Verminder voor toepassingen met veel verkeer.
3. **Kaartprestaties**: JavaScript `Map` biedt O(1) get/set. Geen prestatie betreft maximaal miljoenen inzendingen.
4. **Gedistribueerde implementatie**: de opslag in het geheugen deelt de status niet tussen instanties. Voor implementaties met meerdere exemplaren gebruikt u door Redis ondersteunde snelheidsbeperkingen.

## Productieoverwegingen

### Implementaties met meerdere instanties

De snelheidsbegrenzer in het geheugen deelt de status niet tussen serverinstanties. Voor productie:

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

### Schuifraam versus vast raam

De huidige implementatie maakt gebruik van **vaste vensters**. Dit betekent dat een reeks verzoeken aan de venstergrens in korte tijd maximaal `2 * limit` verzoeken kan toestaan. Voor een strengere begrenzing implementeert u een schuifraam:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Problemen oplossen

### Tarieflimiet niet afgedwongen

1. Controleer of de sleutel uniek is per client (controleer IP-extractie).
2. Zorg ervoor dat `ratelimit()` wordt aangeroepen vóór de logica van de verzoekafhandeling.
3. Controleer of het antwoord onmiddellijk op `!result.success` wordt geretourneerd.

### Het tarief voor alle verzoeken is onmiddellijk beperkt

1. Controleer of de parameter `limit` niet 0 of negatief is.
2. Controleer of de parameter `windowMs` in milliseconden is, en niet in seconden.
3. Controleer de sleutel: als alle verzoeken dezelfde sleutel delen, delen ze dezelfde limiet.

### Geheugen groeit grenzeloos

1. Het schoonmaakinterval van 5 minuten zou dit moeten verhelpen. Controleer of de intervaltimer loopt.
2. Bel `resetRateLimit(key)` om specifieke toetsen handmatig te wissen.
3. Bewaak de winkelgrootte in ontwikkeling.

## Gerelateerde documentatie

- [Foutherstelpatronen] (./error-recovery-patterns.md)
- [Webhook-architectuur](./webhook-architecture.md)
- [Session Management Deep Dive](./session-management-deep-dive.md)
