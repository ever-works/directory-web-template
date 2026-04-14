---
id: items-queries-deep-dive
title: Przedmiot pyta o głębokie nurkowanie
sidebar_label: Przedmiot pyta o głębokie nurkowanie
sidebar_position: 60
---

# Przedmiot pyta o głębokie nurkowanie

Wszechstronne odniesienia do wszystkich funkcji zapytań do bazy danych związanych z pozycjami, w tym identyfikacji pozycji, normalizacji ślimaków, śledzenia widoków i agregacji widoków.

## Przegląd

Warstwa zapytań o pozycje jest podzielona na dwa moduły:

- **`item.queries.ts`** — Narzędzia do identyfikacji przedmiotów i normalizacji ślimaków
- **`item-view.queries.ts`** — Śledzenie widoku przedmiotu z codzienną deduplikacją i agregacją

Elementy szablonu Ever Works są przechowywane jako pliki YAML w repozytorium CMS opartym na Git. Baza danych przechowuje **dane zaangażowania** (głosy, komentarze, wyświetlenia, ulubione) powiązane z informacjami o przedmiotach, a nie samą treść przedmiotu.

## Pliki źródłowe

```
lib/db/queries/item.queries.ts
lib/db/queries/item-view.queries.ts
```

---

## Function Reference: item.queries.ts

### `normalizeItemSlug`

Normalizes an item slug to ensure consistency across the system.

```typescript
function normalizeItemSlug(slug: string): string
```

**Parameters:**

| Parameter | Type     | Required | Description          |
|-----------|----------|----------|----------------------|
| `slug`    | `string` | Yes      | Raw slug input       |

**Returns:** `string` -- Normalized slug (lowercase, trimmed)

**Throws:**
- `Error` if slug is falsy, not a string, empty after trimming, or contains invalid characters

**Validation Rules:**
- Must be a non-empty string
- After normalization: lowercase and trimmed
- Must match regex `/^[a-zA-Z0-9_-]+$/` (alphanumeric, hyphens, underscores only)

**Usage Example:**

```typescript
import { normalizeItemSlug } from '@/lib/db/queries';

const slug = normalizeItemSlug('My-Cool-Tool');
// Returns: 'my-cool-tool'

normalizeItemSlug(''); // Throws Error
normalizeItemSlug('invalid slug!'); // Throws Error
```

---

### `getItemIdFromSlug`

Mapuje informację o produkcie na itemId na potrzeby operacji na bazie danych. W tym systemie itemId JEST znormalizowanym ślimakiem.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-----------|----------|----------|-------------|
|`slug`|`string`|Tak|Problem z przedmiotem|

**Zwroty:** `string` — Znormalizowany ślimak jako identyfikator przedmiotu

**Wzorzec SQL:** Brak zapytania do bazy danych — deleguje do `normalizeItemSlug`.

---

### `validateItemExists`

Validates if a slug exists in the content system. Currently a placeholder that validates slug format only.

```typescript
async function validateItemExists(slug: string): Promise<boolean>
```

**Parameters:**

| Parameter | Type     | Required | Description            |
|-----------|----------|----------|------------------------|
| `slug`    | `string` | Yes      | Item slug to validate  |

**Returns:** `Promise<boolean>` -- `true` if slug format is valid, `false` otherwise

**Note:** This function currently only validates format. It does not check against the actual Git-based content system.

---

## Odniesienie do funkcji: item-view.queries.ts

### `recordItemView`

Rejestruje widok elementu z codzienną deduplikacją. Używa `ON CONFLICT DO NOTHING` do cichego ignorowania zduplikowanych widoków dla tego samego elementu, przeglądarki i daty UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Tak|Problem z przedmiotem|
|`view.viewerId`|`string`|Tak|Identyfikator przeglądającego (użytkownik/anonimowy)|
|`view.viewedDateUtc`|`string`|Tak|Ciąg daty UTC (RRRR-MM-DD)|

**Zwraca:** `Promise<boolean>` -- `true` jeśli nagrano nowy widok, `false` jeśli był to duplikat

**Wzorzec SQL:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Uwagi dotyczące wydajności:**
- Używa `ON CONFLICT DO NOTHING` dla wstawek idempotentnych
- Unikalne ograniczenie `(itemId, viewerId, viewedDateUtc)` zapewnia codzienną deduplikację
- Nie ma potrzeby podróżowania w obie strony w celu sprawdzenia duplikatów

---

### `getTotalViewsCount`

Gets the total view count for a set of items.

```typescript
async function getTotalViewsCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<number>` -- Total view count across all specified items

**SQL Pattern:**

```sql
SELECT count(*) FROM item_views WHERE item_id IN (...);
```

**Edge Case:** Returns `0` if `itemSlugs` is empty (no DB query executed).

---

### `getRecentViewsCount`

Pobiera liczbę wyświetleń elementów w ciągu ostatnich N dni.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Domyślne|Opis|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Tak| --      |Tablica ślimaków przedmiotów|
|`days`|`number`|Nie| `7`     |Liczba dni, przez które należy spojrzeć wstecz|

**Zwroty:** `Promise<number>` — Liczba wyświetleń w danym okresie

**Wzorzec SQL:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Uwagi dotyczące wydajności:**
- Używa ciągów dat UTC do filtrowania niezależnego od strefy czasowej
- Efektywne, gdy kolumna `viewedDateUtc` jest indeksowana

---

### `getDailyViewsData`

Returns a Map of daily view counts keyed by date string (YYYY-MM-DD) for the last N days.

```typescript
async function getDailyViewsData(
  itemSlugs: string[],
  days: number = 7
): Promise<Map<string, number>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description              |
|-------------|------------|----------|---------|--------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs      |
| `days`      | `number`   | No       | `7`     | Number of days to look back |

**Returns:** `Promise<Map<string, number>>` -- Map of `YYYY-MM-DD` date string to view count

**SQL Pattern:**

```sql
SELECT viewed_date_utc, count(*)
FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?
GROUP BY viewed_date_utc;
```

---

### `getViewsPerItem`

Pobiera liczbę wyświetleń na element dla wyświetlanych najważniejszych elementów.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Tak|Tablica ślimaków przedmiotów|

**Zwroty:** `Promise<Map<string, number>>` — Mapa informacji o produkcie, aby wyświetlić liczbę

**Wzorzec SQL:**

```sql
SELECT item_id, count(*) FROM item_views
WHERE item_id IN (...)
GROUP BY item_id;
```

---

## Helper Functions (Internal)

### `getUtcDateString`

Internal helper that returns a UTC date string for N days ago. Uses UTC methods to avoid timezone-related off-by-one errors.

```typescript
function getUtcDateString(daysAgo: number = 0): string
// Returns: 'YYYY-MM-DD' format
```

---

## Uwagi dotyczące wydajności

1. **Ochrona pustej tablicy** -- Wszystkie funkcje agregujące zwracają natychmiast z zerowymi/pustymi wynikami po przekazaniu pustej tablicy `itemSlugs`, co pozwala uniknąć niepotrzebnych zapytań do bazy danych.

2. **Codzienna deduplikacja** -- `recordItemView` wykorzystuje unikalne ograniczenie, a `ON CONFLICT DO NOTHING` zapewnia wydajną deduplikację bez blokad bez wstępnego sprawdzania.

3. **Daty oparte na UTC** -- Filtrowanie dat wykorzystuje ciągi dat UTC (`YYYY-MM-DD`), zapewniając spójne zachowanie we wszystkich strefach czasowych serwera.

4. **Normalizacja ślimaka** -- `getItemIdFromSlug` jest wywoływana w całej warstwie zaangażowania (głosy, komentarze), aby zapewnić spójną identyfikację przedmiotu.

## Przykłady użycia

### Nagrywanie odsłony strony

```typescript
import { recordItemView } from '@/lib/db/queries';

const isNew = await recordItemView({
  itemId: 'clockify',
  viewerId: 'user-123',
  viewedDateUtc: '2025-06-15',
});

if (isNew) {
  console.log('New unique view recorded');
}
```

### Tworzenie wykresu wyświetleń dashboardu

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
