---
id: items-queries-deep-dive
title: Itemquery's Deep Dive
sidebar_label: Itemquery's Deep Dive
sidebar_position: 60
---

# Itemquery's Deep Dive

Uitgebreide referentie voor alle itemgerelateerde databasequeryfuncties, inclusief itemidentificatie, slug-normalisatie, weergavetracking en weergaveaggregatie.

## Overzicht

De itemquerylaag is verdeeld over twee modules:

- **`item.queries.ts`** -- Hulpprogramma's voor itemidentificatie en slug-normalisatie
- **`item-view.queries.ts`** -- Tracking van itemweergaven met dagelijkse deduplicatie en aggregatie

Items in de Ever Works-sjabloon worden opgeslagen als YAML-bestanden in een op Git gebaseerde CMS-repository. In de database worden **betrokkenheidsgegevens** (stemmen, opmerkingen, weergaven, favorieten) opgeslagen, gecodeerd op basis van item-slugs, niet de iteminhoud zelf.

## Bronbestanden

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

Wijst een item-slug toe aan een itemId voor databasebewerkingen. In dit systeem IS de itemId de genormaliseerde naaktslak.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-----------|----------|----------|-------------|
|`slug`|`string`|Ja|Artikel slak|

**Retourzendingen:** `string` -- Genormaliseerde slug als itemId

**SQL-patroon:** Geen databasequery - gedelegeerd aan `normalizeItemSlug`.

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

## Functiereferentie: item-view.queries.ts

### `recordItemView`

Registreert een itemweergave met dagelijkse ontdubbeling. Gebruikt `ON CONFLICT DO NOTHING` om dubbele weergaven voor hetzelfde item, dezelfde viewer en UTC-datum stilletjes te negeren.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Ja|Artikel slak|
|`view.viewerId`|`string`|Ja|Kijker-ID (gebruiker/anoniem)|
|`view.viewedDateUtc`|`string`|Ja|UTC-datumtekenreeks (JJJJ-MM-DD)|

**Retourneert:** `Promise<boolean>` -- `true` als er een nieuwe weergave is opgenomen, `false` als het een duplicaat was

**SQL-patroon:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Prestatieopmerkingen:**
- Gebruikt `ON CONFLICT DO NOTHING` voor idempotente inserts
- Unieke beperking op `(itemId, viewerId, viewedDateUtc)` zorgt voor dagelijkse deduplicatie
- Er is geen heen- en terugreis nodig om te controleren op duplicaten

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

Krijgt het aantal weergaven voor items in de afgelopen N dagen.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parameters:**

|Parameter|Typ|Vereist|Standaard|Beschrijving|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Ja| --      |Array van item-slakken|
|`days`|`number`|Nee| `7`     |Aantal dagen om terug te kijken|

**Retouren:** `Promise<number>` -- Bekijk het aantal voor de periode

**SQL-patroon:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Prestatieopmerkingen:**
- Maakt gebruik van UTC-datumtekenreeksen voor tijdzone-onafhankelijke filtering
- Efficiënt wanneer de kolom `viewedDateUtc` wordt geïndexeerd

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

Krijgt weergaveaantallen per item voor weergave van topitems.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Ja|Array van item-slakken|

**Retourzendingen:** `Promise<Map<string, number>>` -- Kaart van item-slug om het aantal te bekijken

**SQL-patroon:**

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

## Prestatienotities

1. **Empty array guard** - Alle aggregatiefuncties retourneren onmiddellijk met nul/lege resultaten wanneer een lege `itemSlugs` array wordt doorgegeven, waardoor onnodige databasequery's worden vermeden.

2. **Dagelijkse ontdubbeling** -- `recordItemView` gebruikt een unieke beperking en `ON CONFLICT DO NOTHING` voor efficiënte, vergrendelingsvrije ontdubbeling zonder voorafgaande controle.

3. **UTC-gebaseerde datums** -- Bij het bekijken van datumfilters wordt gebruik gemaakt van UTC-datumtekenreeksen (`YYYY-MM-DD`), waardoor consistent gedrag in de tijdzones van de server wordt gegarandeerd.

4. **Slug-normalisatie** -- `getItemIdFromSlug` wordt aangeroepen in de betrokkenheidslaag (stemmen, opmerkingen) om consistente itemidentificatie te garanderen.

## Gebruiksvoorbeelden

### Een paginaweergave opnemen

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

### Een diagram met dashboardweergaven maken

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
