---
id: caching-deep-dive
title: Approfondimento sull'architettura della cache
sidebar_label: Architettura della cache
sidebar_position: 1
---

# Approfondimento sull'architettura della cache

Questa guida copre l'architettura di caching a più livelli utilizzata nel modello, dalle cache delle sessioni in memoria alle strategie di caching a livello di ISR e CDN di Next.js.

## Panoramica dell'architettura

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

## Livello 1: cache dei contenuti (Next.js `unstable_cache` )

Il modello utilizza la configurazione della cache centralizzata definita in `lib/cache-config.ts` per gestire i tag TTL e cache per tutti i dati del contenuto.

### Configurazione TTL della cache

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Tag della cache per l'invalidazione mirata

I tag della cache consentono l'invalidazione dettagliata senza svuotare l'intera cache:

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

### Utilizzo di `unstable_cache` nelle funzioni contenuto

Le funzioni di caricamento del contenuto nel filesystem wrap `lib/content.ts` si leggono con `unstable_cache` :

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

## Livello 2: cache di sessione (in memoria)

La classe `SessionCache` in `lib/auth/session-cache.ts` elimina il sovraccarico di autenticazione ridondante memorizzando nella cache le sessioni decodificate.

### Come funziona

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

### Decisioni chiave sulla progettazione

| Decisione | Valore | Motivazione |
|----------|-------|-----------|
| TTL | 10 minuti | Equilibrio tra freschezza e riduzione delle spese generali |
| Dimensione massima | 1.000 voci | Prevenire perdite di memoria su server con esecuzione prolungata |
| Hashing chiave | SHA-256 | Prevenire la perdita di token nei dump della memoria |
| Pulizia | 10% probabilistico | Ammortizzare i costi di pulizia tra le richieste |
| Sfratto | LRU (prima il più vecchio) | Rimuovi le voci create meno di recente |

### Invalidazione della cache

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Livello 3: cache client API server

Il `ServerClient` in `lib/api/server-api-client.ts` include una cache LRU incorporata per le richieste GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Comportamento della cache:
- **Solo le richieste GET** vengono memorizzate nella cache (le mutazioni ignorano la cache)
- **Le richieste con AbortSignal** non vengono mai memorizzate nella cache
- **Sfratto LRU** rimuove la voce più vecchia quando la cache raggiunge 100 elementi
- La **Scadenza basata su TTL** invalida le voci dopo 5 minuti

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Strategia di invalidazione della cache

Il modulo `lib/cache-invalidation.ts` fornisce un invalidamento sicuro che gestisce le restrizioni della fase di rendering Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

Il wrapper `safeRevalidateTag` rileva gli errori della fase di rendering e registra gli avvisi invece di bloccarsi:

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

## ISR (rigenerazione statica incrementale)

Le pagine utilizzano ISR tramite l'esportazione `revalidate` o TTL per funzione:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Considerazioni sulle prestazioni

1. **Percentuale di riscontri nella cache della sessione**: monitorare utilizzando `getSessionCacheStats()` . Un tasso salutare è superiore all’80%.
2. **Cache dei contenuti**: il TTL di 10 minuti significa che gli aggiornamenti dei contenuti richiedono fino a 10 minuti per essere visualizzati. Forza l'invalidamento dopo la sincronizzazione per aggiornamenti immediati.
3. **Utilizzo della memoria**: la cache della sessione ha un limite di 1.000 voci (circa 1-2 MB). Il limite della cache del client server è di 100 voci.
4. **Avvii a freddo**: alla prima richiesta dopo la distribuzione mancano sempre tutte le cache in memoria.

### Monitoraggio delle prestazioni della cache

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Riferimento alla configurazione

| Livello cache | TTL | Dimensione massima | Sfratto | Invalidazione |
|-------------|-----|----------|----------|--------------|
| Contenuto (unstable_cache) | 600 | Illimitato | Basato su tag | `revalidateTag()` |
| Sessione (in memoria) | 10 minuti | 1.000 | LRU + TTL | `invalidateSessionCache()` |
| Client API server | 5 minuti | 100| LRU + TTL | `clearCache()` |
| Pagine PVR | 600 | Basato su disco | Basato sul tempo | `revalidatePath()` |

## Risoluzione dei problemi

### Dati obsoleti dopo l'aggiornamento del contenuto

1. Verificare che venga richiamato `invalidateContentCaches()` al termine della sincronizzazione del repository.
2. Verificare che i tag della cache corrispondano tra la funzione memorizzata nella cache e la chiamata di invalidamento.
3. Per l'invalidamento immediato, chiamare `clearFetchItemsCache()` per cancellare la cache dei contenuti in memoria.

### La cache della sessione fallisce ad ogni richiesta

1. Verificare che il token di sessione sia presente nei cookie o nelle intestazioni.
2. Controlla che `extractSessionToken` possa analizzare il formato del tuo cookie.
3. Assicurati che i nomi dei cookie token corrispondano: `next-auth.session-token` o `__Secure-next-auth.session-token` .

### Utilizzo della memoria in aumento

1. La cache della sessione si autolimita a 1.000 voci con pulizia probabilistica.
2. Forza pulizia: `sessionCache.clear()` .
3. Monitorare con `getSessionCacheStats().size` .

## Documentazione correlata

- [Approfondimento sulla gestione della sessione](./session-management-deep-dive.md)
- [Architettura client API](./api-client-architecture.md)
- [Ottimizzazione del database](./database-optimization.md)
