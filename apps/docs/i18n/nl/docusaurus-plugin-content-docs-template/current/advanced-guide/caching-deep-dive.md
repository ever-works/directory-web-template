---
id: caching-deep-dive
title: Diepgaande cachingarchitectuur
sidebar_label: Caching-architectuur
sidebar_position: 1
---

# Cachingarchitectuur Deep Dive

Deze handleiding behandelt de meerlaagse cachingarchitectuur die in de sjabloon wordt gebruikt, van sessiecaches in het geheugen tot Next.js ISR en cachingstrategieën op CDN-niveau.

## Architectuuroverzicht

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

## Laag 1: Inhoudscache (Next.js `unstable_cache` )

De sjabloon maakt gebruik van gecentraliseerde cacheconfiguratie gedefinieerd in `lib/cache-config.ts` om TTL en cachetags voor alle inhoudsgegevens te beheren.

### Cache TTL-configuratie

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Cachetags voor gerichte ongeldigverklaring

Cachetags maken gedetailleerde ongeldigverklaring mogelijk zonder de hele cache leeg te maken:

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

### `unstable_cache` gebruiken in inhoudsfuncties

Functies voor het laden van inhoud in `lib/content.ts` wrap bestandssysteem leest met `unstable_cache` :

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

## Laag 2: Sessiecache (in geheugen)

De klasse `SessionCache` in `lib/auth/session-cache.ts` elimineert overtollige authenticatieoverhead door gedecodeerde sessies in het geheugen op te slaan.

### Hoe het werkt

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

### Belangrijke ontwerpbeslissingen

| Besluit | Waarde | Reden |
|----------|-------|-----------|
| TTL | 10 minuten | Balans tussen versheid en overheadreductie |
| Maximale grootte | 1.000 inzendingen | Voorkom geheugenlekken op langlopende servers |
| Sleutelhash | SHA-256 | Voorkom tokenlekken in geheugendumps |
| Opruimen | 10% probabilistisch | Opruimkosten over aanvragen afschrijven |
| Uitzetting | LRU (oudste eerst) | Verwijder de minst recent aangemaakte vermeldingen |

### Cache-invalidatie

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Laag 3: Server-API-clientcache

De `ServerClient` in `lib/api/server-api-client.ts` bevat een ingebouwde LRU-cache voor GET-verzoeken:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Cachegedrag:
- **Alleen GET-verzoeken** worden in de cache opgeslagen (mutaties omzeilen de cache)
- **Verzoeken met AbortSignal** worden nooit in de cache opgeslagen
- **LRU-uitzetting** verwijdert het oudste item wanneer de cache 100 items bereikt
- **Op TTL gebaseerde vervaldatum** maakt inschrijvingen na 5 minuten ongeldig

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Cache-invalidatiestrategie

De `lib/cache-invalidation.ts` -module biedt veilige ongeldigverklaring die de beperkingen in de renderfase van Next.js afhandelt:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

De wrapper `safeRevalidateTag` detecteert fouten in de weergavefase en registreert waarschuwingen in plaats van te crashen:

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

## ISR (incrementele statische regeneratie)

Pagina's gebruiken ISR via de `revalidate` export- of per-functie-TTL's:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Prestatieoverwegingen

1. **Trefferpercentage sessiecache**: monitor met `getSessionCacheStats()` . Een gezond percentage ligt boven de 80%.
2. **Inhoudscache**: De TTL van 10 minuten betekent dat het tot 10 minuten kan duren voordat inhoudsupdates verschijnen. Forceer invalidatie na synchronisatie voor onmiddellijke updates.
3. **Geheugengebruik**: de sessiecache bedraagt ​​maximaal 1.000 vermeldingen (ongeveer 1-2 MB). De cache van de serverclient is beperkt tot 100 vermeldingen.
4. **Koude start**: Bij het eerste verzoek na implementatie worden altijd alle caches in het geheugen gemist.

### Cacheprestaties bewaken

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Configuratiereferentie

| Cachelaag | TTL | Maximale grootte | Uitzetting | Ongeldigheid |
|------------|-----|----------|----------|-------------|
| Inhoud (unstable_cache) | 600's | Onbeperkt | Op tags gebaseerd | `revalidateTag()` |
| Sessie (in het geheugen) | 10 minuten | 1.000 | LRU + TTL | `invalidateSessionCache()` |
| Server API-client | 5 minuten | 100 | LRU + TTL | `clearCache()` |
| ISR-pagina's | 600's | Op schijf gebaseerd | Op tijd gebaseerd | `revalidatePath()` |

## Problemen oplossen

### Verouderde gegevens na inhoudsupdate

1. Controleer of `invalidateContentCaches()` wordt aangeroepen nadat de synchronisatie van de opslagplaats is voltooid.
2. Controleer of de cachetags overeenkomen tussen de in de cache opgeslagen functie en de ongeldigverklaringsaanroep.
3. Voor onmiddellijke ongeldigverklaring belt u `clearFetchItemsCache()` om de inhoudscache in het geheugen te wissen.

### Sessiecache mist bij elk verzoek

1. Controleer of het sessietoken aanwezig is in cookies of headers.
2. Controleer of `extractSessionToken` uw cookie-formaat kan parseren.
3. Zorg ervoor dat de namen van de tokencookies overeenkomen: `next-auth.session-token` of `__Secure-next-auth.session-token` .

### Geheugengebruik groeit

1. De sessiecache beperkt zichzelf tot 1.000 vermeldingen met probabilistische opschoning.
2. Opruimen forceren: `sessionCache.clear()` .
3. Monitor met `getSessionCacheStats().size` .

## Gerelateerde documentatie

- [Session Management Deep Dive](./session-management-deep-dive.md)
- [API-clientarchitectuur] (./api-client-architectuur.md)
- [Databaseoptimalisatie](./database-optimalisatie.md)
