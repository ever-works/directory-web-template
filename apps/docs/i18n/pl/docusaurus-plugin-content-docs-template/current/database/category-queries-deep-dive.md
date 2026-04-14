---
id: category-queries-deep-dive
title: Zapytania dotyczące indeksu kategorii i lokalizacji Deep Dive
sidebar_label: Kategoria Zapytania Głębokie nurkowanie
sidebar_position: 66
---

# Zapytania dotyczące indeksu kategorii i lokalizacji Deep Dive

Wszechstronne odniesienia do wszystkich funkcji zapytań dotyczących indeksów lokalizacji i audytów elementów, w tym wyszukiwań geoprzestrzennych, zapytań o ramki ograniczające, indeksowanie wsadowe, rejestrowanie audytów i śledzenie historii elementów.

## Przegląd

Warstwa zapytań o kategorię/lokalizację zarządza dwoma powiązanymi systemami indeksowania:

- **`location-index.queries.ts`** — Indeks geoprzestrzenny do szybkich zapytań o elementy w oparciu o lokalizację (miasto, kraj, ramka ograniczająca, elementy odległe), z możliwością wstawiania zbiorczego i śledzeniem metadanych
- **`item-audit.queries.ts`** — Ścieżka audytu przedmiotu umożliwiająca śledzenie wszystkich zmian, zmian statusu i działań administracyjnych dotyczących elementów

Tabela indeksów lokalizacji służy jako **indeks dodatkowy** dla szybkich zapytań geograficznych. Źródłem prawdy o danych o lokalizacji przedmiotu pozostają pliki YAML w systemie CMS opartym na Git.

## Pliki źródłowe

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

Wsadowo wstawia wiele wpisów lokalizacji w porcjach po 100, aby uniknąć ograniczeń rozmiaru zapytania.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|Tak|Tablica danych lokalizacyjnych|

**Zwroty:** `number` -- Liczba przetworzonych wpisów

**Wzorzec SQL:** Używa składni `excluded.*` do zbiorczego upserowania:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**Uwagi dotyczące wydajności:**
- Przetwarza w partiach po 100, aby nie przekraczać limitów rozmiaru zapytania PostgreSQL
- Wykorzystuje odniesienia `excluded.*` do skutecznego masowego rozwiązywania konfliktów
- Ustawia `indexedAt` na bieżący znacznik czasu dla każdego wpisu

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

Usuwa wiele elementów z indeksu lokalizacji.

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

### Przeczytaj Operacje

#### `getLocationBySlug`

Pobiera wpis lokalizacji według ślimaka przedmiotu.

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

Wysyła zapytania do elementów znajdujących się w geograficznej ramce ograniczającej. Przydatne do wstępnego filtrowania promienia przed dokładnym obliczeniem odległości.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|Nie|Minimalna szerokość geograficzna|
|`maxLat`|`number`|Nie|Maksymalna szerokość geograficzna|
|`minLng`|`number`|Nie|Minimalna długość geograficzna|
|`maxLng`|`number`|Nie|Maksymalna długość geograficzna|
|`limit`|`number`|Nie|Maksymalne wyniki|
|`offset`|`number`|Nie|Przesunięcie paginacji|

**Wzorzec SQL:**

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

Wysyła zapytania o elementy według nazwy kraju, używając indeksowanej znormalizowanej kolumny.

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

Pobiera wszystkie indeksowane ślimaki elementów.

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

Pobiera wpisy lokalizacji tylko zdalnych z minimalnymi polami (ślimak, miasto, kraj). Zoptymalizowany pod kątem zapytań o promieniu.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### Zapytania o różne wartości

#### `getDistinctCities`

Pobiera wszystkie odrębne nazwy miast, deduplikowane w formie znormalizowanej.

```typescript
async function getDistinctCities(): Promise<string[]>
```

**Wzorzec SQL:**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**Uwaga projektowa:** Grupuje według znormalizowanych kolumn, ale zwraca `MIN()` oryginału (co faworyzuje formy pisane wielkimi literami), zapewniając czyste wartości wyświetlane.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### Statystyki i metadane

#### `getLocationIndexStats`

Pobiera statystyki dotyczące indeksu lokalizacji.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**Zwroty:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

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

Pobiera metadane indeksu lokalizacji (czas ostatniej przebudowy, czas trwania, liczba elementów).

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

Pobiera podzieloną na strony historię audytu elementu z opcjonalnym filtrowaniem typu akcji.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**Wzorzec SQL:**

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

Pobiera dzienniki inspekcji filtrowane według typu akcji.

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

Pobiera statystyki dziennika inspekcji dla elementu pogrupowane według typu akcji.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**Wzorzec SQL:**

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
