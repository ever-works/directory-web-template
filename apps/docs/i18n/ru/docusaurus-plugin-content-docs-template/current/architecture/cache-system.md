---
id: cache-system
title: "Система кэширования"
sidebar_label: "Система кэширования"
sidebar_position: 40
---

# Система кэширования

## Обзор

Система кэширования обеспечивает централизованную настройку кэша и аннулирование приложения Next.js. Он определяет согласованную длительность TTL (время жизни) и ключи кэша на основе тегов, используемые с Next.js `unstable_cache`, а также предлагает безопасные утилиты аннулирования кэша, которые обрабатывают крайние случаи, такие как ограничения фазы рендеринга в Next.js 16.

## Архитектура

Система кэширования разделена на два модуля, которые работают вместе:

- **`lib/cache-config.ts`** — определяет все константы TTL кэша и генераторы тегов кэша. Это единственный источник достоверной информации о том, как долго данные хранятся в кэше и какие теги используются для целевой аннулирования.
- **`lib/cache-invalidation.ts`** — предоставляет асинхронные функции, которые вызывают `revalidateTag()` для аннулирования определенных или всех кэшей, связанных с содержимым. Он оборачивает каждый вызов логикой безопасности для корректной обработки ошибок на этапе рендеринга Next.js.

Оба модуля используются слоем контента (`lib/content.ts`) и процессами фоновой синхронизации, чтобы поддерживать актуальность кэшированных данных после обновлений репозитория.

## Справочник по API

### Экспорт из `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Объект-константа, определяющий продолжительность кэширования в секундах для каждой категории данных.

#### `CACHE_TAGS`

```typescript
export const CACHE_TAGS: {
  CONTENT: 'content';
  ITEMS: 'items';
  ITEM: (slug: string) => string;       // `item:${slug}`
  CATEGORIES: 'categories';
  TAGS: 'tags';
  COLLECTIONS: 'collections';
  CONFIG: 'config';
  PAGES: 'pages';
  PAGE: (slug: string) => string;       // `page:${slug}`
  ITEMS_LOCALE: (locale: string) => string;       // `items:${locale}`
  CATEGORIES_LOCALE: (locale: string) => string;  // `categories:${locale}`
  TAGS_LOCALE: (locale: string) => string;        // `tags:${locale}`
  COLLECTIONS_LOCALE: (locale: string) => string; // `collections:${locale}`
};
```

Кэшируйте определения тегов для использования с `revalidateTag()`. Статические теги представляют собой простые строки; динамические теги — это фабричные функции, которые принимают параметр пула или локали.

### Экспорт из `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Делает недействительными все кэши, связанные с контентом (содержимое, элементы, категории, теги, коллекции, страницы), и очищает кэш `fetchItems` в памяти. Должен вызываться после успешной синхронизации репозитория.

#### `invalidateItemCache(slug: string): Promise<void>`

Делает недействительным кэш для одного элемента, идентифицируемого его пулем.

#### `invalidatePageCache(slug: string): Promise<void>`

Делает недействительным кеш для одной статической страницы, идентифицируемой ее пулем.

## Детали реализации

**Безопасность на этапе рендеринга**: Next.js выдает ошибку, когда `revalidateTag()` вызывается на этапе рендеринга React. Внутренняя оболочка `safeRevalidateTag()` улавливает эту конкретную ошибку с помощью `isRenderPhaseError()`, которая проверяет наличие нескольких строковых шаблонов (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) на предмет устойчивости. против изменений сообщений об ошибках Next.js в разных версиях.

**Совместимость с Next.js 16**: вызов `revalidateTag()` включает второй аргумент `'max'` для семантики устаревших данных при повторной проверке, как того требует Next.js 16.

**Очистка кэша в памяти**: после аннулирования на основе тегов `invalidateContentCaches()` также вызывает `clearFetchItemsCache()` для очистки всех данных в памяти, которые обходят файловый кеш Next.js.

## Конфигурация

Никакой дополнительной настройки не требуется. Значения TTL являются жестко запрограммированными константами. Чтобы изменить длительность кэша, измените значения в `CACHE_TTL`.

|Константа|Продолжительность|Вариант использования|
|----------|----------|----------|
|`CONTENT`|600 с (10 мин)|Общий кеш контента|
|`ITEM`|600 с (10 мин)|Страницы отдельных товаров|
|`CONFIG`|600 с (10 мин)|Конфигурация сайта|
|`PAGES`|600 с (10 мин)|Статические страницы|

## Примеры использования

```typescript
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';
import { unstable_cache } from 'next/cache';

// Cache a data-fetching function with tags and TTL
const getCachedItems = unstable_cache(
  async () => {
    return await fetchItemsFromSource();
  },
  ['items-list'],
  {
    tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS],
    revalidate: CACHE_TTL.CONTENT,
  }
);

// Cache a single item with a dynamic tag
const getCachedItem = unstable_cache(
  async (slug: string) => {
    return await fetchItemBySlug(slug);
  },
  ['item-detail'],
  {
    tags: [CACHE_TAGS.ITEM('my-item-slug')],
    revalidate: CACHE_TTL.ITEM,
  }
);

// Invalidate all caches after a sync
import { invalidateContentCaches } from '@/lib/cache-invalidation';

async function onSyncComplete() {
  await invalidateContentCaches();
}

// Invalidate a single item after editing
import { invalidateItemCache } from '@/lib/cache-invalidation';

async function onItemUpdated(slug: string) {
  await invalidateItemCache(slug);
}
```

## Лучшие практики

- Всегда используйте константы `CACHE_TAGS` вместо строк тегов жесткого кодирования, чтобы избежать опечаток и обеспечить согласованность.
- Вызовите `invalidateContentCaches()` после каждой успешной синхронизации репозитория, чтобы данные оставались актуальными.
- Используйте теги, специфичные для локали (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) при кэшировании данных, отфильтрованных по локали, чтобы включить целевую инвалидацию.
- Не звоните `revalidateTag()` напрямую; используйте безопасные оболочки из `cache-invalidation.ts`, чтобы избежать сбоев на этапе рендеринга.
- Сохраняйте значения TTL согласованными для связанных типов данных, чтобы избежать устаревших перекрестных ссылок.

## Связанные модули

- [Библиотека контента](/template/architecture/content-library) — основной потребитель тегов кэша и значений TTL.
- [Система диспетчера конфигураций](./config-manager-system) — использует `CACHE_TAGS.CONFIG` для кэширования конфигурации сайта.
