---
id: category-queries-deep-dive
title: Aprofundamento das consultas de índice de categoria e localização
sidebar_label: Aprofundamento das consultas de categoria
sidebar_position: 66
---

# Aprofundamento das consultas de índice de categoria e localização

Referência abrangente para todas as funções de índice de localização e consulta de auditoria de item, incluindo pesquisas geoespaciais, consultas de caixa delimitadora, indexação de lote, registro de auditoria e rastreamento de histórico de item.

## Visão geral

A camada de consulta de categoria/localização gerencia dois sistemas de indexação relacionados:

- **`location-index.queries.ts`** -- Índice geoespacial para consultas rápidas de itens com base em localização (cidade, país, caixa delimitadora, itens remotos), com upsert em lote e rastreamento de metadados
- **`item-audit.queries.ts`** -- Trilha de auditoria de itens para rastrear todas as alterações, transições de status e ações administrativas em itens

A tabela de índice de localização serve como um **índice secundário** para consultas geográficas rápidas. A fonte da verdade para os dados de localização do item permanece nos arquivos YAML no CMS baseado em Git.

## Arquivos de origem

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

O lote atualiza várias entradas de localização em blocos de 100 para evitar limites de tamanho de consulta.

```typescript
async function batchUpsertLocationIndex(
  entries: UpsertLocationIndexParams[]
): Promise<number>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-----------|--------------------------------|----------|------------------------|
|`entries`|`UpsertLocationIndexParams[]`|Sim|Matriz de dados de localização|

**Retornos:** `number` -- Contagem de entradas processadas

**Padrão SQL:** Usa a sintaxe `excluded.*` para upsert em massa:

```sql
INSERT INTO item_location_index (...)
VALUES (...), (...), (...)
ON CONFLICT (item_slug) DO UPDATE SET
  latitude = excluded.latitude,
  longitude = excluded.longitude, ...;
```

**Notas de desempenho:**
- Processa em lotes de 100 para permanecer dentro dos limites de tamanho de consulta do PostgreSQL
- Usa referências `excluded.*` para resolução eficiente de conflitos em massa
- Define `indexedAt` para o carimbo de data/hora atual de cada entrada

---

#### `removeFromLocationIndex`

Removes a single item from the location index.

```typescript
async function removeFromLocationIndex(itemSlug: string): Promise<boolean>
```

---

#### `batchRemoveFromLocationIndex`

Remove vários itens do índice de localização.

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

### Ler operações

#### `getLocationBySlug`

Obtém uma entrada de localização por slug de item.

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

Consulta itens dentro de uma caixa delimitadora geográfica. Útil para filtragem de raio inicial antes do cálculo preciso da distância.

```typescript
async function queryByBoundingBox(
  params: LocationQueryParams
): Promise<ItemLocationIndex[]>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|--------------|----------|----------|----------------------------|
|`minLat`|`number`|Não|Latitude mínima|
|`maxLat`|`number`|Não|Latitude máxima|
|`minLng`|`number`|Não|Longitude mínima|
|`maxLng`|`number`|Não|Longitude máxima|
|`limit`|`number`|Não|Resultados máximos|
|`offset`|`number`|Não|Deslocamento de paginação|

**Padrão SQL:**

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

Consulta itens por nome de país usando a coluna indexada normalizada.

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

Obtém todos os slugs de itens indexados.

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

Obtém entradas de localização apenas remotas com campos mínimos (slug, cidade, país). Otimizado para consultas de raio.

```typescript
async function getRemoteLocationEntries(): Promise<RemoteLocationEntry[]>
```

### Consultas de valores distintos

#### `getDistinctCities`

Obtém todos os nomes de cidades distintos, desduplicados pelo formato normalizado.

```typescript
async function getDistinctCities(): Promise<string[]>
```

**Padrão SQL:**

```sql
SELECT MIN(city) FROM item_location_index
WHERE city_normalized IS NOT NULL
GROUP BY city_normalized
ORDER BY MIN(city);
```

**Nota de design:** Agrupa por coluna normalizada, mas retorna o `MIN()` do original (que favorece formas maiúsculas), fornecendo valores de exibição limpos.

---

#### `getDistinctCountries`

Gets all distinct country names, deduplicated by normalized form.

```typescript
async function getDistinctCountries(): Promise<string[]>
```

---

### Estatísticas e Metadados

#### `getLocationIndexStats`

Obtém estatísticas sobre o índice de localização.

```typescript
async function getLocationIndexStats(): Promise<LocationIndexStats>
```

**Retornos:** `{ totalIndexed, lastIndexedAt, citiesCount, countriesCount, remoteCount }`

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

Obtém os metadados do índice de localização (hora da última reconstrução, duração, contagem de itens).

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

Obtém o histórico de auditoria paginado para um item com filtragem de tipo de ação opcional.

```typescript
async function getItemHistory(params: {
  itemId: string;
  page?: number;
  limit?: number;
  actionFilter?: ItemAuditActionValues[];
}): Promise<PaginatedItemHistory>
```

**Padrão SQL:**

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

Obtém logs de auditoria filtrados por tipo de ação.

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

Obtém estatísticas de log de auditoria para um item, agrupadas por tipo de ação.

```typescript
async function getItemAuditStats(
  itemId: string
): Promise<Record<string, number>>
```

**Padrão SQL:**

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
