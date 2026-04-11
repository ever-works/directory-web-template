---
id: rate-limiting-architecture
title: Ratenbegrenzende Architektur
sidebar_label: Ratenbegrenzung
sidebar_position: 5
---

# Ratenbegrenzende Architektur

Dieses Handbuch behandelt das Ratenbegrenzungssystem, einschließlich des In-Memory-Speichers, der Konfiguration pro Route, des Schiebefensterverhaltens, der Ratenbegrenzungsheader und der Umgehungsregeln.

## Architekturübersicht

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

## Kernfrequenzbegrenzungsfunktion

Die `ratelimit` -Funktion in `lib/utils/rate-limit.ts` implementiert einen Festfenster-Ratenbegrenzer:

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

### Rate-Limit-Ergebnisschnittstelle

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## In-Memory-Speicher

Der Ratenbegrenzer verwendet `Map<string, RateLimitEntry>` für O(1)-Suchen:

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Automatische Bereinigung

Abgelaufene Einträge werden alle 5 Minuten bereinigt, um Speicherlecks zu verhindern:

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

## Pro-Route-Konfiguration

### Empfohlene Grenzwerte

| Routenmuster | Grenze | Fenster | Begründung |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 Minuten | Brutale Gewalt verhindern |
| `POST /api/auth/register` | 3 | 1 Stunde | Konto-Spam verhindern |
| `POST /api/comments` | 10 | 1 Minute | Kommentar-Spam verhindern |
| `GET /api/items` | 100 | 1 Minute | Surfen zulassen |
| `POST /api/submit` | 5 | 10 Minuten | Übermittlungs-Spam verhindern |
| `POST /api/contact` | 3 | 1 Stunde | E-Mail-Spam verhindern |
| `POST /api/webhook/*` | 1000 | 1 Minute | Hoher Durchsatz für Anbieter |

### Implementierung von Limits pro Route

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

## Rate-Limit-Header

Fügen Sie in allen API-Antworten standardmäßige Rate-Limit-Header ein:

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

### Header-Referenz

| Kopfzeile | Beschreibung | Beispiel |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximale Anfragen pro Fenster | `100` |
| `X-RateLimit-Remaining` | Im Fenster verbleibende Anfragen | `87` |
| `X-RateLimit-Reset` | Unix-Zeitstempel beim Zurücksetzen des Fensters | `1709654400000` |
| `Retry-After` | Sekunden bis zur nächsten zulässigen Anfrage | `45` |

## Ratenbegrenzungsstatus prüfen

Aktuellen Status abfragen, ohne den Zähler zu erhöhen:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Ratenbegrenzungen zurücksetzen

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Regeln umgehen

### Vertrauenswürdige Quellen

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

## Zusammengesetzte Schlüsselstrategien

### IP-basiert (anonym)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Benutzerbasiert (authentifiziert)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Kombiniert (IP + Route)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Leistungsüberlegungen

1. **Speichernutzung**: Jeder Eintrag verwendet ~100 Bytes. Bei 100.000 aktiven Schlüsseln sind das etwa 10 MB.
2. **Reinigungshäufigkeit**: Das Reinigungsintervall von 5 Minuten ist eine gute Balance. Bei Anwendungen mit hohem Datenverkehr reduzieren.
3. **Kartenleistung**: JavaScript `Map` bietet O(1) get/set. Keine Leistungsbedenken bis zu Millionen von Einträgen.
4. **Verteilte Bereitstellung**: Der In-Memory-Speicher teilt den Status nicht zwischen Instanzen. Verwenden Sie für Bereitstellungen mit mehreren Instanzen die von Redis unterstützte Ratenbegrenzung.

## Überlegungen zur Produktion

### Multi-Instanz-Bereitstellungen

Der In-Memory-Ratenbegrenzer teilt den Status nicht zwischen Serverinstanzen. Zur Produktion:

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

### Schiebefenster vs. festes Fenster

Die aktuelle Implementierung verwendet **feste Fenster**. Das bedeutet, dass eine Flut von Anfragen an der Fenstergrenze in kurzer Zeit bis zu `2 * limit` Anfragen zulassen könnte. Für eine strengere Begrenzung implementieren Sie ein Schiebefenster:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Fehlerbehebung

### Ratenbegrenzung nicht durchgesetzt

1. Stellen Sie sicher, dass der Schlüssel pro Client eindeutig ist (überprüfen Sie die IP-Extraktion).
2. Stellen Sie sicher, dass `ratelimit()` vor ​​der Anforderungshandlerlogik aufgerufen wird.
3. Überprüfen Sie, ob die Antwort sofort bei `!result.success` zurückgegeben wird.

### Alle Anfragen sind ab sofort preislich begrenzt

1. Stellen Sie sicher, dass der Parameter `limit` nicht 0 oder negativ ist.
2. Stellen Sie sicher, dass der Parameter `windowMs` in Millisekunden und nicht in Sekunden angegeben ist.
3. Überprüfen Sie den Schlüssel – wenn alle Anfragen denselben Schlüssel haben, haben sie dasselbe Limit.

### Die Erinnerung wächst grenzenlos

1. Das 5-Minuten-Bereinigungsintervall sollte dies bewältigen. Stellen Sie sicher, dass der Intervall-Timer läuft.
2. Rufen Sie `resetRateLimit(key)` auf, um bestimmte Tasten manuell zu löschen.
3. Überwachen Sie die Ladengröße in der Entwicklung.

## Verwandte Dokumentation

- [Fehlerbehebungsmuster](./error-recovery-patterns.md)
- [Webhook-Architektur](./webhook-architecture.md)
- [Deep Dive zum Sitzungsmanagement](./session-management-deep-dive.md)
