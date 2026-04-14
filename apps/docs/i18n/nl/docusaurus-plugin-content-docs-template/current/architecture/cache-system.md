---
id: cache-system
title: "Cache-systeem"
sidebar_label: "Cache-systeem"
sidebar_position: 40
---

# Cache-systeem

## Overzicht

Het cachesysteem biedt gecentraliseerde cacheconfiguratie en invalidatie voor de Next.js-applicatie. Het definieert consistente TTL-duur (Time To Live) en op tags gebaseerde cachesleutels die worden gebruikt met Next.js `unstable_cache`, en biedt veilige cache-invalidatiehulpprogramma's die randgevallen zoals render-fasebeperkingen in Next.js 16 afhandelen.

## Architectuur

Het cachesysteem is opgesplitst in twee modules die samenwerken:

- **`lib/cache-config.ts`** -- Definieert alle cache-TTL-constanten en cache-taggenerators. Dit is de enige bron van waarheid over hoe lang gegevens in de cache blijven en welke tags worden gebruikt voor gerichte ongeldigverklaring.
- **`lib/cache-invalidation.ts`** -- Biedt asynchrone functies die `revalidateTag()` aanroepen om specifieke of alle inhoudgerelateerde caches ongeldig te maken. Het omhult elke oproep met veiligheidslogica om fouten in de weergavefase van Next.js netjes af te handelen.

Beide modules worden gebruikt door de inhoudslaag (`lib/content.ts`) en achtergrondsynchronisatieprocessen om gegevens in de cache actueel te houden na updates van de repository.

## API-referentie

### Exporteert vanuit `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Constant object dat de cacheduur in seconden definieert voor elke gegevenscategorie.

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

Cache-tagdefinities voor gebruik met `revalidateTag()`. Statische tags zijn gewone tekenreeksen; dynamische tags zijn fabrieksfuncties die een slug- of locale-parameter accepteren.

### Exporteert vanuit `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Maakt alle inhoudgerelateerde caches ongeldig (inhoud, items, categorieën, tags, verzamelingen, pagina's) en wist de `fetchItems`-cache in het geheugen. Moet worden aangeroepen na een succesvolle synchronisatie van de opslagplaats.

#### `invalidateItemCache(slug: string): Promise<void>`

Maakt de cache ongeldig voor een enkel item dat wordt geïdentificeerd door de slug.

#### `invalidatePageCache(slug: string): Promise<void>`

Maakt de cache ongeldig voor een enkele statische pagina die wordt geïdentificeerd door de slug.

## Implementatiedetails

**Veiligheid in de renderfase**: Next.js genereert een fout wanneer `revalidateTag()` wordt aangeroepen tijdens de React-renderfase. De interne `safeRevalidateTag()`-wrapper vangt deze specifieke fout op met behulp van `isRenderPhaseError()`, die controleert op meerdere stringpatronen (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) om hiertegen bestand te zijn Het Next.js-foutbericht verandert tussen versies.

**Volgende.js 16-compatibiliteit**: De `revalidateTag()`-aanroep bevat een tweede argument `'max'` voor verouderde-terwijl-revalidate semantiek, zoals vereist door Next.js 16.

**Cache in het geheugen wissen**: Na op tags gebaseerde invalidatie roept `invalidateContentCaches()` ook `clearFetchItemsCache()` aan om alle gegevens in het geheugen leeg te maken die de op bestanden gebaseerde cache van Next.js omzeilen.

## Configuratie

Er is geen aanvullende configuratie vereist. De TTL-waarden zijn hardgecodeerde constanten. Om de cacheduur te wijzigen, wijzigt u de waarden in `CACHE_TTL`.

|Constant|Duur|Gebruikscasus|
|----------|----------|----------|
|`CONTENT`|600s (10 min)|Algemene inhoudcache|
|`ITEM`|600s (10 min)|Individuele artikelpagina's|
|`CONFIG`|600s (10 min)|Siteconfiguratie|
|`PAGES`|600s (10 min)|Statische pagina's|

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik altijd `CACHE_TAGS`-constanten in plaats van hardcoding-tagtekenreeksen om typefouten te voorkomen en consistentie te garanderen.
- Bel `invalidateContentCaches()` na elke succesvolle repositorysynchronisatie om de gegevens actueel te houden.
- Gebruik landspecifieke tags (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) bij het cachen van door landinstellingen gefilterde gegevens om gerichte ongeldigverklaring mogelijk te maken.
- Bel `revalidateTag()` niet rechtstreeks; gebruik de veilige wrappers van `cache-invalidation.ts` om crashes tijdens de weergavefase te voorkomen.
- Houd TTL-waarden op één lijn met gerelateerde gegevenstypen om verouderde kruisverwijzingen te voorkomen.

## Gerelateerde modules

- [Content Library](/template/architecture/content-library) -- Primaire consument van cachetags en TTL-waarden
- [Config Manager System](./config-manager-system) -- Gebruikt `CACHE_TAGS.CONFIG` voor het cachen van siteconfiguraties
