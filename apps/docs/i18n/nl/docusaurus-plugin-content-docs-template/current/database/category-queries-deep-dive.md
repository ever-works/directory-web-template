---
id: category-queries-deep-dive
title: Categorie- en locatie-indexquery's Deep Dive
sidebar_label: Categoriequery's Deep Dive
sidebar_position: 66
---

# Categorie- en locatie-indexquery's Deep Dive

Uitgebreide referentie voor alle functies voor locatie-index en itemauditquery's, inclusief georuimtelijke zoekopdrachten, begrenzingsvakquery's, batchindexering, auditlogboekregistratie en het bijhouden van itemgeschiedenis.

## Overzicht

De categorie-/locatiequerylaag beheert twee gerelateerde indexeringssystemen:

- **`location-index.queries.ts`** -- Georuimtelijke index voor snelle locatiegebaseerde itemquery's (stad, land, selectiekader, externe items), met batch-upsert en metadata-tracking
- **`item-audit.queries.ts`** -- Item-audittraject voor het volgen van alle wijzigingen, statusovergangen en beheerdersacties op items

De locatie-indextabel dient als **secundaire index** voor snelle geo-query's. De bron van waarheid voor itemlocatiegegevens blijft in YAML-bestanden in het op Git gebaseerde CMS.

## Bronbestanden

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

Batch voegt meerdere locatie-items toe in blokken van 100 om limieten voor de querygrootte te voorkomen.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|Ja|Array van locatiegegevens|

**Retouren:** `number` -- Aantal verwerkte inzendingen

**SQL-patroon:** Gebruikt de syntaxis `excluded.*` voor bulk-upsert:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**Prestatieopmerkingen:**
- Verwerkt in batches van 100 om binnen de limieten voor de PostgreSQL-querygrootte te blijven
- Gebruikt `excluded.*` referenties voor efficiënte oplossing van bulkconflicten
- Stelt `indexedAt` in op de huidige tijdstempel voor elk item

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

Verwijdert meerdere items uit de locatie-index.

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

### Lees Operaties

#### `getLocationBySlug`

Krijgt een locatie-invoer per item-slug.

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

Query's uitvoeren op items binnen een geografisch selectiekader. Handig voor initiële straalfiltering vóór nauwkeurige afstandsberekening.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|Nee|Minimale breedtegraad|
|`maxLat`|`number`|Nee|Maximale breedtegraad|
|`minLng`|`number`|Nee|Minimale lengtegraad|
|`maxLng`|`number`|Nee|Maximale lengtegraad|
|`limit`|`number`|Nee|Maximale resultaten|
|`offset`|`number`|Nee|Paginering offset|

**SQL-patroon:**

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

Zoekt items op op landnaam met behulp van de geïndexeerde, genormaliseerde kolom.

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

Haalt alle geïndexeerde item-slugs op.

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

Krijgt alleen locatie-invoer op afstand met minimale velden (slak, stad, land). Geoptimaliseerd voor radiusquery's.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### Specifieke waardequery's

#### `getDistinctCities`

Haalt alle verschillende stadsnamen op, ontdubbeld in een genormaliseerde vorm.

```typescript
async function getDistinctCities(): Promise<string[]>
```

**SQL-patroon:**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**Ontwerpopmerking:** Groepeert op genormaliseerde kolom, maar retourneert de `MIN()` van het origineel (waarbij de voorkeur wordt gegeven aan vormen met hoofdletters), wat duidelijke weergavewaarden oplevert.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### Statistieken en metadata

#### `getLocationIndexStats`

Krijgt statistieken over de locatie-index.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**Retourzendingen:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

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

Haalt de metagegevens van de locatie-index op (laatste herbouwtijd, duur, aantal items).

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

Haalt gepagineerde auditgeschiedenis op voor een item met optionele filtering van actietypen.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**SQL-patroon:**

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

Haalt auditlogboeken op, gefilterd op actietype.

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

Haalt auditlogboekstatistieken op voor een item, gegroepeerd op actietype.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**SQL-patroon:**

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
