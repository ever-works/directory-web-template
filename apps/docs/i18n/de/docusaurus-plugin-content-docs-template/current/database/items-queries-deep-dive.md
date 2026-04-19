---
id: items-queries-deep-dive
title: Artikelabfragen im Detail
sidebar_label: Artikelabfragen im Detail
sidebar_position: 60
---

# Artikelabfragen im Detail

Umfassende Referenz für alle artikelbezogenen Datenbankabfragefunktionen, einschließlich Artikelidentifizierung, Slug-Normalisierung, Ansichtsverfolgung und Ansichtsaggregation.

## Übersicht

Die Artikelabfrageebene ist auf zwei Module aufgeteilt:

- **`item.queries.ts`** – Dienstprogramme zur Artikelidentifizierung und Slug-Normalisierung
- **`item-view.queries.ts`** – Artikelansichtsverfolgung mit täglicher Deduplizierung und Aggregation

Elemente in der Ever Works-Vorlage werden als YAML-Dateien in einem Git-basierten CMS-Repository gespeichert. In der Datenbank werden **Engagementdaten** (Stimmen, Kommentare, Ansichten, Favoriten) gespeichert, die nach Artikel-Slugs geordnet sind, nicht der Artikelinhalt selbst.

## Quelldateien

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

Ordnet einen Artikel-Slug einer Artikel-ID für Datenbankoperationen zu. In diesem System ist die itemId der normalisierte Slug.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-----------|----------|----------|-------------|
|`slug`|`string`|Ja|Artikelschnecke|

**Rückgabe:** `string` – Normalisierter Slug als Artikel-ID

**SQL-Muster:** Keine Datenbankabfrage – delegiert an `normalizeItemSlug`.

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

## Funktionsreferenz: item-view.queries.ts

### `recordItemView`

Zeichnet eine Artikelansicht mit täglicher Deduplizierung auf. Verwendet `ON CONFLICT DO NOTHING`, um doppelte Ansichten für dasselbe Element, denselben Viewer und dasselbe UTC-Datum stillschweigend zu ignorieren.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|Ja|Artikelschnecke|
|`view.viewerId`|`string`|Ja|Zuschauerkennung (Benutzer/anonym)|
|`view.viewedDateUtc`|`string`|Ja|UTC-Datumszeichenfolge (JJJJ-MM-TT)|

**Zurückgegeben:** `Promise<boolean>` -- `true` wenn eine neue Ansicht aufgezeichnet wurde, `false` wenn es sich um ein Duplikat handelte

**SQL-Muster:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Leistungshinweise:**
- Verwendet `ON CONFLICT DO NOTHING` für idempotente Einfügungen
- Eine eindeutige Einschränkung auf `(itemId, viewerId, viewedDateUtc)` gewährleistet die tägliche Deduplizierung
- Es ist kein Hin- und Rücklauf erforderlich, um nach Duplikaten zu suchen

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

Ruft die Anzahl der Aufrufe für Elemente in den letzten N Tagen ab.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Standard|Beschreibung|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|Ja| --      |Array von Item-Slugs|
|`days`|`number`|Nein| `7`     |Anzahl der Tage, an denen man zurückblicken kann|

**Rückgaben:** `Promise<number>` – Anzahl der Aufrufe für den Zeitraum

**SQL-Muster:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Leistungshinweise:**
- Verwendet UTC-Datumszeichenfolgen für eine von der Zeitzone unabhängige Filterung
- Effizient, wenn die Spalte `viewedDateUtc` indiziert ist

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

Ruft die Anzahl der Aufrufe pro Element für die Anzeige der Top-Elemente ab.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Ja|Array von Item-Slugs|

**Returns:** `Promise<Map<string, number>>` – Karte des Elements, um die Anzahl anzuzeigen

**SQL-Muster:**

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

## Leistungshinweise

1. **Empty Array Guard** – Alle Aggregationsfunktionen kehren sofort mit null/leeren Ergebnissen zurück, wenn ein leeres `itemSlugs` Array übergeben wird, wodurch unnötige Datenbankabfragen vermieden werden.

2. **Tägliche Deduplizierung** – `recordItemView` verwendet eine eindeutige Einschränkung und `ON CONFLICT DO NOTHING` für eine effiziente, sperrenfreie Deduplizierung ohne Vorprüfung.

3. **UTC-basierte Daten** – Die Datumsfilterung der Ansicht verwendet UTC-Datumszeichenfolgen (`YYYY-MM-DD`), um ein konsistentes Verhalten über alle Serverzeitzonen hinweg sicherzustellen.

4. **Slug-Normalisierung** – `getItemIdFromSlug` wird in der gesamten Engagement-Ebene (Abstimmungen, Kommentare) aufgerufen, um eine konsistente Artikelidentifizierung sicherzustellen.

## Anwendungsbeispiele

### Aufzeichnen eines Seitenaufrufs

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

### Erstellen eines Dashboard-Ansichtsdiagramms

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
