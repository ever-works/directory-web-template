---
id: cache-system
title: "Кеш система"
sidebar_label: "Кеш система"
sidebar_position: 40
---

# Кеш система

## Преглед

Кеш системата осигурява централизирана конфигурация на кеша и невалидност за приложението Next.js. Той дефинира последователни продължителности на TTL (Time To Live) и базирани на етикети кеш ключове, използвани с Next.js `unstable_cache`, и предлага безопасни помощни програми за невалидност на кеша, които обработват крайни случаи като ограничения на фазата на изобразяване в Next.js 16.

## Архитектура

Кеш системата е разделена на два модула, които работят заедно:

- **`lib/cache-config.ts`** -- Дефинира всички кеш TTL константи и генератори на кеш тагове. Това е единственият източник на истина за това колко дълго данните остават кеширани и какви тагове се използват за насочена невалидност.
- **`lib/cache-invalidation.ts`** -- Осигурява асинхронни функции, които извикват `revalidateTag()`, за да анулират конкретни или всички кешове, свързани със съдържание. Той обгръща всяко повикване в логиката за безопасност, за да обработва грациозно грешките във фазата на изобразяване на Next.js.

И двата модула се консумират от слоя със съдържание (`lib/content.ts`) и процесите на фоново синхронизиране, за да поддържат кешираните данни свежи след актуализации на хранилището.

## Справка за API

### Износ от `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Константен обект, определящ продължителността на кеша в секунди за всяка категория данни.

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

Дефиниции на кеш тагове за използване с `revalidateTag()`. Статичните тагове са обикновени низове; динамичните тагове са фабрични функции, които приемат slug или локален параметър.

### Износ от `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Анулира всички кешове, свързани със съдържание (съдържание, елементи, категории, тагове, колекции, страници) и изчиства кеша `fetchItems` в паметта. Трябва да се извика след успешна синхронизация на хранилището.

#### `invalidateItemCache(slug: string): Promise<void>`

Анулира кеша за единичен елемент, идентифициран от неговия плужек.

#### `invalidatePageCache(slug: string): Promise<void>`

Анулира кеша за една статична страница, идентифицирана от нейния охлюв.

## Подробности за изпълнението

**Безопасност на фазата на изобразяване**: Next.js хвърля грешка, когато `revalidateTag()` се извиква по време на фазата на изобразяване на React. Вътрешната `safeRevalidateTag()` обвивка улавя тази конкретна грешка с помощта на `isRenderPhaseError()`, която проверява за множество модели на низове (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`), за да бъдете устойчиви на промени в съобщението за грешка на Next.js във версиите.

**Съвместимост с Next.js 16**: Извикването `revalidateTag()` включва втори аргумент `'max'` за остаряла семантика за повторно валидиране, както се изисква от Next.js 16.

**Изчистване на кеша в паметта**: След обезсилване, базирано на тагове, `invalidateContentCaches()` извиква също `clearFetchItemsCache()`, за да изчисти всички данни в паметта, които заобикалят базирания на файл Next.js кеш.

## Конфигурация

Не е необходима допълнителна конфигурация. TTL стойностите са твърдо кодирани константи. За да промените продължителността на кеша, променете стойностите в `CACHE_TTL`.

|Константа|Продължителност|Случай на употреба|
|----------|----------|----------|
|`CONTENT`|600 сек. (10 мин.)|Кеш за общо съдържание|
|`ITEM`|600 сек. (10 мин.)|Страници с отделни артикули|
|`CONFIG`|600 сек. (10 мин.)|Конфигурация на сайта|
|`PAGES`|600 сек. (10 мин.)|Статични страници|

## Примери за използване

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

## Най-добри практики

- Винаги използвайте `CACHE_TAGS` константи вместо твърдо кодирани низове на тагове, за да избегнете правописни грешки и да осигурите последователност.
- Обадете се на `invalidateContentCaches()` след всяко успешно синхронизиране на хранилището, за да поддържате данните свежи.
- Използвайте специфични за локализация тагове (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`), когато кеширате филтрирани по локализация данни, за да активирате насочено обезсилване.
- Не се обаждайте директно на `revalidateTag()`; използвайте безопасните обвивки от `cache-invalidation.ts`, за да избегнете сривове във фазата на изобразяване.
- Поддържайте TTL стойностите подравнени между свързаните типове данни, за да предотвратите остарели кръстосани препратки.

## Свързани модули

- [Библиотека със съдържание](/template/architecture/content-library) -- Основен потребител на кеш тагове и TTL стойности
- [Config Manager System](./config-manager-system) -- Използва `CACHE_TAGS.CONFIG` за кеширане на конфигурацията на сайта
