---
id: session-management-deep-dive
title: Approfondimento sulla gestione delle sessioni
sidebar_label: Gestione della sessione
sidebar_position: 4
---

# Approfondimento sulla gestione delle sessioni

Questa guida copre l'architettura della sessione, inclusa l'integrazione di NextAuth.js, la memorizzazione nella cache della sessione in memoria, l'estrazione dei token, l'invalidazione della cache e le utilità della sessione lato server.

## Panoramica dell'architettura

```
Session Management Flow
========================

  Browser (Client)                    Server
  +------------------+                +------------------+
  | useSession()     | -- cookie ---> | getCachedSession |
  | (next-auth/react)|                |      |           |
  +------------------+                |      v           |
                                      | SessionCache     |
                                      |   HIT? -------> Return cached
                                      |   MISS -------> NextAuth auth()
                                      |                  |
                                      |                  v
                                      |              Cache result
                                      |              Return session
                                      +------------------+

  Token Extraction Sources:
  1. Cookie: next-auth.session-token
  2. Cookie: __Secure-next-auth.session-token
  3. Header: Authorization: Bearer <token>
  4. Header: X-Session-Token: <token>
```

## Livello cache di sessione

### Classe SessionCache

Il `SessionCache` in `lib/auth/session-cache.ts` è una cache in memoria singleton:

```typescript
// lib/auth/session-cache.ts
class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SIZE = 1000;
  private stats = { hits: 0, misses: 0 };

  async get(identifier: string): Promise<Session | null> {
    const key = await this.generateKey(identifier);
    const cached = this.cache.get(key);

    if (!cached || this.isExpired(cached)) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.session;
  }

  async set(identifier: string, session: Session): Promise<void> {
    const key = await this.generateKey(identifier);
    this.cache.set(key, {
      session,
      expiresAt: Date.now() + this.TTL_MS,
      createdAt: Date.now(),
    });

    // 10% probabilistic cleanup
    if (Math.random() < 0.1) {
      this.cleanup();
    }
  }
}

export const sessionCache = new SessionCache();
```

### Generazione di chiavi nella cache

Le chiavi derivano dall'hashing SHA-256 del token di sessione per impedire la visualizzazione di dati sensibili nei dump della memoria:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Costruzione dell'identificatore della cache

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Recupero della sessione memorizzata nella cache

### Componenti server e percorsi API

La funzione `getCachedSession` in `lib/auth/cached-session.ts` è il punto di ingresso principale:

```typescript
// lib/auth/cached-session.ts
export async function getCachedSession(request?: Request): Promise<Session | null> {
  try {
    const sessionToken = extractSessionToken(request);

    // Cache lookup
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      const cachedSession = await sessionCache.get(identifier);
      if (cachedSession) return cachedSession;
    }

    // Cache miss: fetch from NextAuth
    const auth = await getAuth();
    const session = await auth();

    // Store in cache
    if (session && sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.set(identifier, session);
    }

    return session;
  } catch (error) {
    // Fallback to direct NextAuth call
    const auth = await getAuth();
    return await auth();
  }
}
```

### Utilizzo del percorso API

```typescript
// In API route handlers
import { getCachedApiSession } from '@/lib/auth/cached-session';

export async function GET(request: NextRequest) {
  const session = await getCachedApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle authenticated request
}
```

### Utilizzo dei componenti server

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Estrazione di token

La funzione `extractSessionToken` controlla più fonti:

```typescript
function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  // 1. NextAuth session cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const sessionToken =
      cookies['next-auth.session-token'] ||
      cookies['__Secure-next-auth.session-token'] ||
      cookies['next-auth.csrf-token'];
    if (sessionToken) return sessionToken;
  }

  // 2. Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Custom session header
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) return sessionHeader;

  return null;
}
```

## Invalidazione della cache

### Invalidazione di una singola sessione

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Cancella cache piena

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Statistiche e monitoraggio della cache

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

const stats = getSessionCacheStats();
// {
//   hits: 450,
//   misses: 50,
//   size: 123,
//   hitRate: 90.00
// }
```

### Registrazione dello sviluppo

In modalità sviluppo, la cache registra automaticamente gli hit, i mancati e gli invalidamenti:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Compatibilità Edge Runtime

Il modulo auth utilizza importazioni dinamiche per evitare di raggruppare i driver del database in Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Gestione della memoria

### Strategia di pulizia

La cache della sessione utilizza due meccanismi di pulizia:

1. **Pulizia probabilistica (10%)**: per ogni chiamata `set()` , c'è una probabilità del 10% di eseguire una pulizia completa.
2. **Eliminazione LRU**: quando la cache supera le 1.000 voci, le voci più vecchie (per `createdAt` ) vengono eliminate.

```typescript
private cleanup(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, cached] of this.cache.entries()) {
    if (now > cached.expiresAt) {
      this.cache.delete(key);
    }
  }

  // Enforce size limit (LRU eviction)
  if (this.cache.size > this.MAX_SIZE) {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDelete = entries.slice(0, this.cache.size - this.MAX_SIZE);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }
}
```

## Considerazioni sulle prestazioni

1. **Obiettivo percentuale di successo della cache**: punta a una percentuale di successo pari all'80%+. Tassi più bassi suggeriscono che il TTL è troppo breve o che i token non vengono estratti correttamente.
2. **Ingombro di memoria**: ogni sessione memorizzata nella cache è di circa 1-2 KB. Alla capacità massima (1.000), la cache utilizza circa 1-2 MB.
3. **Overhead SHA-256**: la generazione di chiavi aggiunge ~0,1 ms per ricerca. Questo è trascurabile rispetto al viaggio di andata e ritorno del database salvato.
4. **Penalità per l'avvio a freddo**: dopo la distribuzione, tutte le sessioni perdono la cache alla prima richiesta.

## Risoluzione dei problemi

### Sessione non memorizzata nella cache dopo l'accesso

1. Verificare che il cookie del token di sessione venga inviato con le richieste.
2. Verifica che `extractSessionToken` possa analizzare il formato del cookie.
3. Assicurarsi che la funzione `getCachedSession` riceva il parametro `request` .

### La cache cresce senza limiti

1. Verificare che la pulizia probabilistica sia in esecuzione (controllare i messaggi del registro di pulizia).
2. Forza la pulizia chiamando `sessionCache.clear()` .
3. Monitorare la dimensione della cache con `getSessionCacheStats().size` .

### Sessione obsoleta dopo il cambio di ruolo

1. Chiama `invalidateSessionCache(sessionToken, userId)` dopo il cambio di ruolo.
2. Il TTL di 10 minuti significa che i dati non aggiornati persistono per un massimo di 10 minuti senza invalidazione esplicita.

## Documentazione correlata

- [Approfondimento sull'architettura della memorizzazione nella cache](./caching-deep-dive.md)
- [Modelli di ripristino degli errori](./error-recovery-patterns.md)
- [Architettura di limitazione della velocità](./rate-limiting-architecture.md)
