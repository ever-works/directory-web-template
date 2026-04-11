---
id: caching-deep-dive
title: Глубокое погружение в архитектуру кэширования
sidebar_label: Архитектура кэширования
sidebar_position: 1
---

# Глубокое погружение в архитектуру кэширования

В этом руководстве рассматривается многоуровневая архитектура кэширования, используемая в шаблоне, от кэшей сеансов в памяти до Next.js ISR и стратегий кэширования на уровне CDN.

## Обзор архитектуры

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

## Уровень 1: Кэш контента (Next.js `unstable_cache` )

Шаблон использует централизованную конфигурацию кэша, определенную в `lib/cache-config.ts` , для управления TTL и тегами кэша для всех данных контента.

### Конфигурация TTL кэша

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Теги кэша для целевой аннулирования

Теги кэша позволяют выполнять детальную инвалидацию без очистки всего кэша:

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

### Использование `unstable_cache` в функциях содержимого

Функции загрузки контента в файловой системе-обертке `lib/content.ts` считываются с помощью `unstable_cache` :

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

## Уровень 2: кэш сеанса (в памяти)

Класс `SessionCache` в `lib/auth/session-cache.ts` устраняет избыточные издержки аутентификации за счет кэширования декодированных сеансов в памяти.

### Как это работает

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

### Ключевые дизайнерские решения

| Решение | Значение | Обоснование |
|----------|-------|-----------|
| ТТЛ | 10 минут | Баланс между свежестью и сокращением накладных расходов |
| Максимальный размер | 1000 записей | Предотвращение утечек памяти на долго работающих серверах |
| Хеширование ключей | ША-256 | Предотвращение утечки токенов из дампов памяти |
| Очистка | 10% вероятностный | Амортизация затрат на очистку по всем запросам |
| Выселение | LRU (старейший-сначала) | Удалить последние созданные записи |

### Инвалидация кэша

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Уровень 3: Кэш клиента API сервера `ServerClient` в `lib/api/server-api-client.ts` включает встроенный кэш LRU для запросов GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Поведение кэша:
- **Кэшируются только GET-запросы** (мутации обходят кеш)
- **Запросы с AbortSignal** никогда не кэшируются.
- **Вытеснение LRU** удаляет самую старую запись, когда кэш достигает 100 элементов.
- **Срок действия на основе TTL** делает записи недействительными через 5 минут.

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Стратегия аннулирования кэша

Модуль `lib/cache-invalidation.ts` обеспечивает безопасную инвалидацию, которая обрабатывает ограничения фазы рендеринга Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

Обертка `safeRevalidateTag` обнаруживает ошибки на этапе рендеринга и регистрирует предупреждения вместо сбоя:

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

## ISR (инкрементная статическая регенерация)

Страницы используют ISR через экспорт `revalidate` или TTL для каждой функции:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Вопросы производительности

1. **Частота попаданий в кэш сеанса**: отслеживайте с помощью `getSessionCacheStats()` . Здоровый показатель выше 80%.
2. **Кэш контента**. 10-минутный срок жизни означает, что обновления контента появляются через 10 минут. Принудительная аннулирование после синхронизации для немедленных обновлений.
3. **Использование памяти**. Кэш сеанса ограничен 1000 записями (примерно 1–2 МБ). Кэш клиента сервера ограничен 100 записями.
4. **Холодный старт**: при первом запросе после развертывания всегда пропускаются все кэши в памяти.

### Мониторинг производительности кэша

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Справочник по конфигурации

| Уровень кэша | ТТЛ | Максимальный размер | Выселение | Аннулирование |
|-------------|-----|----------|----------|--------------|
| Содержимое (unstable_cache) | 600-е годы | Неограниченный | На основе тегов | `revalidateTag()` |
| Сеанс (в памяти) | 10 мин | 1000 | ЛРУ + ТТЛ | `invalidateSessionCache()` |
| API-клиент сервера | 5 мин | 100 | ЛРУ + ТТЛ | `clearCache()` |
| Страницы ISR | 600-е годы | Дисковый | На основе времени | `revalidatePath()` |

## Устранение неполадок

### Устаревшие данные после обновления контента

1. Убедитесь, что `invalidateContentCaches()` вызывается после завершения синхронизации репозитория.
2. Убедитесь, что теги кэша кэшированной функции и вызова аннулирования совпадают.
3. Для немедленной аннулирования нажмите `clearFetchItemsCache()` , чтобы очистить кэш содержимого в памяти.

### Кэш сеанса отсутствует при каждом запросе

1. Убедитесь, что токен сеанса присутствует в файлах cookie или заголовках.
2. Убедитесь, что `extractSessionToken` может анализировать формат вашего файла cookie.
3. Убедитесь, что имена файлов cookie токенов совпадают: `next-auth.session-token` или `__Secure-next-auth.session-token` .

### Использование памяти растет

1. Кэш сеанса самоограничивается до 1000 записей с вероятностной очисткой.
2. Принудительная очистка: `sessionCache.clear()` .
3. Мониторьте с помощью `getSessionCacheStats().size` .

## Сопутствующая документация

- [Подробное описание управления сеансами](./session-management-deep-dive.md)
- [Архитектура клиента API](./api-client-architecture.md)
- [Оптимизация базы данных](./database-optimization.md)
