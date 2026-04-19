---
id: category-queries-deep-dive
title: Заявки за индекс на категория и местоположение Задълбочено гмуркане
sidebar_label: Заявки за категория Задълбочено гмуркане
sidebar_position: 66
---

# Заявки за индекс на категория и местоположение Задълбочено гмуркане

Изчерпателна справка за всички индекси на местоположение и функции за заявка за одит на артикул, включително геопространствени търсения, заявки за ограничителна кутия, пакетно индексиране, регистриране на одит и проследяване на историята на артикулите.

## Преглед

Слоят за заявка за категория/локация управлява две свързани системи за индексиране:

- **`location-index.queries.ts`** -- Гео-пространствен индекс за бързи заявки за елементи, базирани на местоположение (град, държава, ограничителна кутия, отдалечени елементи), с пакетно актуализиране и проследяване на метаданни
- **`item-audit.queries.ts`** -- Одитна пътека на артикул за проследяване на всички промени, преходи на състоянието и действия на администратора върху артикули

Таблицата с индекс на местоположението служи като **вторичен индекс** за бързи географски заявки. Източникът на истината за данните за местоположението на артикула остава в YAML файловете в базираната на Git CMS.

## Изходни файлове

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

Пакетът въвежда множество записи за местоположение на части от 100, за да се избегнат ограниченията за размера на заявката.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|да|Масив от данни за местоположение|

**Връща:** `number` -- Брой обработени записи

**SQL Pattern:** Използва `excluded.*` синтаксис за групово upsert:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**Бележки за ефективността:**
- Обработва на партиди от 100, за да остане в границите на размера на заявките на PostgreSQL
- Използва препратки `excluded.*` за ефективно масово разрешаване на конфликти
- Задава `indexedAt` на текущия времеви печат за всеки запис

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

Премахва множество елементи от индекса на местоположението.

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

### Прочетете операциите

#### `getLocationBySlug`

Получава запис за местоположение по елемент.

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

Заявки за елементи в рамките на географска ограничителна кутия. Полезно за първоначално филтриране по радиус преди точно изчисляване на разстоянието.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|не|Минимална географска ширина|
|`maxLat`|`number`|не|Максимална географска ширина|
|`minLng`|`number`|не|Минимална дължина|
|`maxLng`|`number`|не|Максимална дължина|
|`limit`|`number`|не|Максимални резултати|
|`offset`|`number`|не|Отместване на страниците|

**SQL модел:**

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

Търси елементи по име на държава, като използва индексираната нормализирана колона.

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

Получава всички индексирани елементи.

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

Получава записи за местоположение само за отдалечено местоположение с минимален брой полета (охлюв, град, държава). Оптимизиран за радиусни заявки.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### Заявки за различни стойности

#### `getDistinctCities`

Получава всички различни имена на градове, дедупликирани чрез нормализирана форма.

```typescript
async function getDistinctCities(): Promise<string[]>
```

**SQL модел:**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**Забележка за дизайна:** Групира по нормализирана колона, но връща `MIN()` на оригинала (което предпочита формите с главни букви), осигурявайки чисти стойности на показване.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### Статистика и метаданни

#### `getLocationIndexStats`

Получава статистически данни за индекса на местоположението.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**Връща:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

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

Получава метаданните за индекса на местоположението (време за последно възстановяване, продължителност, брой елементи).

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

Получава пагинирана хронология на одита за елемент с незадължително филтриране по тип действие.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**SQL модел:**

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

Получава журнали за проверка, филтрирани по тип действие.

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

Получава статистически данни за журнал за проверка за елемент, групирани по тип на действие.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**SQL модел:**

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
