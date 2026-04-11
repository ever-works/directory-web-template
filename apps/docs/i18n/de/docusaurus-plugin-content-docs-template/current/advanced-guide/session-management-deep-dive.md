---
id: session-management-deep-dive
title: Deep Dive zum Sitzungsmanagement
sidebar_label: Sitzungsverwaltung
sidebar_position: 4
---

# Deep Dive zum Sitzungsmanagement

Dieses Handbuch behandelt die Sitzungsarchitektur, einschließlich der NextAuth.js-Integration, In-Memory-Sitzungscaching, Token-Extraktion, Cache-Invalidierung und serverseitige Sitzungsdienstprogramme.

## Architekturübersicht

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

## Sitzungs-Cache-Schicht

### SessionCache-Klasse

Das `SessionCache` in `lib/auth/session-cache.ts` ist ein Singleton-In-Memory-Cache:

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

### Cache-Schlüsselgenerierung

Schlüssel werden durch SHA-256-Hashing des Sitzungstokens abgeleitet, um zu verhindern, dass vertrauliche Daten in Speicherauszügen angezeigt werden:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Aufbau des Cache-Identifikators

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Abruf zwischengespeicherter Sitzungen

### Serverkomponenten und API-Routen

Die Funktion `getCachedSession` in `lib/auth/cached-session.ts` ist der primäre Einstiegspunkt:

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

### API-Routennutzung

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

### Nutzung der Serverkomponente

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Token-Extraktion

Die Funktion `extractSessionToken` prüft mehrere Quellen:

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

## Cache-Ungültigmachung

### Ungültigkeitserklärung einer einzelnen Sitzung

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Vollständiger Cache gelöscht

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Cache-Statistiken und -Überwachung

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

### Entwicklungsprotokollierung

Im Entwicklungsmodus protokolliert der Cache Treffer, Fehlschläge und Ungültigmachungen automatisch:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Edge Runtime-Kompatibilität

Das Authentifizierungsmodul verwendet dynamische Importe, um die Bündelung von Datenbanktreibern in Edge Runtime zu vermeiden:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Speicherverwaltung

### Bereinigungsstrategie

Der Sitzungscache verwendet zwei Bereinigungsmechanismen:

1. **Probabilistische Bereinigung (10 %)**: Bei jedem `set()` -Aufruf besteht eine Chance von 10 %, dass eine vollständige Bereinigung durchgeführt wird.
2. **LRU-Räumung**: Wenn der Cache 1.000 Einträge überschreitet, werden die ältesten Einträge (um `createdAt` ) entfernt.

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

## Leistungsüberlegungen

1. **Cache-Trefferquote-Ziel**: Streben Sie eine Trefferquote von über 80 % an. Niedrigere Raten deuten darauf hin, dass die TTL zu kurz ist oder die Token nicht ordnungsgemäß extrahiert werden.
2. **Speicherbedarf**: Jede zwischengespeicherte Sitzung beträgt etwa 1–2 KB. Bei maximaler Kapazität (1.000) belegt der Cache etwa 1–2 MB.
3. **SHA-256-Overhead**: Die Schlüsselgenerierung fügt pro Suche etwa 0,1 ms hinzu. Dies ist im Vergleich zum eingesparten Datenbank-Roundtrip vernachlässigbar.
4. **Kaltstartstrafe**: Nach der Bereitstellung verpassen alle Sitzungen den Cache bei der ersten Anfrage.

## Fehlerbehebung

### Sitzung nach der Anmeldung nicht zwischengespeichert

1. Stellen Sie sicher, dass das Sitzungstoken-Cookie mit Anfragen gesendet wird.
2. Überprüfen Sie, ob `extractSessionToken` das Cookie-Format analysieren kann.
3. Stellen Sie sicher, dass die Funktion `getCachedSession` den Parameter `request` empfängt.

### Cache wächst unbegrenzt

1. Stellen Sie sicher, dass die probabilistische Bereinigung ausgeführt wird (überprüfen Sie, ob Meldungen im Bereinigungsprotokoll angezeigt werden).
2. Erzwingen Sie die Bereinigung, indem Sie `sessionCache.clear()` aufrufen.
3. Überwachen Sie die Cachegröße mit `getSessionCacheStats().size` .

### Veraltete Sitzung nach Rollenwechsel

1. Rufen Sie `invalidateSessionCache(sessionToken, userId)` nach Rollenwechseln an.
2. Die 10-Minuten-TTL bedeutet, dass veraltete Daten bis zu 10 Minuten ohne explizite Ungültigmachung bestehen bleiben.

## Verwandte Dokumentation

- [Deep Dive zur Caching-Architektur](./caching-deep-dive.md)
- [Fehlerbehebungsmuster](./error-recovery-patterns.md)
- [Rate-Limiting-Architektur](./rate-limiting-architecture.md)
