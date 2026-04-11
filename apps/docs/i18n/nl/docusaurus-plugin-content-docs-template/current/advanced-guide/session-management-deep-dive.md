---
id: session-management-deep-dive
title: Sessiebeheer Deep Dive
sidebar_label: Sessiebeheer
sidebar_position: 4
---

# Sessiebeheer Deep Dive

Deze handleiding behandelt de sessiearchitectuur, inclusief NextAuth.js-integratie, sessiecaching in het geheugen, tokenextractie, cache-invalidatie en sessiehulpprogramma's op de server.

## Architectuuroverzicht

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

## Sessiecachelaag

### SessionCache-klasse

De `SessionCache` in `lib/auth/session-cache.ts` is een singleton-cache in het geheugen:

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

### Generatie van cachesleutel

Sleutels worden afgeleid door SHA-256 die het sessietoken hasht om te voorkomen dat gevoelige gegevens in geheugendumps verschijnen:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Constructie van cache-identificatie

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Ophalen van sessie in cache

### Servercomponenten en API-routes

De functie `getCachedSession` in `lib/auth/cached-session.ts` is het primaire toegangspunt:

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

### API-routegebruik

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

### Gebruik van servercomponenten

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Tokenextractie

De functie `extractSessionToken` controleert meerdere bronnen:

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

## Cache-invalidatie

### Ongeldigheid van één sessie

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Volledige cache wissen

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Cachestatistieken en monitoring

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

### Ontwikkelingsregistratie

In de ontwikkelingsmodus registreert de cache automatisch treffers, missers en ongeldigverklaringen:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Edge Runtime-compatibiliteit

De auth-module maakt gebruik van dynamische import om bundeling van databasestuurprogramma's in Edge Runtime te voorkomen:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Geheugenbeheer

### Opruimstrategie

De sessiecache gebruikt twee opschoonmechanismen:

1. **Probabilistische opschoning (10%)**: bij elke oproep van `set()` is er een kans van 10% dat de volledige opschoning wordt uitgevoerd.
2. **LRU-verwijdering**: wanneer de cache meer dan 1.000 vermeldingen bevat, worden de oudste vermeldingen (met `createdAt` ) verwijderd.

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

## Prestatieoverwegingen

1. **Doel voor cachetreffers**: streef naar een hitratio van meer dan 80%. Lagere tarieven duiden erop dat de TTL te kort is of dat tokens niet correct worden geëxtraheerd.
2. **Geheugenvoetafdruk**: elke sessie in de cache is ongeveer 1-2 KB. Bij maximale capaciteit (1.000) gebruikt de cache ongeveer 1-2 MB.
3. **SHA-256 overhead**: het genereren van sleutels voegt ~0,1 ms toe per zoekopdracht. Dit is verwaarloosbaar vergeleken met de opgeslagen retourvluchten in de database.
4. **Koude startstraf**: na implementatie missen alle sessies de cache op eerste verzoek.

## Problemen oplossen

### Sessie niet in cache opgeslagen na inloggen

1. Controleer of de sessietokencookie met verzoeken wordt verzonden.
2. Controleer of `extractSessionToken` het cookieformaat kan parseren.
3. Zorg ervoor dat de functie `getCachedSession` de parameter `request` ontvangt.

### Cache groeit onbeperkt

1. Controleer of de probabilistische opschoning actief is (controleer op opschoningslogboekberichten).
2. Forceer het opruimen door `sessionCache.clear()` te bellen.
3. Controleer de cachegrootte met `getSessionCacheStats().size` .

### Verouderde sessie na rolwijziging

1. Bel `invalidateSessionCache(sessionToken, userId)` na rolwijzigingen.
2. De TTL van 10 minuten betekent dat verouderde gegevens maximaal 10 minuten blijven bestaan ​​zonder expliciete ongeldigverklaring.

## Gerelateerde documentatie

- [Caching-architectuur diepe duik](./caching-deep-dive.md)
- [Foutherstelpatronen] (./error-recovery-patterns.md)
- [Rate-limiting-architectuur](./rate-limiting-architecture.md)
