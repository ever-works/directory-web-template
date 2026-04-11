---
id: session-management-deep-dive
title: Подробное описание управления сессиями
sidebar_label: Управление сеансами
sidebar_position: 4
---

# Подробное описание управления сессиями

В этом руководстве рассматривается архитектура сеанса, включая интеграцию NextAuth.js, кэширование сеансов в памяти, извлечение токенов, аннулирование кэша и утилиты сеансов на стороне сервера.

## Обзор архитектуры

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

## Уровень кэша сеанса

### Класс SessionCache `SessionCache` в `lib/auth/session-cache.ts` представляет собой одноэлементный кеш в памяти:

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

### Генерация ключей кэша

Ключи получаются путем хеширования токена сеанса SHA-256, чтобы предотвратить появление конфиденциальных данных в дампах памяти:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Создание идентификатора кэша

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Получение кэшированной сессии

### Серверные компоненты и маршруты API

Функция `getCachedSession` в `lib/auth/cached-session.ts` является основной точкой входа:

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

### Использование маршрута API

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

### Использование серверных компонентов

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Извлечение токена

Функция `extractSessionToken` проверяет несколько источников:

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

## Инвалидация кэша

### Аннулирование одного сеанса

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Полная очистка кэша

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Статистика и мониторинг кэша

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

### Ведение журнала разработки

В режиме разработки кэш автоматически регистрирует попадания, промахи и аннулирования:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Совместимость с Edge Runtime

Модуль аутентификации использует динамический импорт, чтобы избежать объединения драйверов базы данных в Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Управление памятью

### Стратегия очистки

Кэш сеанса использует два механизма очистки:

1. **Вероятностная очистка (10%)**: при каждом вызове `set()` вероятность выполнения полной очистки составляет 10%.
2. **Вытеснение LRU**: когда количество записей в кэше превышает 1000, самые старые записи (на `createdAt` ) удаляются.

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

## Вопросы производительности

1. **Целевой показатель попадания в кэш**: стремитесь к показателю попадания в кэш 80 %+. Более низкие показатели предполагают, что TTL слишком мал или токены не извлекаются должным образом.
2. **Объем памяти**: размер каждого кэшированного сеанса составляет примерно 1–2 КБ. При максимальной емкости (1000) кэш использует примерно 1–2 МБ.
3. **Накладные расходы SHA-256**: генерация ключей добавляет ~0,1 мс за каждый поиск. Это ничтожно мало по сравнению с сохраненным двусторонним обменом базы данных.
4. **Наказание за холодный запуск**: после развертывания все сеансы пропускают кеш при первом запросе.

## Устранение неполадок

### Сеанс не кэшируется после входа в систему

1. Убедитесь, что файл cookie токена сеанса отправляется вместе с запросами.
2. Убедитесь, что `extractSessionToken` может анализировать формат cookie.
3. Убедитесь, что функция `getCachedSession` получает параметр `request` .

### Кэш растет без ограничений

1. Убедитесь, что выполняется вероятностная очистка (проверьте наличие сообщений в журнале очистки).
2. Принудительно выполнить очистку, вызвав `sessionCache.clear()` .
3. Отслеживайте размер кэша с помощью `getSessionCacheStats().size` .

### Устаревший сеанс после смены роли

1. Позвоните по номеру `invalidateSessionCache(sessionToken, userId)` после смены ролей.
2. 10-минутный срок жизни означает, что устаревшие данные сохраняются до 10 минут без явного аннулирования.

## Сопутствующая документация

- [Подробный обзор архитектуры кэширования](./caching-deep-dive.md)
- [Шаблоны восстановления ошибок](./error-recovery-patterns.md)
- [Архитектура ограничения скорости](./rate-limiting-architecture.md)
