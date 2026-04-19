---
id: category-queries-deep-dive
title: استعلامات فهرس الفئة والموقع، نظرة عميقة
sidebar_label: استعلامات الفئة الغوص العميق
sidebar_position: 66
---

# استعلامات فهرس الفئة والموقع، نظرة عميقة

مرجع شامل لجميع وظائف الاستعلام عن فهرس الموقع وتدقيق العناصر، بما في ذلك عمليات البحث الجغرافية المكانية واستعلامات المربع المحيط وفهرسة الدُفعات وتسجيل التدقيق وتتبع محفوظات العناصر.

## نظرة عامة

تدير طبقة استعلام الفئة/الموقع نظامين للفهرسة مرتبطين:

- **`location-index.queries.ts`** - فهرس جغرافي مكاني لاستعلامات العناصر السريعة المستندة إلى الموقع (المدينة، البلد، المربع المحيط، العناصر البعيدة)، مع إرسال الدُفعات وتتبع البيانات التعريفية
- **`item-audit.queries.ts`** - مسار تدقيق العنصر لتتبع جميع التغييرات وانتقالات الحالة وإجراءات المسؤول على العناصر

يعمل جدول فهرس الموقع بمثابة **فهرس ثانوي** للاستعلامات الجغرافية السريعة. يبقى مصدر الحقيقة لبيانات موقع العنصر في ملفات YAML في نظام إدارة المحتوى المستند إلى Git.

## ملفات المصدر

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

يقوم الدُفعة برفع إدخالات الموقع المتعددة في أجزاء مكونة من 100 لتجنب حدود حجم الاستعلام.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|نعم|مجموعة من بيانات الموقع|

**المرتجعات:** `number` - عدد الإدخالات التي تمت معالجتها

**نمط SQL:** يستخدم بناء الجملة `excluded.*` للإرسال المجمع:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

** ملاحظات الأداء: **
- تتم العمليات على دفعات مكونة من 100 عملية لتظل ضمن حدود حجم استعلام PostgreSQL
- يستخدم مراجع `excluded.*` لحل التعارضات المجمعة بكفاءة
- يضبط `indexedAt` على الطابع الزمني الحالي لكل إدخال

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

إزالة عناصر متعددة من فهرس الموقع.

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

### قراءة العمليات

#### `getLocationBySlug`

يحصل على إدخال الموقع عن طريق سبيكة العنصر.

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

الاستعلام عن العناصر داخل مربع محيط جغرافي. مفيد لتصفية نصف القطر الأولية قبل حساب المسافة بدقة.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**المعلمات:**

|المعلمة|اكتب|مطلوب|الوصف|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|لا|الحد الأدنى لخط العرض|
|`maxLat`|`number`|لا|أقصى خط العرض|
|`minLng`|`number`|لا|الحد الأدنى لخط الطول|
|`maxLng`|`number`|لا|الحد الأقصى لخط الطول|
|`limit`|`number`|لا|النتائج القصوى|
|`offset`|`number`|لا|إزاحة الصفحات|

** نمط SQL: **

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

الاستعلام عن العناصر حسب اسم البلد باستخدام العمود المفهرس.

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

يحصل على كافة الارتباطات الثابتة للعناصر المفهرسة.

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

يحصل على إدخالات الموقع عن بعد فقط مع الحد الأدنى من الحقول (سبيكة، المدينة، البلد). الأمثل لاستعلامات نصف القطر.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### استعلامات القيمة المميزة

#### `getDistinctCities`

الحصول على جميع أسماء المدن المميزة، وإلغاء تكرارها من خلال النموذج العادي.

```typescript
async function getDistinctCities(): Promise<string[]>
```

** نمط SQL: **

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**ملاحظة التصميم:** يتم التجميع حسب الأعمدة التي تمت تسويتها ولكنها تُرجع `MIN()` للأصل (الذي يفضل النماذج الكبيرة)، مما يوفر قيم عرض نظيفة.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### الإحصائيات والبيانات الوصفية

#### `getLocationIndexStats`

يحصل على إحصائيات حول فهرس الموقع.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**المرتجعات:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

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

يحصل على البيانات التعريفية لفهرس الموقع (آخر وقت لإعادة البناء، والمدة، وعدد العناصر).

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

الحصول على سجل التدقيق المرقّم لعنصر مع تصفية نوع الإجراء الاختياري.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

** نمط SQL: **

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

الحصول على سجلات التدقيق التي تمت تصفيتها حسب نوع الإجراء.

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

الحصول على إحصائيات سجل التدقيق لعنصر ما، مجمعة حسب نوع الإجراء.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

** نمط SQL: **

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
