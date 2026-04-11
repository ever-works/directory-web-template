---
id: caching-deep-dive
title: Głębokie nurkowanie w architekturze buforowania
sidebar_label: Architektura buforowania
sidebar_position: 1
---

# Głębokie nurkowanie w architekturze buforowania

W tym przewodniku opisano wielowarstwową architekturę buforowania używaną w całym szablonie, od pamięci podręcznej sesji w pamięci po strategie buforowania ISR i CDN na poziomie Next.js.

## Przegląd architektury

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

## Warstwa 1: Pamięć podręczna zawartości (Next.js `unstable_cache` )

Szablon wykorzystuje scentralizowaną konfigurację pamięci podręcznej zdefiniowaną w `lib/cache-config.ts` do zarządzania tagami TTL i pamięci podręcznej dla wszystkich danych treści.

### Konfiguracja TTL pamięci podręcznej

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Tagi pamięci podręcznej dla ukierunkowanego unieważniania

Tagi pamięci podręcznej umożliwiają szczegółowe unieważnianie bez opróżniania całej pamięci podręcznej:

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

### Używanie `unstable_cache` w funkcjach treści

Funkcje ładowania treści w systemie plików zawijanych `lib/content.ts` odczytuje za pomocą `unstable_cache` :

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

## Warstwa 2: Pamięć podręczna sesji (w pamięci)

Klasa `SessionCache` w `lib/auth/session-cache.ts` eliminuje zbędne narzuty związane z uwierzytelnianiem poprzez buforowanie zdekodowanych sesji w pamięci.

### Jak to działa

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

### Kluczowe decyzje projektowe

| Decyzja | Wartość | Uzasadnienie |
|---------|-------|----------|
| TTL | 10 minut | Równowaga pomiędzy świeżością a redukcją kosztów ogólnych |
| Maksymalny rozmiar | 1000 wpisów | Zapobiegaj wyciekom pamięci na długotrwałych serwerach |
| Haszowanie klucza | SHA-256 | Zapobiegaj wyciekom tokenów w zrzutach pamięci |
| Sprzątanie | 10% probabilistyczne | Amortyzacja kosztów czyszczenia w ramach żądań |
| Eksmisja | LRU (najstarszy-pierwszy) | Usuń ostatnio utworzone wpisy |

### Unieważnienie pamięci podręcznej

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Warstwa 3: Pamięć podręczna klienta API serwera `ServerClient` w `lib/api/server-api-client.ts` zawiera wbudowaną pamięć podręczną LRU dla żądań GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Zachowanie pamięci podręcznej:
- **Tylko żądania GET** są buforowane (mutacje omijają pamięć podręczną)
- **Żądania z AbortSignal** nigdy nie są buforowane
- **Eksmisja LRU** usuwa najstarszy wpis, gdy pamięć podręczna osiągnie 100 pozycji
- **Wygaśnięcie na podstawie TTL** unieważnia wpisy po 5 minutach

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Strategia unieważniania pamięci podręcznej

Moduł `lib/cache-invalidation.ts` zapewnia bezpieczne unieważnianie, które obsługuje ograniczenia fazy renderowania Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

Opakowanie `safeRevalidateTag` wykrywa błędy fazy renderowania i rejestruje ostrzeżenia zamiast powodować awarię:

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

## ISR (przyrostowa regeneracja statyczna)

Strony korzystają z ISR poprzez eksport `revalidate` lub TTL według funkcji:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Względy wydajności

1. **Współczynnik trafień pamięci podręcznej sesji**: Monitoruj przy użyciu `getSessionCacheStats()` . Zdrowy wskaźnik wynosi powyżej 80%.
2. **Pamięci podręcznej zawartości**: 10-minutowy TTL oznacza, że ​​aktualizacje zawartości pojawiają się po maksymalnie 10 minutach. Wymuś unieważnienie po synchronizacji w celu natychmiastowych aktualizacji.
3. **Wykorzystanie pamięci**: Limit pamięci podręcznej sesji wynosi 1000 wpisów (około 1-2 MB). Pamięć podręczna klienta serwera jest ograniczona do 100 wpisów.
4. **Zimny ​​start**: Pierwsze żądanie po wdrożeniu zawsze pomija wszystkie pamięci podręczne w pamięci.

### Monitorowanie wydajności pamięci podręcznej

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Informacje o konfiguracji

| Warstwa pamięci podręcznej | TTL | Maksymalny rozmiar | Eksmisja | Unieważnienie |
|------------|-----|----------|---------------|--------------|
| Zawartość (unstable_cache) | 600. | Nieograniczony | Oparte na tagach | `revalidateTag()` |
| Sesja (w pamięci) | 10 minut | 1000 | LRU + TTL | `invalidateSessionCache()` |
| Klient API serwera | 5 minut | 100 | LRU + TTL | `clearCache()` |
| strony ISR | 600. | Oparte na dysku | Oparte na czasie | `revalidatePath()` |

## Rozwiązywanie problemów

### Nieaktualne dane po aktualizacji zawartości

1. Sprawdź, czy po zakończeniu synchronizacji repozytorium wywoływana jest funkcja `invalidateContentCaches()` .
2. Sprawdź, czy znaczniki pamięci podręcznej są zgodne pomiędzy funkcją buforowaną i wywołaniem unieważniającym.
3. Aby natychmiastowo unieważnić, zadzwoń pod numer `clearFetchItemsCache()` i wyczyść pamięć podręczną zawartości w pamięci.

### Pamięć podręczna sesji pomija każde żądanie

1. Sprawdź, czy token sesji jest obecny w plikach cookie lub nagłówkach.
2. Sprawdź, czy `extractSessionToken` może analizować Twój format pliku cookie.
3. Upewnij się, że nazwy plików cookie tokenów są zgodne: `next-auth.session-token` lub `__Secure-next-auth.session-token` .

### Rośnie zużycie pamięci

1. Pamięć podręczna sesji ogranicza się do 1000 wpisów przy czyszczeniu probabilistycznym.
2. Wymuś czyszczenie: `sessionCache.clear()` .
3. Monitoruj za pomocą `getSessionCacheStats().size` .

## Powiązana dokumentacja

- [Dogłębne nurkowanie dotyczące zarządzania sesją](./session-management-deep-dive.md)
- [Architektura klienta API](./api-client-architecture.md)
- [Optymalizacja bazy danych](./database-optimization.md)
