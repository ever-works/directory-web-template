---
id: caching-deep-dive
title: Caching-Architektur im Detail
sidebar_label: Caching-Architektur
sidebar_position: 1
---

# Deep Dive zur Caching-Architektur

Dieser Leitfaden behandelt die mehrschichtige Caching-Architektur, die in der gesamten Vorlage verwendet wird, von In-Memory-Sitzungscaches bis hin zu Next.js ISR- und CDN-Level-Caching-Strategien.

## Architekturübersicht

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

## Ebene 1: Content Cache (Next.js `unstable_cache` )

Die Vorlage verwendet die in `lib/cache-config.ts` definierte zentralisierte Cache-Konfiguration, um TTL- und Cache-Tags für alle Inhaltsdaten zu verwalten.

### Cache-TTL-Konfiguration

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Cache-Tags für gezielte Invalidierung

Cache-Tags ermöglichen eine differenzierte Invalidierung, ohne den gesamten Cache zu leeren:

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

### Verwendung von `unstable_cache` in Inhaltsfunktionen

Inhaltsladefunktionen in `lib/content.ts` Wrap-Dateisystem liest mit `unstable_cache` :

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

## Schicht 2: Sitzungscache (In-Memory)

Die `SessionCache` -Klasse in `lib/auth/session-cache.ts` eliminiert den redundanten Authentifizierungsaufwand, indem entschlüsselte Sitzungen im Speicher zwischengespeichert werden.

### Wie es funktioniert

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

### Wichtige Designentscheidungen

| Entscheidung | Wert | Begründung |
|----------|-------|-----------|
| TTL | 10 Minuten | Balance zwischen Frische und Overhead-Reduktion |
| Maximale Größe | 1.000 Einträge | Verhindern Sie Speicherlecks auf Servern mit langer Laufzeit |
| Schlüssel-Hashing | SHA-256 | Verhindern Sie Token-Lecks in Speicherauszügen |
| Aufräumen | 10 % probabilistisch | Bereinigungskosten über alle Anfragen hinweg amortisieren |
| Räumung | LRU (Älteste zuerst) | Zuletzt erstellte Einträge entfernen |

### Cache-Ungültigkeitserklärung

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Schicht 3: Server-API-Client-Cache

Der `ServerClient` in `lib/api/server-api-client.ts` enthält einen integrierten LRU-Cache für GET-Anfragen:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Cache-Verhalten:
- **Nur GET-Anfragen** werden zwischengespeichert (Mutationen umgehen den Cache)
- **Anfragen mit AbortSignal** werden nie zwischengespeichert
– **LRU-Räumung** entfernt den ältesten Eintrag, wenn der Cache 100 Elemente erreicht
- **TTL-basierter Ablauf** macht Einträge nach 5 Minuten ungültig

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Cache-Invalidierungsstrategie

Das `lib/cache-invalidation.ts` -Modul bietet eine sichere Invalidierung, die Next.js-Renderphaseneinschränkungen behandelt:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

Der `safeRevalidateTag` -Wrapper erkennt Fehler in der Renderphase und protokolliert Warnungen, anstatt abzustürzen:

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

## ISR (Inkrementelle statische Regeneration)

Seiten nutzen ISR über den `revalidate` -Export oder TTLs pro Funktion:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Leistungsüberlegungen

1. **Trefferquote des Sitzungscache**: Überwachen Sie mit `getSessionCacheStats()` . Eine gesunde Rate liegt über 80 %.
2. **Inhaltscache**: Die 10-Minuten-TTL bedeutet, dass es bis zu 10 Minuten dauern kann, bis Inhaltsaktualisierungen angezeigt werden. Erzwingen Sie die Ungültigmachung nach der Synchronisierung für sofortige Updates.
3. **Speichernutzung**: Der Sitzungscache ist auf 1.000 Einträge (ca. 1–2 MB) begrenzt. Der Server-Client-Cache ist auf 100 Einträge begrenzt.
4. **Kaltstarts**: Bei der ersten Anfrage nach der Bereitstellung fehlen immer alle In-Memory-Caches.

### Cache-Leistung überwachen

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Konfigurationsreferenz

| Cache-Schicht | TTL | Maximale Größe | Räumung | Ungültigkeit |
|-------------|-----|----------|----------|--------------|
| Inhalt (unstable_cache) | 600er | Unbegrenzt | Tag-basiert | `revalidateTag()` |
| Sitzung (im Speicher) | 10 Minuten | 1.000 | LRU + TTL | `invalidateSessionCache()` |
| Server-API-Client | 5 Minuten | 100 | LRU + TTL | `clearCache()` |
| ISR-Seiten | 600er | Festplattenbasiert | Zeitbasiert | `revalidatePath()` |

## Fehlerbehebung

### Veraltete Daten nach Inhaltsaktualisierung

1. Überprüfen Sie, ob `invalidateContentCaches()` aufgerufen wird, nachdem die Repository-Synchronisierung abgeschlossen ist.
2. Überprüfen Sie, ob die Cache-Tags zwischen der zwischengespeicherten Funktion und dem Invalidierungsaufruf übereinstimmen.
3. Für eine sofortige Ungültigmachung rufen Sie `clearFetchItemsCache()` auf, um den In-Memory-Content-Cache zu leeren.

### Sitzungscache-Fehler bei jeder Anfrage

1. Überprüfen Sie, ob das Sitzungstoken in Cookies oder Headern vorhanden ist.
2. Überprüfen Sie, ob `extractSessionToken` Ihr Cookie-Format analysieren kann.
3. Stellen Sie sicher, dass die Token-Cookie-Namen übereinstimmen: `next-auth.session-token` oder `__Secure-next-auth.session-token` .

### Speichernutzung steigt

1. Der Sitzungscache begrenzt sich selbst auf 1.000 Einträge mit probabilistischer Bereinigung.
2. Bereinigung erzwingen: `sessionCache.clear()` .
3. Mit `getSessionCacheStats().size` überwachen.

## Verwandte Dokumentation

- [Deep Dive zum Sitzungsmanagement](./session-management-deep-dive.md)
- [API-Client-Architektur](./api-client-architecture.md)
- [Datenbankoptimierung](./database-optimization.md)
