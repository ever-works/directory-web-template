---
id: rate-limiting-architecture
title: Architettura di limitazione della velocità
sidebar_label: Limitazione della velocità
sidebar_position: 5
---

# Architettura di limitazione della velocità

Questa guida tratta il sistema di limitazione della velocità, incluso l'archivio in memoria, la configurazione per percorso, il comportamento della finestra scorrevole, le intestazioni del limite di velocità e le regole di bypass.

## Panoramica dell'architettura

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

## Funzione di limitazione della frequenza centrale

La funzione `ratelimit` in `lib/utils/rate-limit.ts` implementa un limitatore di velocità a finestra fissa:

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

### Interfaccia dei risultati del limite di velocità

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## Archivio in memoria

Il limitatore di velocità utilizza un `Map<string, RateLimitEntry>` per le ricerche O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Pulizia automatica

Le voci scadute vengono pulite ogni 5 minuti per evitare perdite di memoria:

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

## Configurazione per percorso

### Limiti consigliati

| Schema percorso | Limite | Finestra | Motivazione |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5| 15 minuti | Prevenire la forza bruta |
| `POST /api/auth/register` | 3| 1 ora | Previeni lo spam nell'account |
| `POST /api/comments` | 10| 1 minuto | Previeni lo spam nei commenti |
| `GET /api/items` | 100| 1 minuto | Consenti navigazione |
| `POST /api/submit` | 5| 10 minuti | Previeni lo spam nell'invio |
| `POST /api/contact` | 3| 1 ora | Previeni lo spam nelle email |
| `POST /api/webhook/*` | 1000 | 1 minuto | Elevata produttività per i fornitori |

### Implementazione dei limiti per tratta

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

## Intestazioni dei limiti di velocità

Includi intestazioni del limite di velocità standard in tutte le risposte API:

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

### Riferimento all'intestazione

| Intestazione | Descrizione | Esempio |
|--------|-----|---------|
| `X-RateLimit-Limit` | Numero massimo di richieste per finestra | `100` |
| `X-RateLimit-Remaining` | Richieste rimanenti nella finestra | `87` |
| `X-RateLimit-Reset` | Timestamp Unix quando la finestra si reimposta | `1709654400000` |
| `Retry-After` | Secondi fino alla prossima richiesta consentita | `45` |

## Controllo dello stato del limite di velocità

Interroga lo stato corrente senza incrementare il contatore:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Reimpostazione dei limiti di velocità

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Ignora le regole

### Fonti attendibili

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

## Strategie chiave composite

### Basato su IP (anonimo)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Basato sull'utente (autenticato)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Combinato (IP + percorso)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Considerazioni sulle prestazioni

1. **Utilizzo della memoria**: ogni voce utilizza ~100 byte. A 100.000 chiavi attive, ovvero ~ 10 MB.
2. **Frequenza di pulizia**: l'intervallo di pulizia di 5 minuti è un buon equilibrio. Ridurre per applicazioni ad alto traffico.
3. **Prestazioni della mappa**: JavaScript `Map` fornisce O(1) get/set. Nessuna prestazione riguarda fino a milioni di voci.
4. **Distribuzione distribuita**: l'archivio in memoria non condivide lo stato tra le istanze. Per le distribuzioni multiistanza, utilizzare la limitazione della velocità supportata da Redis.

## Considerazioni sulla produzione

### Distribuzioni multiistanza

Il limitatore di velocità in memoria non condivide lo stato tra le istanze del server. Per la produzione:

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

### Finestra scorrevole e finestra fissa

L'implementazione attuale utilizza **finestre fisse**. Ciò significa che un'ondata di richieste al limite della finestra potrebbe consentire fino a `2 * limit` richieste in un breve periodo. Per una limitazione più rigorosa, implementa una finestra scorrevole:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Risoluzione dei problemi

### Limite di tariffa non applicato

1. Verificare che la chiave sia univoca per client (controllare l'estrazione dell'IP).
2. Assicurarsi che `ratelimit()` venga chiamato prima della logica del gestore della richiesta.
3. Verificare che la risposta venga restituita immediatamente il `!result.success` .

### Tutte le richieste sono limitate immediatamente

1. Verificare che il parametro `limit` non sia 0 o negativo.
2. Verificare che il parametro `windowMs` sia espresso in millisecondi, non secondi.
3. Controlla la chiave: se tutte le richieste condividono la stessa chiave, condividono lo stesso limite.

### La memoria cresce senza limiti

1. L'intervallo di pulizia di 5 minuti dovrebbe gestire questo problema. Verificare che il timer dell'intervallo sia in esecuzione.
2. Chiama `resetRateLimit(key)` per cancellare manualmente tasti specifici.
3. Monitorare le dimensioni del negozio in fase di sviluppo.

## Documentazione correlata

- [Modelli di ripristino degli errori](./error-recovery-patterns.md)
- [Architettura webhook](./webhook-architecture.md)
- [Approfondimento sulla gestione della sessione](./session-management-deep-dive.md)
