---
id: items-queries-deep-dive
title: Item Queries Deep Dive
sidebar_label: Item Queries Deep Dive
sidebar_position: 60
---

# Item Queries Deep Dive

Comprehensive reference for all item-related database query functions, including item identification, slug normalization, view tracking, and view aggregation.

## Overview

The item query layer is split across two modules:

- **`item.queries.ts`** -- Item identification and slug normalization utilities
- **`item-view.queries.ts`** -- Item view tracking with daily deduplication and aggregation

Items in the Ever Works template are stored as YAML files in a Git-based CMS repository. The database stores **engagement data** (votes, comments, views, favorites) keyed by item slugs, not the item content itself.

## Source Files

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

Maps an item slug to an itemId for database operations. In this system, the itemId IS the normalized slug.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parameters:**

| Parameter | Type     | Required | Description |
|-----------|----------|----------|-------------|
| `slug`    | `string` | Yes      | Item slug   |

**Returns:** `string` -- Normalized slug as the itemId

**SQL Pattern:** No database query -- delegates to `normalizeItemSlug`.

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

## Function Reference: item-view.queries.ts

### `recordItemView`

Records an item view with daily deduplication. Uses `ON CONFLICT DO NOTHING` to silently ignore duplicate views for the same item, viewer, and UTC date.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parameters:**

| Parameter           | Type     | Required | Description                        |
|---------------------|----------|----------|------------------------------------|
| `view.itemId`       | `string` | Yes      | Item slug                          |
| `view.viewerId`     | `string` | Yes      | Viewer identifier (user/anonymous) |
| `view.viewedDateUtc`| `string` | Yes      | UTC date string (YYYY-MM-DD)       |

**Returns:** `Promise<boolean>` -- `true` if a new view was recorded, `false` if it was a duplicate

**SQL Pattern:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Performance Notes:**
- Uses `ON CONFLICT DO NOTHING` for idempotent inserts
- Unique constraint on `(itemId, viewerId, viewedDateUtc)` ensures daily deduplication
- No round-trip needed to check for duplicates

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

Gets view count for items in the last N days.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description              |
|-------------|------------|----------|---------|--------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs      |
| `days`      | `number`   | No       | `7`     | Number of days to look back |

**Returns:** `Promise<number>` -- View count for the period

**SQL Pattern:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Performance Notes:**
- Uses UTC date strings for timezone-independent filtering
- Efficient when `viewedDateUtc` column is indexed

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

Gets view counts per item for top items display.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parameters:**

| Parameter   | Type       | Required | Description          |
|-------------|------------|----------|----------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs  |

**Returns:** `Promise<Map<string, number>>` -- Map of item slug to view count

**SQL Pattern:**

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

## Performance Notes

1. **Empty array guard** -- All aggregation functions return immediately with zero/empty results when passed an empty `itemSlugs` array, avoiding unnecessary database queries.

2. **Daily deduplication** -- `recordItemView` uses a unique constraint and `ON CONFLICT DO NOTHING` for efficient, lock-free deduplication without pre-checking.

3. **UTC-based dates** -- View date filtering uses UTC date strings (`YYYY-MM-DD`), ensuring consistent behavior across server timezones.

4. **Slug normalization** -- `getItemIdFromSlug` is called throughout the engagement layer (votes, comments) to ensure consistent item identification.

## Usage Examples

### Recording a page view

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

### Building a dashboard views chart

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
