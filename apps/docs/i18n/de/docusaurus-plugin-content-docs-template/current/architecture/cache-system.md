---
id: cache-system
title: "Cache-System"
sidebar_label: "Cache-System"
sidebar_position: 40
---

# Cache-System

## Übersicht

Das Cache-System bietet eine zentralisierte Cache-Konfiguration und -Invalidierung für die Next.js-Anwendung. Es definiert konsistente TTL-Dauern (Time To Live) und tagbasierte Cache-Schlüssel, die mit Next.js `unstable_cache` verwendet werden, und bietet sichere Dienstprogramme zur Cache-Ungültigmachung, die Randfälle wie Renderphasenbeschränkungen in Next.js 16 behandeln.

## Architektur

Das Cache-System ist in zwei Module aufgeteilt, die zusammenarbeiten:

- **`lib/cache-config.ts`** – Definiert alle Cache-TTL-Konstanten und Cache-Tag-Generatoren. Dies ist die einzige Quelle der Wahrheit darüber, wie lange Daten zwischengespeichert bleiben und welche Tags für die gezielte Ungültigmachung verwendet werden.
- **`lib/cache-invalidation.ts`** – Stellt asynchrone Funktionen bereit, die `revalidateTag()` aufrufen, um bestimmte oder alle inhaltsbezogenen Caches ungültig zu machen. Es verpackt jeden Aufruf in Sicherheitslogik, um Fehler in der Renderphase von Next.j ordnungsgemäß zu behandeln.

Beide Module werden von der Inhaltsschicht (`lib/content.ts`) und Hintergrundsynchronisierungsprozessen genutzt, um zwischengespeicherte Daten nach Repository-Aktualisierungen auf dem neuesten Stand zu halten.

## API-Referenz

### Exporte von `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Konstantes Objekt, das die Cache-Dauer in Sekunden für jede Datenkategorie definiert.

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

Cache-Tag-Definitionen zur Verwendung mit `revalidateTag()`. Statische Tags sind einfache Zeichenfolgen. Dynamische Tags sind Factory-Funktionen, die einen Slug- oder Locale-Parameter akzeptieren.

### Exporte von `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Macht alle inhaltsbezogenen Caches ungültig (Inhalte, Elemente, Kategorien, Tags, Sammlungen, Seiten) und löscht den In-Memory-Cache `fetchItems`. Sollte nach einer erfolgreichen Repository-Synchronisierung aufgerufen werden.

#### `invalidateItemCache(slug: string): Promise<void>`

Macht den Cache für ein einzelnes Element ungültig, das durch seinen Slug identifiziert wird.

#### `invalidatePageCache(slug: string): Promise<void>`

Macht den Cache für eine einzelne statische Seite ungültig, die durch ihren Slug identifiziert wird.

## Implementierungsdetails

**Sicherheit in der Renderphase**: Next.js löst einen Fehler aus, wenn `revalidateTag()` während der React-Renderphase aufgerufen wird. Der interne `safeRevalidateTag()`-Wrapper fängt diesen spezifischen Fehler mithilfe von `isRenderPhaseError()` ab, der prüft, ob mehrere Zeichenfolgenmuster (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) resistent sind Die Fehlermeldung von Next.js ändert sich je nach Version.

**Next.js 16-Kompatibilität**: Der `revalidateTag()`-Aufruf enthält ein zweites Argument `'max'` für die Stale-While-Revalidate-Semantik, wie von Next.js 16 gefordert.

**Löschen des In-Memory-Cache**: Nach der tagbasierten Ungültigmachung ruft `invalidateContentCaches()` auch `clearFetchItemsCache()` auf, um alle In-Memory-Daten zu leeren, die den dateibasierten Next.js-Cache umgehen.

## Konfiguration

Es ist keine zusätzliche Konfiguration erforderlich. Die TTL-Werte sind fest codierte Konstanten. Um die Cache-Dauer zu ändern, ändern Sie die Werte in `CACHE_TTL`.

|Konstant|Dauer|Anwendungsfall|
|----------|----------|----------|
|`CONTENT`|600 Sek. (10 Min.)|Allgemeiner Inhaltscache|
|`ITEM`|600 Sek. (10 Min.)|Einzelne Artikelseiten|
|`CONFIG`|600 Sek. (10 Min.)|Site-Konfiguration|
|`PAGES`|600 Sek. (10 Min.)|Statische Seiten|

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie immer `CACHE_TAGS`-Konstanten anstelle von fest codierten Tag-Strings, um Tippfehler zu vermeiden und Konsistenz sicherzustellen.
- Rufen Sie `invalidateContentCaches()` nach jeder erfolgreichen Repository-Synchronisierung auf, um die Daten aktuell zu halten.
- Verwenden Sie beim Zwischenspeichern von nach dem Gebietsschema gefilterten Daten gebietsschemaspezifische Tags (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`), um eine gezielte Ungültigmachung zu ermöglichen.
- Rufen Sie `revalidateTag()` nicht direkt an; Verwenden Sie die sicheren Wrapper von `cache-invalidation.ts`, um Abstürze in der Renderphase zu vermeiden.
- Sorgen Sie dafür, dass die TTL-Werte über verwandte Datentypen hinweg ausgerichtet sind, um veraltete Querverweise zu verhindern.

## Verwandte Module

- [Inhaltsbibliothek](/template/architecture/content-library) – Hauptkonsument von Cache-Tags und TTL-Werten
- [Config Manager System](./config-manager-system) – Verwendet `CACHE_TAGS.CONFIG` für die Zwischenspeicherung der Site-Konfiguration
