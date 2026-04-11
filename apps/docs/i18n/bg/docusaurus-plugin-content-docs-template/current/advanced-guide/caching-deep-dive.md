---
id: caching-deep-dive
title: Дълбоко потапяне в кеширащата архитектура
sidebar_label: Архитектура на кеширане
sidebar_position: 1
---

# Дълбоко гмуркане в архитектурата на кеширане

Това ръководство обхваща многослойната кешираща архитектура, използвана в шаблона, от кеширане на сесии в паметта до Next.js ISR и стратегии за кеширане на ниво CDN.

## Преглед на архитектурата

```
Request Flow with Caching Layers
=================================

  Client Request
       |
       v
  +------------------+
  |  CDN / Edge      |  <-- Static assets, ISR pages
  +------------------+
       |
       v
  +------------------+
  |  Next.js Cache   |  <-- unstable_cache, revalidateTag
  +------------------+
       |
       v
  +------------------+
  |  In-Memory Cache |  <-- SessionCache, ServerClient cache
  +------------------+
       |
       v
  +------------------+
  |  Data Source      |  <-- Database, filesystem, APIs
  +------------------+
```

## Слой 1: Кеш на съдържанието (Next.js `unstable_cache` )

Шаблонът използва централизирана конфигурация на кеша, дефинирана в `lib/cache-config.ts` , за управление на TTL и кеш тагове за всички данни за съдържание.

### Кеш TTL конфигурация

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Кеш етикети за насочена невалидност

Етикетите за кеша позволяват фино обезсилване без изчистване на целия кеш:

```typescript
// lib/cache-config.ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  PAGE: (slug: string) => `page:${slug}`,
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
} as const;
```

### Използване на `unstable_cache` във функциите на съдържанието

Функциите за зареждане на съдържание във файловата система `lib/content.ts` се четат с `unstable_cache` :

```typescript
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from './cache-config';

const getCachedItems = unstable_cache(
  async (locale: string) => {
    // Expensive filesystem read
    return await loadItemsFromDisk(locale);
  },
  ['items'],
  {
    tags: [CACHE_TAGS.ITEMS, CACHE_TAGS.CONTENT],
    revalidate: CACHE_TTL.CONTENT,
  }
);
```

## Слой 2: Кеш на сесии (в паметта)

Класът `SessionCache` в `lib/auth/session-cache.ts` елиминира излишните разходи за удостоверяване чрез кеширане на декодирани сесии в паметта.

### Как работи

```
Session Lookup Flow
====================

  API Request
       |
       v
  Extract session token (cookie / header)
       |
       v
  SHA-256 hash token -> cache key
       |
       v
  +-- Cache HIT? --+
  |  YES           |  NO
  |  Return cached |  Call NextAuth auth()
  |  session       |  Cache result
  +----------------+  Return session
```

### Ключови дизайнерски решения

| Решение | Стойност | Обосновка |
|----------|-------|-----------|
| TTL | 10 минути | Баланс между свежест и намаляване на режийните разходи |
| Максимален размер | 1000 записа | Предотвратяване на изтичане на памет на дълго работещи сървъри |
| Хеширане на ключ | SHA-256 | Предотвратяване на изтичане на токени в дъмпове на памет |
| Почистване | 10% вероятност | Амортизиране на разходите за почистване при заявки |
| Изгонване | LRU (първо най-старите) | Премахване на най-скоро създадените записи |

### Кеш невалидност

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Слой 3: Клиентски кеш на API на сървъра `ServerClient` в `lib/api/server-api-client.ts` включва вграден LRU кеш за GET заявки:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Поведение на кеша:
- **Само GET заявки** се кешират (мутациите заобикалят кеша)
- **Заявките с AbortSignal** никога не се кешират
- **LRU изгонване** премахва най-стария запис, когато кешът достигне 100 елемента
- **TTL-базирано изтичане** анулира записите след 5 минути

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Стратегия за невалидност на кеша

Модулът `lib/cache-invalidation.ts` осигурява безопасно обезсилване, което обработва ограниченията на фазата на изобразяване на Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

Обвивката `safeRevalidateTag` открива грешки във фазата на изобразяване и записва предупреждения вместо да се срива:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      throw error;
    }
  }
}
```

## ISR (инкрементална статична регенерация)

Страниците използват ISR чрез `revalidate` експорт или TTL за всяка функция:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Съображения за производителност

1. **Процент на попадение в кеша на сесията**: Наблюдавайте с помощта на `getSessionCacheStats()` . Здравословният процент е над 80%.
2. **Кеш на съдържанието**: 10-минутният TTL означава, че актуализациите на съдържанието отнемат до 10 минути, за да се появят. Принудително обезсилване след синхронизиране за незабавни актуализации.
3. **Използване на памет**: Сесийният кеш е ограничен до 1000 записа (приблизително 1-2 MB). Кешът на сървърния клиент е ограничен до 100 записа.
4. **Студени стартове**: Първата заявка след внедряване винаги пропуска всички кеши в паметта.

### Наблюдение на производителността на кеша

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Справочник за конфигурация

| Кеш слой | TTL | Макс. размер | Изгонване | Обезсилване |
|-------------|-----|----------|----------|--------------|
| Съдържание (unstable_cache) | 600-те | Неограничен | Базиран на тагове | `revalidateTag()` |
| Сесия (в паметта) | 10 минути | 1000 | LRU + TTL | `invalidateSessionCache()` |
| API клиент на сървър | 5 минути | 100 | LRU + TTL | `clearCache()` |
| ISR страници | 600-те | Дисково базирано | Въз основа на времето | `revalidatePath()` |

## Отстраняване на неизправности

### Остарели данни след актуализация на съдържанието

1. Проверете дали `invalidateContentCaches()` се извиква след завършване на синхронизирането на хранилището.
2. Проверете съвпадението на таговете на кеша между кешираната функция и извикването за невалидност.
3. За незабавно обезсилване, обадете се на `clearFetchItemsCache()` , за да изчистите кеша на съдържанието в паметта.

### Кешът на сесиите пропуска при всяка заявка

1. Проверете дали токенът на сесията присъства в бисквитки или заглавки.
2. Проверете дали `extractSessionToken` може да анализира вашия формат на бисквитка.
3. Уверете се, че имената на маркерите за бисквитки съвпадат: `next-auth.session-token` или `__Secure-next-auth.session-token` .

### Използването на памет нараства

1. Кешът на сесията се самоограничава до 1000 записа с вероятностно почистване.
2. Принудително почистване: `sessionCache.clear()` .
3. Монитор с `getSessionCacheStats().size` .

## Свързана документация

- [Дълбоко потапяне в управлението на сесии](./session-management-deep-dive.md)
- [API клиентска архитектура](./api-client-architecture.md)
- [Оптимизация на база данни](./database-optimization.md)
