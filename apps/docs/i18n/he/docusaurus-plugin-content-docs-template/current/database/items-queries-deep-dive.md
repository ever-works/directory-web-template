---
id: items-queries-deep-dive
title: שאילתות פריט Deep Dive
sidebar_label: שאילתות פריט Deep Dive
sidebar_position: 60
---

# שאילתות פריט Deep Dive

התייחסות מקיפה לכל פונקציות שאילתת מסד הנתונים הקשורות לפריט, כולל זיהוי פריט, נורמליזציה של תקלות, מעקב אחר צפיות וצבירת צפייה.

## סקירה כללית

שכבת שאילתת הפריט מחולקת לשני מודולים:

- **`item.queries.ts`** -- כלי עזר לזיהוי פריט ונורמליזציה של שבלולים
- **`item-view.queries.ts`** -- מעקב אחר תצוגת פריט עם מניעת כפילויות וצבירה יומית

פריטים בתבנית Ever Works מאוחסנים כקבצי YAML במאגר CMS מבוסס Git. מסד הנתונים מאחסן **נתוני מעורבות** (הצבעות, הערות, צפיות, מועדפים) המבוססים על שבלולים של פריט, לא על ידי תוכן הפריט עצמו.

## קבצי מקור

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

ממפה שבלול פריט ל-itemId עבור פעולות מסד נתונים. במערכת זו, itemId הוא הקליע המנורמל.

```typescript
function getItemIdFromSlug(slug: string): string
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-----------|----------|----------|-------------|
|`slug`|`string`|כן|שבלול פריט|

**מחזירות:** `string` -- שבלול מנורמל בתור מזהה הפריט

**דפוס SQL:** אין שאילתת מסד נתונים -- נציגים אל `normalizeItemSlug`.

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

## הפניה לפונקציה: item-view.queries.ts

### `recordItemView`

מקליט תצוגת פריט עם מניעת כפילויות יומית. משתמש ב-`ON CONFLICT DO NOTHING` כדי להתעלם בשקט מתצוגות כפולות עבור אותו פריט, מציג ותאריך UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|כן|שבלול פריט|
|`view.viewerId`|`string`|כן|מזהה צופה (משתמש/אנונימי)|
|`view.viewedDateUtc`|`string`|כן|מחרוזת תאריך UTC (YYYY-MM-DD)|

**מחזירה:** `Promise<boolean>` -- `true` אם הוקלטה תצוגה חדשה, `false` אם זו הייתה כפילויות

**דפוס SQL:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**הערות ביצועים:**
- משתמש ב-`ON CONFLICT DO NOTHING` עבור תוספות אידמפוטנטיות
- אילוץ ייחודי על `(itemId, viewerId, viewedDateUtc)` מבטיח מניעת כפילות יומית
- אין צורך בנסיעה הלוך ושוב כדי לבדוק כפילויות

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

מקבל ספירת צפיות עבור פריטים ב-N הימים האחרונים.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|ברירת מחדל|תיאור|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|כן| --      |מערך של שבלולים|
|`days`|`number`|לא| `7`     |מספר הימים למבט לאחור|

**החזרות:** `Promise<number>` -- ספירת צפיות לתקופה

**דפוס SQL:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**הערות ביצועים:**
- משתמש במחרוזות תאריך UTC עבור סינון בלתי תלוי באזור זמן
- יעיל כאשר העמודה `viewedDateUtc` מתווספת לאינדקס

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

מקבל ספירת צפיות לכל פריט להצגת פריטים מובילים.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|כן|מערך של שבלולים|

**החזרות:** `Promise<Map<string, number>>` -- מפה של שבלול פריט לספירת צפייה

**דפוס SQL:**

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

## הערות ביצועים

1. **שומר מערך ריק** -- כל פונקציות הצבירה חוזרות מיד עם תוצאות אפס/ריקות כשהן עוברות מערך `itemSlugs` ריק, תוך הימנעות משאילתות מסד נתונים מיותרות.

2. **מניעת כפילויות יומית** -- `recordItemView` משתמש באילוץ ייחודי וב-`ON CONFLICT DO NOTHING` לביטול כפילויות יעיל וללא נעילה ללא בדיקה מוקדמת.

3. **תאריכים מבוססי UTC** -- סינון תאריכים תצוגה משתמש במחרוזות תאריך UTC (`YYYY-MM-DD`), ומבטיח התנהגות עקבית בכל אזורי זמן של השרת.

4. **נורמליזציה של שבלולים** -- `getItemIdFromSlug` נקראת בכל שכבת המעורבות (הצבעות, הערות) כדי להבטיח זיהוי עקבי של פריט.

## דוגמאות לשימוש

### הקלטת תצוגת עמוד

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

### בניית תרשים תצוגות של לוח המחוונים

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
