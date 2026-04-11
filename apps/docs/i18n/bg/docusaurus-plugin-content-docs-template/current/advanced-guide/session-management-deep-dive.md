---
id: session-management-deep-dive
title: Дълбоко потапяне в управлението на сесии
sidebar_label: Управление на сесии
sidebar_position: 4
---

# Дълбоко потапяне в управлението на сесии

Това ръководство обхваща архитектурата на сесията, включително интеграция на NextAuth.js, кеширане на сесии в паметта, извличане на токени, анулиране на кеша и помощни програми за сесии от страна на сървъра.

## Преглед на архитектурата

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

## Слой на кеша на сесиите

### Клас SessionCache `SessionCache` в `lib/auth/session-cache.ts` е единичен кеш в паметта:

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

### Генериране на кеш ключ

Ключовете се извличат чрез SHA-256 хеширане на токена на сесията, за да се предотврати появата на чувствителни данни в дъмпове на паметта:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Конструкция на кеш идентификатор

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Извличане на кеширана сесия

### Сървърни компоненти и API маршрути

Функцията `getCachedSession` в `lib/auth/cached-session.ts` е основната входна точка:

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

### Използване на API маршрут

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

### Използване на сървърния компонент

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Извличане на токени

Функцията `extractSessionToken` проверява множество източници:

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

## Кеш невалидност

### Единична невалидност на сесията

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Пълно изчистване на кеша

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Статистика и мониторинг на кеша

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

### Регистриране на разработка

В режим на разработка кешът регистрира автоматично попадения, пропуски и невалидности:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Съвместимост на Edge Runtime

Модулът за удостоверяване използва динамично импортиране, за да избегне групирането на драйвери на база данни в Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Управление на паметта

### Стратегия за почистване

Кешът на сесията използва два механизма за почистване:

1. **Вероятностно почистване (10%)**: При всяко повикване `set()` има 10% шанс за изпълнение на пълно почистване.
2. **LRU изваждане**: Когато кешът надвиши 1000 записа, най-старите записи (с `createdAt` ) се изваждат.

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

## Съображения за производителност

1. **Целева честота на попадение в кеша**: Стремете се към 80%+ процент на попадение. По-ниските нива предполагат, че TTL е твърде кратък или токените не се извличат правилно.
2. **Отпечатък от паметта**: Всяка кеширана сесия е приблизително 1-2 KB. При максимален капацитет (1000), кешът използва приблизително 1-2 MB.
3. **SHA-256 overhead**: Генерирането на ключ добавя ~0,1 ms на търсене. Това е пренебрежимо малко в сравнение със записаната двупосочна база данни.
4. **Наказание за студен старт**: След внедряване всички сесии пропускат кеша при първа заявка.

## Отстраняване на неизправности

### Сесията не е кеширана след влизане

1. Уверете се, че бисквитката на маркера на сесията се изпраща със заявки.
2. Проверете дали `extractSessionToken` може да анализира формата на бисквитката.
3. Уверете се, че функцията `getCachedSession` получава параметъра `request` .

### Кешът расте неограничено

1. Проверете дали тече вероятностно почистване (проверете за съобщения в журнала за почистване).
2. Принудително почистване, като извикате `sessionCache.clear()` .
3. Наблюдавайте размера на кеша с `getSessionCacheStats().size` .

### Остаряла сесия след смяна на ролята

1. Обадете се на `invalidateSessionCache(sessionToken, userId)` след промяна на ролята.
2. 10-минутният TTL означава, че остарелите данни продължават до 10 минути без изрично обезсилване.

## Свързана документация

- [Дълбоко потапяне в кеширащата архитектура](./caching-deep-dive.md)
- [Модели за възстановяване на грешки](./error-recovery-patterns.md)
- [Архитектура с ограничаване на скоростта](./rate-limiting-architecture.md)
