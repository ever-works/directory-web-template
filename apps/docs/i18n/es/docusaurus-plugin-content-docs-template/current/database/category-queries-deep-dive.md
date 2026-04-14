---
id: category-queries-deep-dive
title: Consultas de índice de categoría y ubicación Análisis profundo
sidebar_label: Consultas de categorías Análisis profundo
sidebar_position: 66
---

# Consultas de índice de categoría y ubicación Análisis profundo

Referencia completa para todas las funciones de consulta de auditoría de artículos e índice de ubicación, incluidas búsquedas geoespaciales, consultas de cuadros delimitadores, indexación por lotes, registro de auditoría y seguimiento del historial de artículos.

## Descripción general

La capa de consulta de categoría/ubicación gestiona dos sistemas de indexación relacionados:

- **`location-index.queries.ts`** -- Índice geoespacial para consultas rápidas de elementos basadas en la ubicación (ciudad, país, cuadro delimitador, elementos remotos), con inserción por lotes y seguimiento de metadatos
- **`item-audit.queries.ts`** -- Registro de auditoría de elementos para rastrear todos los cambios, transiciones de estado y acciones administrativas en los elementos

La tabla de índice de ubicación sirve como **índice secundario** para consultas geográficas rápidas. La fuente de verdad de los datos de ubicación de los elementos permanece en los archivos YAML en el CMS basado en Git.

## Archivos fuente

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

El lote inserta varias entradas de ubicación en fragmentos de 100 para evitar límites de tamaño de consulta.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|si|Conjunto de datos de ubicación|

**Devoluciones:** `number` -- Recuento de entradas procesadas

**Patrón SQL:** Utiliza la sintaxis `excluded.*` para la inserción masiva:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**Notas de rendimiento:**
- Procesa en lotes de 100 para mantenerse dentro de los límites de tamaño de consulta de PostgreSQL
- Utiliza referencias `excluded.*` para una resolución eficiente de conflictos masivos
- Establece `indexedAt` en la marca de tiempo actual para cada entrada

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

Elimina varios elementos del índice de ubicación.

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

### Leer operaciones

#### `getLocationBySlug`

Obtiene una entrada de ubicación por elemento.

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

Consulta elementos dentro de un cuadro delimitador geográfico. Útil para el filtrado de radio inicial antes del cálculo preciso de la distancia.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|No|Latitud mínima|
|`maxLat`|`number`|No|Latitud máxima|
|`minLng`|`number`|No|Longitud mínima|
|`maxLng`|`number`|No|Longitud máxima|
|`limit`|`number`|No|Resultados máximos|
|`offset`|`number`|No|Desplazamiento de paginación|

**Patrón SQL:**

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

Consulta elementos por nombre de país utilizando la columna normalizada indexada.

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

Obtiene todos los slugs de elementos indexados.

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

Obtiene entradas de ubicación solo remotas con campos mínimos (slug, ciudad, país). Optimizado para consultas de radio.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### Consultas de valores distintos

#### `getDistinctCities`

Obtiene todos los nombres de ciudades distintos, deduplicados mediante forma normalizada.

```typescript
async function getDistinctCities(): Promise<string[]>
```

**Patrón SQL:**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**Nota de diseño:** Agrupa por columna normalizada pero devuelve el `MIN()` del original (que favorece las formas en mayúscula), proporcionando valores de visualización limpios.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### Estadísticas y metadatos

#### `getLocationIndexStats`

Obtiene estadísticas sobre el índice de ubicación.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**Devoluciones:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

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

Obtiene los metadatos del índice de ubicación (hora de la última reconstrucción, duración, recuento de elementos).

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

Obtiene el historial de auditoría paginado para un elemento con filtrado de tipo de acción opcional.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**Patrón SQL:**

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

Obtiene registros de auditoría filtrados por tipo de acción.

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

Obtiene estadísticas del registro de auditoría para un elemento, agrupadas por tipo de acción.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**Patrón SQL:**

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
