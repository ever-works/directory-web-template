---
id: items-queries-deep-dive
title: استعلامات العنصر، الغوص العميق
sidebar_label: استعلامات العنصر، الغوص العميق
sidebar_position: 60
---

# استعلامات العنصر، الغوص العميق

مرجع شامل لجميع وظائف استعلام قاعدة البيانات المتعلقة بالعنصر، بما في ذلك تعريف العنصر، وتسوية الارتباط التقريبي، وتتبع العرض، وتجميع العرض.

## نظرة عامة

يتم تقسيم طبقة استعلام العنصر عبر وحدتين:

- **`item.queries.ts`** - أدوات مساعدة لتعريف العنصر وتسوية الارتفاع
- **`item-view.queries.ts`** - تتبع عرض العنصر مع إلغاء البيانات المكررة والتجميع اليومي

يتم تخزين العناصر الموجودة في قالب Ever Works كملفات YAML في مستودع CMS يستند إلى Git. تقوم قاعدة البيانات بتخزين **بيانات المشاركة** (الأصوات، التعليقات، المشاهدات، المفضلة) المرتبطة بالارتباطات الثابتة للعنصر، وليس محتوى العنصر نفسه.

## ملفات المصدر

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

يقوم بتعيين سبيكة عنصر إلى معرف عنصر لعمليات قاعدة البيانات. في هذا النظام، يعتبر itemId هو الارتداد القياسي الذي تمت تسويته.

```typescript
function getItemIdFromSlug(slug: string): string
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-----------|----------|----------|-------------|
|`slug`|`string`|نعم|سبيكة البند|

**المرتجعات:** `string` - سبيكة عادية تم تسويتها كمعرف العنصر

**نمط SQL:** لا يوجد استعلام في قاعدة البيانات - مفوضون إلى `normalizeItemSlug`.

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

## مرجع الوظيفة: item-view.queries.ts

### `recordItemView`

يسجل عرض العنصر مع إلغاء البيانات المكررة يوميًا. يستخدم `ON CONFLICT DO NOTHING` لتجاهل طرق العرض المكررة بصمت لنفس العنصر والعارض وتاريخ UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|نعم|سبيكة البند|
|`view.viewerId`|`string`|نعم|معرف العارض (مستخدم/مجهول)|
|`view.viewedDateUtc`|`string`|نعم|سلسلة التاريخ بالتوقيت العالمي (YYYY-MM-DD)|

**المرتجعات:** `Promise<boolean>` -- `true` إذا تم تسجيل عرض جديد، `false` إذا كان مكررًا

** نمط SQL: **

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

** ملاحظات الأداء: **
- يستخدم `ON CONFLICT DO NOTHING` للإدراجات غير الفعالة
- يضمن القيد الفريد على `(itemId, viewerId, viewedDateUtc)` إلغاء البيانات المكررة يوميًا
- ليست هناك حاجة لرحلة ذهابًا وإيابًا للتحقق من التكرارات

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

الحصول على عدد مرات المشاهدة للعناصر في آخر N من الأيام.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الافتراضي|الوصف|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|نعم| --      |مجموعة من البزاقات البند|
|`days`|`number`|لا| `7`     |عدد الأيام للنظر إلى الوراء|

**العوائد:** `Promise<number>` -- عدد المشاهدات لهذه الفترة

** نمط SQL: **

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

** ملاحظات الأداء: **
- يستخدم سلاسل تاريخ UTC للتصفية المستقلة عن المنطقة الزمنية
- فعال عند فهرسة العمود `viewedDateUtc`

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

يحصل على عدد مرات المشاهدة لكل عنصر لعرض أهم العناصر.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|نعم|مجموعة من البزاقات البند|

**المرتجعات:** `Promise<Map<string, number>>` - خريطة سبيكة العنصر لعرض العدد

** نمط SQL: **

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

## ملاحظات الأداء

1. **حارس المصفوفة الفارغة** - تعود جميع وظائف التجميع فورًا بنتائج صفر/فارغة عند تمرير مصفوفة `itemSlugs` فارغة، مع تجنب استعلامات قاعدة البيانات غير الضرورية.

2. **إلغاء البيانات المكررة يوميًا** -- يستخدم `recordItemView` قيدًا فريدًا و`ON CONFLICT DO NOTHING` لإلغاء البيانات المكررة بكفاءة وبدون قفل دون فحص مسبق.

3. **التواريخ المستندة إلى UTC** - تستخدم تصفية تاريخ العرض سلاسل تاريخ UTC (`YYYY-MM-DD`)، مما يضمن السلوك المتسق عبر المناطق الزمنية للخادم.

4. **تطبيع البزاقة** - يتم استدعاء `getItemIdFromSlug` خلال طبقة المشاركة (الأصوات والتعليقات) لضمان تحديد العنصر بشكل متسق.

## أمثلة الاستخدام

### تسجيل عرض الصفحة

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

### بناء مخطط مشاهدات لوحة المعلومات

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
