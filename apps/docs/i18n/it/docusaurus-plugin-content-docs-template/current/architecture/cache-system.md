---
id: cache-system
title: "Sistema di cache"
sidebar_label: "Sistema di cache"
sidebar_position: 40
---

# Sistema di cache

## Panoramica

Il sistema di cache fornisce la configurazione e l'invalidamento centralizzati della cache per l'applicazione Next.js. Definisce durate TTL (Time To Live) coerenti e chiavi di cache basate su tag utilizzate con Next.js `unstable_cache` e offre utilità sicure di invalidamento della cache che gestiscono casi limite come le restrizioni della fase di rendering in Next.js 16.

## Architettura

Il sistema di cache è suddiviso in due moduli che lavorano insieme:

- **`lib/cache-config.ts`** -- Definisce tutte le costanti TTL della cache e i generatori di tag della cache. Questa è l'unica fonte di verità per quanto tempo i dati rimangono nella cache e quali tag vengono utilizzati per l'invalidazione mirata.
- **`lib/cache-invalidation.ts`** -- Fornisce funzioni asincrone che chiamano `revalidateTag()` per invalidare cache specifiche o tutte relative ai contenuti. Avvolge ogni chiamata nella logica di sicurezza per gestire con garbo gli errori della fase di rendering di Next.js.

Entrambi i moduli vengono utilizzati dal livello di contenuto (`lib/content.ts`) e dai processi di sincronizzazione in background per mantenere aggiornati i dati memorizzati nella cache dopo gli aggiornamenti del repository.

## Riferimento API

### Esportazioni da `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Oggetto costante che definisce la durata della cache in secondi per ciascuna categoria di dati.

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

Memorizza nella cache le definizioni dei tag da utilizzare con `revalidateTag()`. I tag statici sono stringhe semplici; i tag dinamici sono funzioni di fabbrica che accettano uno slug o un parametro locale.

### Esportazioni da `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Invalida tutte le cache relative ai contenuti (contenuti, elementi, categorie, tag, raccolte, pagine) e cancella la cache in memoria `fetchItems`. Dovrebbe essere chiamato dopo una sincronizzazione del repository riuscita.

#### `invalidateItemCache(slug: string): Promise<void>`

Invalida la cache per un singolo elemento identificato dal suo slug.

#### `invalidatePageCache(slug: string): Promise<void>`

Invalida la cache per una singola pagina statica identificata dal suo slug.

## Dettagli di implementazione

**Sicurezza della fase di rendering**: Next.js genera un errore quando `revalidateTag()` viene chiamato durante la fase di rendering di React. Il wrapper interno `safeRevalidateTag()` rileva questo errore specifico utilizzando `isRenderPhaseError()`, che verifica la resilienza di più modelli di stringa (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) contro le modifiche del messaggio di errore Next.js tra le versioni.

**Compatibilità con Next.js 16**: la chiamata `revalidateTag()` include un secondo argomento `'max'` per la semantica stale- while-revalidate, come richiesto da Next.js 16.

**Cancellazione della cache in memoria**: dopo l'invalidazione basata su tag, `invalidateContentCaches()` chiama anche `clearFetchItemsCache()` per svuotare tutti i dati in memoria che ignorano la cache basata su file Next.js.

## Configurazione

Non è richiesta alcuna configurazione aggiuntiva. I valori TTL sono costanti codificate. Per modificare la durata della cache, modificare i valori in `CACHE_TTL`.

|Costante|Durata|Caso d'uso|
|----------|----------|----------|
|`CONTENT`|600 (10 minuti)|Cache dei contenuti generali|
|`ITEM`|600 (10 minuti)|Pagine di singoli articoli|
|`CONFIG`|600 (10 minuti)|Configurazione del sito|
|`PAGES`|600 (10 minuti)|Pagine statiche|

## Esempi di utilizzo

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

## Migliori pratiche

- Utilizza sempre le costanti `CACHE_TAGS` anziché le stringhe di tag hardcoding per evitare errori di battitura e garantire la coerenza.
- Chiama `invalidateContentCaches()` dopo ogni sincronizzazione riuscita del repository per mantenere aggiornati i dati.
- Utilizza tag specifici delle impostazioni locali (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) durante la memorizzazione nella cache dei dati filtrati a livello locale per abilitare l'invalidamento mirato.
- Non chiamare direttamente `revalidateTag()`; utilizzare i wrapper sicuri di `cache-invalidation.ts` per evitare arresti anomali della fase di rendering.
- Mantieni i valori TTL allineati tra i tipi di dati correlati per evitare riferimenti incrociati non aggiornati.

## Moduli correlati

- [Libreria contenuti](/template/architecture/content-library) -- Consumatore primario di tag cache e valori TTL
- [Config Manager System](./config-manager-system) -- Utilizza `CACHE_TAGS.CONFIG` per la memorizzazione nella cache della configurazione del sito
