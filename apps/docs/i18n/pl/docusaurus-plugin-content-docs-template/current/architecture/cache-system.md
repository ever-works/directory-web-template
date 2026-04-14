---
id: cache-system
title: "System pamięci podręcznej"
sidebar_label: "System pamięci podręcznej"
sidebar_position: 40
---

# System pamięci podręcznej

## Przegląd

System pamięci podręcznej zapewnia scentralizowaną konfigurację pamięci podręcznej i unieważnianie aplikacji Next.js. Definiuje spójne czasy trwania TTL (Time To Live) i oparte na tagach klucze pamięci podręcznej używane z Next.js `unstable_cache` i oferuje bezpieczne narzędzia do unieważniania pamięci podręcznej, które obsługują przypadki brzegowe, takie jak ograniczenia fazy renderowania w Next.js 16.

## Architektura

System pamięci podręcznej jest podzielony na dwa współpracujące ze sobą moduły:

- **`lib/cache-config.ts`** — Definiuje wszystkie stałe TTL pamięci podręcznej i generatory znaczników pamięci podręcznej. Jest to jedyne źródło prawdy o tym, jak długo dane pozostają w pamięci podręcznej i jakie znaczniki są używane do ukierunkowanego unieważniania.
- **`lib/cache-invalidation.ts`** — Zapewnia funkcje asynchroniczne, które wywołują `revalidateTag()` w celu unieważnienia określonych lub wszystkich pamięci podręcznych związanych z zawartością. Otacza każde wywołanie logiką bezpieczeństwa, aby sprawnie obsługiwać błędy fazy renderowania Next.js.

Obydwa moduły są wykorzystywane przez warstwę treści (`lib/content.ts`) i procesy synchronizacji w tle, aby zachować świeżość danych w pamięci podręcznej po aktualizacjach repozytorium.

## Dokumentacja API

### Eksport z `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Obiekt stały określający czas trwania pamięci podręcznej w sekundach dla każdej kategorii danych.

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

Definicje znaczników pamięci podręcznej do użytku z `revalidateTag()`. Tagi statyczne to zwykłe ciągi znaków; znaczniki dynamiczne to funkcje fabryczne, które akceptują parametr slug lub locale.

### Eksport z `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Unieważnia wszystkie pamięci podręczne związane z zawartością (treść, elementy, kategorie, znaczniki, kolekcje, strony) i czyści pamięć podręczną `fetchItems` w pamięci. Należy wywołać po pomyślnej synchronizacji repozytorium.

#### `invalidateItemCache(slug: string): Promise<void>`

Unieważnia pamięć podręczną dla pojedynczego elementu zidentyfikowanego przez jego ślimak.

#### `invalidatePageCache(slug: string): Promise<void>`

Unieważnia pamięć podręczną dla pojedynczej strony statycznej zidentyfikowanej przez jej błąd.

## Szczegóły wdrożenia

**Bezpieczeństwo fazy renderowania**: Next.js zgłasza błąd, gdy podczas fazy renderowania React wywoływany jest `revalidateTag()`. Wewnętrzne opakowanie `safeRevalidateTag()` wychwytuje ten konkretny błąd za pomocą `isRenderPhaseError()`, które sprawdza, czy wiele wzorców ciągów (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) ma być odporne przed zmianami komunikatów o błędach Next.js w różnych wersjach.

**Zgodność z Next.js 16**: Wywołanie `revalidateTag()` zawiera drugi argument `'max'` dla semantyki „nieaktualne-while-revalidate”, zgodnie z wymogami Next.js 16.

**Czyszczenie pamięci podręcznej w pamięci**: Po unieważnieniu na podstawie znaczników `invalidateContentCaches()` wywołuje również `clearFetchItemsCache()` w celu opróżnienia wszelkich danych w pamięci, które omijają pamięć podręczną opartą na plikach Next.js.

## Konfiguracja

Nie jest wymagana żadna dodatkowa konfiguracja. Wartości TTL są stałymi zakodowanymi na stałe. Aby zmienić czas trwania pamięci podręcznej, zmodyfikuj wartości w `CACHE_TTL`.

|Stała|Czas trwania|Przypadek użycia|
|----------|----------|----------|
|`CONTENT`|600 s (10 min)|Ogólna pamięć podręczna zawartości|
|`ITEM`|600 s (10 min)|Strony poszczególnych elementów|
|`CONFIG`|600 s (10 min)|Konfiguracja witryny|
|`PAGES`|600 s (10 min)|Strony statyczne|

## Przykłady użycia

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

## Najlepsze praktyki

- Zawsze używaj stałych `CACHE_TAGS` zamiast zakodowanych na stałe ciągów znaczników, aby uniknąć literówek i zapewnić spójność.
- Zadzwoń do `invalidateContentCaches()` po każdej udanej synchronizacji repozytorium, aby zachować świeżość danych.
- Użyj znaczników specyficznych dla ustawień regionalnych (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) podczas buforowania danych filtrowanych według ustawień regionalnych, aby umożliwić ukierunkowane unieważnianie.
- Nie dzwoń bezpośrednio do `revalidateTag()`; użyj bezpiecznych opakowań z `cache-invalidation.ts`, aby uniknąć awarii w fazie renderowania.
- Utrzymuj wartości TTL wyrównane w powiązanych typach danych, aby zapobiec nieaktualnym odsyłaczom.

## Powiązane moduły

- [Biblioteka treści](/template/architecture/content-library) — Główny odbiorca tagów pamięci podręcznej i wartości TTL
- [Config Manager System](./config-manager-system) — Używa `CACHE_TAGS.CONFIG` do buforowania konfiguracji witryny
