---
id: category-queries-deep-dive
title: שאילתות אינדקס קטגוריות ומיקום Deep Dive
sidebar_label: שאילתות קטגוריה Deep Dive
sidebar_position: 66
---

# שאילתות אינדקס קטגוריות ומיקום Deep Dive

התייחסות מקיפה לכל פונקציות שאילתות הביקורת של אינדקס מיקום וביקורת פריטים, כולל חיפושים גיאוגרפיים-מרחביים, שאילתות תיבה תוחמת, הוספת אצווה לאינדקס, רישום ביקורת ומעקב אחר היסטוריית פריטים.

## סקירה כללית

שכבת שאילתת הקטגוריה/מיקום מנהלת שתי מערכות אינדקס קשורות:

- **`location-index.queries.ts`** -- אינדקס גיאוגרפי-מרחבי לשאילתות פריטים מהירות מבוססות מיקום (עיר, ארץ, תיבה תוחמת, פריטים מרוחקים), עם העלאת אצווה ומעקב אחר מטא נתונים
- **`item-audit.queries.ts`** -- מסלול ביקורת פריט למעקב אחר כל השינויים, מעברי הסטטוס ופעולות הניהול בפריטים

טבלת אינדקס המיקום משמשת כ**אינדקס משני** לשאילתות גיאוגרפיות מהירות. מקור האמת לנתוני מיקום פריט נשאר בקבצי YAML ב-CMS מבוסס Git.

## קבצי מקור

```
lib/db/queries/location-index.queries.ts
lib/db/queries/item-audit.queries.ts
```

---

## Function Reference: location-index.queries.ts

### Types

```typescript
interface UpsertLocationIndexParams {
  itemSlug: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  serviceArea?: string | null;
  isRemote?: boolean;
}

interface LocationQueryParams {
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  city?: string;
  country?: string;
  isRemote?: boolean;
  limit?: number;
  offset?: number;
}

interface LocationIndexStats {
  totalIndexed: number;
  lastIndexedAt: Date | null;
  lastRebuildAt?: Date | null;
  citiesCount: number;
  countriesCount: number;
  remoteCount: number;
}
```

### Write Operations

#### `upsertLocationIndex`

Creates or updates a location index entry. Uses `ON CONFLICT DO UPDATE` on `itemSlug` for idempotent upserts.

```typescript
async function upsertLocationIndex(
  params: UpsertLocationIndexParams
): Promise<ItemLocationIndex>
```

**SQL Pattern:**

```sql
INSERT INTO item_location_index (item_slug, latitude, longitude, ...)
VALUES (?, ?, ?, ...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = ?, longitude = ?, ...
RETURNING *;
```

**Normalization:** City and country values are stored in both original and normalized (lowercased, trimmed) forms. The normalized columns are indexed for fast case-insensitive queries.

---

#### `batchUpsertLocationIndex`

אצווה מעלה ערכי מיקום מרובים בנתחים של 100 כדי למנוע מגבלות על גודל השאילתה.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|כן|מערך נתוני מיקום|

**החזרות:** `number` -- ספירת הערכים שעובדו

**דפוס SQL:** משתמש בתחביר `excluded.*` עבור העלאה בכמות גדולה:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**הערות ביצועים:**
- מעבדים באצוות של 100 כדי להישאר בתוך מגבלות גודל השאילתה של PostgreSQL
- משתמש בהפניות `excluded.*` לפתרון יעיל של סכסוכים בתפזורת
- מגדיר את `indexedAt` לחותמת הזמן הנוכחית עבור כל ערך

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

מסיר פריטים מרובים מאינדקס המיקום.

```typescript
async function batchRemoveFromLocationIndex(
  itemSlugs: string[]
): Promise<number>
```

---

#### `clearLocationIndex`

Clears the entire location index. Used during full rebuilds.

```typescript
async function clearLocationIndex(): Promise<number>
```

**Returns:** Number of entries deleted.

---

### קרא פעולות

#### `getLocationBySlug`

מקבל הזנת מיקום לפי שבלול פריט.

```typescript
async function getLocationBySlug(
  itemSlug: string
): Promise<ItemLocationIndex | null>
```

---

#### `getLocationsBySlugs`

Gets location entries for multiple items.

```typescript
async function getLocationsBySlugs(
  itemSlugs: string[]
): Promise<ItemLocationIndex[]>
```

---

#### `queryByBoundingBox`

שאילתות פריטים בתוך תיבה תוחמת גיאוגרפית. שימושי לסינון רדיוס ראשוני לפני חישוב מרחק מדויק.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|לא|קו רוחב מינימלי|
|`maxLat`|`number`|לא|קו רוחב מקסימלי|
|`minLng`|`number`|לא|קו אורך מינימלי|
|`maxLng`|`number`|לא|קו אורך מקסימלי|
|`limit`|`number`|לא|מקסימום תוצאות|
|`offset`|`number`|לא|היסט עימוד|

**דפוס SQL:**

```sql
SELECT * FROM item_location_index
WHERE latitude >= ? AND latitude <= ?
  AND longitude >= ? AND longitude <= ?
LIMIT ? OFFSET ?;
```

---

#### `queryByCity`

Queries items by city name using the indexed normalized column.

```typescript
async function queryByCity(
  city: string,
  includeRemote: boolean = false
): Promise<string[]>
```

**Returns:** Array of item slugs matching the city

**SQL Pattern:**

```sql
SELECT item_slug FROM item_location_index
WHERE city_normalized = ?
  AND is_remote = false;
```

**Performance Notes:** Uses equality on the `city_normalized` indexed column (not `ILIKE`) for optimal query performance.

---

#### `queryByCountry`

שאילתות פריטים לפי שם מדינה באמצעות העמודה המנורמלת באינדקס.

```typescript
async function queryByCountry(
  country: string,
  includeRemote: boolean = false
): Promise<string[]>
```

---

#### `queryRemoteItems`

Queries all remote-only items.

```typescript
async function queryRemoteItems(): Promise<string[]>
```

---

#### `getAllIndexedSlugs`

מקבל את כל שבלול הפריטים שנוספו לאינדקס.

```typescript
async function getAllIndexedSlugs(): Promise<string[]>
```

---

#### `getAllLocationEntries`

Gets all location entries (for distance calculations on the application layer).

```typescript
async function getAllLocationEntries(): Promise<ItemLocationIndex[]>
```

---

#### `getRemoteLocationEntries`

מקבל ערכי מיקום מרחוק בלבד עם שדות מינימליים (שבלול, עיר, מדינה). מותאם לשאילתות רדיוס.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### שאילתות ערך ברורות

#### `getDistinctCities`

מקבל את כל שמות הערים הנבדלים, משוכפלים באמצעות צורה מנורמלת.

```typescript
async function getDistinctCities(): Promise<string[]>
```

**דפוס SQL:**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**הערת עיצוב:** מקבץ לפי עמודה מנורמלת אך מחזיר את `MIN()` של המקור (המעדיף טפסים בעלי רישיות), ומספק ערכי תצוגה נקיים.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### סטטיסטיקה ומטא נתונים

#### `getLocationIndexStats`

מקבל נתונים סטטיסטיים על אינדקס המיקום.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**החזרות:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

---

#### `updateLocationIndexMeta`

Updates the singleton metadata row after a rebuild. Uses upsert pattern.

```typescript
async function updateLocationIndexMeta(
  rebuildAt: Date,
  durationMs: number,
  itemCount: number
): Promise<void>
```

---

#### `getLocationIndexMeta`

מקבל את המטא נתונים של אינדקס המיקום (זמן בנייה מחדש אחרון, משך זמן, ספירת פריטים).

```typescript
async function getLocationIndexMeta(): Promise<LocationIndexMeta | null>
```

---

## Function Reference: item-audit.queries.ts

### Types

```typescript
type ItemAuditLogWithPerformer = ItemAuditLog & {
  performer: { id: string; email: string | null } | null;
};

interface CreateItemAuditLogParams {
  itemId: string;
  itemName: string;
  action: ItemAuditActionValues;
  previousStatus?: string | null;
  newStatus?: string | null;
  changes?: ItemAuditChanges | null;
  performedBy?: string | null;
  performedByName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface PaginatedItemHistory {
  logs: ItemAuditLogWithPerformer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `createItemAuditLog`

Creates a new item audit log entry.

```typescript
async function createItemAuditLog(
  data: CreateItemAuditLogParams
): Promise<ItemAuditLog>
```

---

### `getItemHistory`

מקבל היסטוריית ביקורת מעומדת עבור פריט עם סינון אופציונלי של סוג פעולה.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**דפוס SQL:**

```sql
SELECT item_audit_logs.*, users.id, users.email
FROM item_audit_logs
LEFT JOIN users ON item_audit_logs.performed_by = users.id
WHERE item_audit_logs.item_id = ?
  AND item_audit_logs.action IN (...)
ORDER BY item_audit_logs.created_at DESC
LIMIT ? OFFSET ?;
```

---

### `getLatestItemAuditLog`

Gets the most recent audit log for an item.

```typescript
async function getLatestItemAuditLog(
  itemId: string
): Promise<ItemAuditLog | null>
```

---

### `getAuditLogsByAction`

מקבל יומני ביקורת מסוננים לפי סוג פעולה.

```typescript
async function getAuditLogsByAction(
  action: ItemAuditActionValues,
  limit: number = 50
): Promise<ItemAuditLog[]>
```

---

### `getAuditLogsByPerformer`

Gets audit logs filtered by the user who performed the action.

```typescript
async function getAuditLogsByPerformer(
  performedBy: string,
  limit: number = 50
): Promise<ItemAuditLog[]>
```

---

### `getItemAuditStats`

מקבל סטטיסטיקות יומן ביקורת עבור פריט, מקובצים לפי סוג פעולה.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**דפוס SQL:**

```sql
SELECT action, count(*) FROM item_audit_logs
WHERE item_id = ?
GROUP BY action;
```

---

## Performance Notes

1. **Normalized columns** -- Location queries use pre-normalized `city_normalized` and `country_normalized` columns with equality operators instead of `ILIKE`, providing index-friendly lookups.

2. **Batch processing** -- `batchUpsertLocationIndex` processes in chunks of 100 to avoid PostgreSQL query size limits while maintaining throughput.

3. **Singleton metadata** -- `updateLocationIndexMeta` uses upsert on a fixed `'singleton'` ID, avoiding race conditions during concurrent rebuilds.

4. **`excluded.*` references** -- Batch upserts use PostgreSQL's `excluded` pseudo-table for conflict resolution, avoiding the need to construct separate update values.

5. **LEFT JOIN for performers** -- Audit log queries use `LEFT JOIN` on users to handle cases where the performing user may have been deleted.

## Usage Examples

### Rebuilding the location index

```typescript
import {
  clearLocationIndex,
  batchUpsertLocationIndex,
  updateLocationIndexMeta,
} from '@/lib/db/queries';

const startTime = Date.now();

await clearLocationIndex();

const entries = items.map(item => ({
  itemSlug: item.slug,
  latitude: item.location.lat,
  longitude: item.location.lng,
  city: item.location.city,
  country: item.location.country,
  isRemote: item.isRemote,
}));

const processed = await batchUpsertLocationIndex(entries);

await updateLocationIndexMeta(new Date(), Date.now() - startTime, processed);
```

### Querying items near a location

```typescript
import { queryByBoundingBox } from '@/lib/db/queries';

// Find items within a bounding box around New York
const items = await queryByBoundingBox({
  minLat: 40.5,
  maxLat: 41.0,
  minLng: -74.3,
  maxLng: -73.7,
  limit: 50,
});
```

### Logging an item status change

```typescript
import { createItemAuditLog } from '@/lib/db/queries';

await createItemAuditLog({
  itemId: 'clockify',
  itemName: 'Clockify',
  action: 'status_change',
  previousStatus: 'draft',
  newStatus: 'published',
  performedBy: adminUserId,
  performedByName: 'Admin User',
  notes: 'Approved after review',
});
```
