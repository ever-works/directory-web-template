---
id: session-management-deep-dive
title: Zarządzanie sesją Głębokie nurkowanie
sidebar_label: Zarządzanie sesją
sidebar_position: 4
---

# Zarządzanie sesją Głębokie nurkowanie

Ten przewodnik omawia architekturę sesji, w tym integrację NextAuth.js, buforowanie sesji w pamięci, wyodrębnianie tokenów, unieważnianie pamięci podręcznej i narzędzia sesji po stronie serwera.

## Przegląd architektury

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

## Warstwa pamięci podręcznej sesji

### Klasa SessionCache `SessionCache` w `lib/auth/session-cache.ts` to pojedyncza pamięć podręczna w pamięci:

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

### Generowanie klucza pamięci podręcznej

Klucze są uzyskiwane przez szyfrowanie SHA-256 tokena sesji, aby zapobiec pojawianiu się wrażliwych danych w zrzutach pamięci:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Konstrukcja identyfikatora pamięci podręcznej

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Odzyskiwanie sesji z pamięci podręcznej

### Komponenty serwera i trasy API

Funkcja `getCachedSession` w `lib/auth/cached-session.ts` jest głównym punktem wejścia:

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

### Wykorzystanie trasy API

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

### Użycie komponentów serwera

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Ekstrakcja tokenów

Funkcja `extractSessionToken` sprawdza wiele źródeł:

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

## Unieważnienie pamięci podręcznej

### Unieważnienie pojedynczej sesji

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Pełne wyczyszczenie pamięci podręcznej

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Statystyki i monitorowanie pamięci podręcznej

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

### Rejestrowanie rozwoju

W trybie programistycznym pamięć podręczna automatycznie rejestruje trafienia, chybienia i unieważnienia:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Zgodność środowiska wykonawczego Edge

Moduł uwierzytelniania wykorzystuje import dynamiczny, aby uniknąć łączenia sterowników bazy danych w Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Zarządzanie pamięcią

### Strategia czyszczenia

Pamięć podręczna sesji wykorzystuje dwa mechanizmy czyszczenia:

1. **Oczyszczanie probabilistyczne (10%)**: Przy każdym wywołaniu `set()` istnieje 10% szans na wykonanie pełnego czyszczenia.
2. **Eksmisja LRU**: Gdy pamięć podręczna przekroczy 1000 wpisów, najstarsze wpisy (o `createdAt` ) zostaną eksmitowane.

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

## Względy wydajności

1. **Docelowy współczynnik trafień w pamięci podręcznej**: Celuj w współczynnik trafień wynoszący 80% lub więcej. Niższe stawki sugerują, że TTL jest za krótki lub żetony nie są wydobywane prawidłowo.
2. **Zajętość pamięci**: Każda sesja w pamięci podręcznej zajmuje około 1-2 KB. Przy maksymalnej pojemności (1000) pamięć podręczna zajmuje około 1–2 MB.
3. **Narzut SHA-256**: Generowanie klucza dodaje ~0,1 ms na wyszukiwanie. Jest to nieistotne w porównaniu z zaoszczędzoną bazą danych w obie strony.
4. **Kara za zimny start**: Po wdrożeniu wszystkie sesje tracą pamięć podręczną przy pierwszym żądaniu.

## Rozwiązywanie problemów

### Sesja nie jest buforowana po zalogowaniu

1. Sprawdź, czy plik cookie tokenu sesji jest wysyłany z żądaniami.
2. Sprawdź, czy `extractSessionToken` może analizować format pliku cookie.
3. Upewnij się, że funkcja `getCachedSession` otrzymuje parametr `request` .

### Pamięć podręczna rośnie bez ograniczeń

1. Sprawdź, czy działa czyszczenie probabilistyczne (sprawdź, czy w dzienniku czyszczenia znajdują się komunikaty).
2. Wymuś oczyszczenie, dzwoniąc pod numer `sessionCache.clear()` .
3. Monitoruj rozmiar pamięci podręcznej za pomocą `getSessionCacheStats().size` .

### Nieaktualna sesja po zmianie roli

1. Zadzwoń pod numer `invalidateSessionCache(sessionToken, userId)` po zmianie ról.
2. 10-minutowy TTL oznacza, że ​​nieaktualne dane są przechowywane do 10 minut bez wyraźnego unieważnienia.

## Powiązana dokumentacja

- [Dogłębne zapoznanie się z architekturą buforowania](./caching-deep-dive.md)
- [Wzorce odzyskiwania po błędach](./error-recovery-patterns.md)
- [Architektura ograniczająca szybkość](./rate-limiting-architecture.md)
