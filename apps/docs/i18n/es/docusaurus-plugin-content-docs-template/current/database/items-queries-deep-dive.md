---
id: items-queries-deep-dive
title: Consultas de artículos Análisis profundo
sidebar_label: Consultas de artículos Análisis profundo
sidebar_position: 60
---

# Consultas de artículos Análisis profundo

Referencia completa para todas las funciones de consulta de bases de datos relacionadas con elementos, incluida la identificación de elementos, la normalización de slugs, el seguimiento de vistas y la agregación de vistas.

## Descripción general

La capa de consulta de elementos se divide en dos módulos:

- **`item.queries.ts`** -- Utilidades de identificación de elementos y normalización de slugs
- **`item-view.queries.ts`** -- Seguimiento de vista de elementos con deduplicación y agregación diaria

Los elementos de la plantilla de Ever Works se almacenan como archivos YAML en un repositorio CMS basado en Git. La base de datos almacena **datos de participación** (votos, comentarios, vistas, favoritos) codificados por elementos, no el contenido del elemento en sí.

## Archivos fuente

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

Asigna un slug de elemento a un itemId para operaciones de base de datos. En este sistema, el itemId ES el slug normalizado.

```typescript
function getItemIdFromSlug(slug: string): string
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-----------|----------|----------|-------------|
|`slug`|`string`|si|babosa de artículo|

**Devoluciones:** `string` -- Slug normalizado como itemId

**Patrón SQL:** Sin consulta de base de datos: delega en `normalizeItemSlug`.

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

## Referencia de función: item-view.queries.ts

### `recordItemView`

Registra una vista de artículo con deduplicación diaria. Utiliza `ON CONFLICT DO NOTHING` para ignorar silenciosamente vistas duplicadas para el mismo elemento, visor y fecha UTC.

```typescript
async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|---------------------|----------|----------|------------------------------------|
|`view.itemId`|`string`|si|babosa de artículo|
|`view.viewerId`|`string`|si|Identificador del espectador (usuario/anónimo)|
|`view.viewedDateUtc`|`string`|si|Cadena de fecha UTC (AAAA-MM-DD)|

**Devuelve:** `Promise<boolean>` -- `true` si se registró una nueva vista, `false` si era un duplicado

**Patrón SQL:**

```sql
INSERT INTO item_views (item_id, viewer_id, viewed_date_utc)
VALUES (?, ?, ?)
ON CONFLICT DO NOTHING
RETURNING id;
```

**Notas de rendimiento:**
- Utiliza `ON CONFLICT DO NOTHING` para inserciones idempotentes
- La restricción única en `(itemId, viewerId, viewedDateUtc)` garantiza la deduplicación diaria
- No es necesario realizar un viaje de ida y vuelta para comprobar si hay duplicados

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

Obtiene el recuento de vistas de los artículos en los últimos N días.

```typescript
async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Predeterminado|Descripción|
|-------------|------------|----------|---------|--------------------------|
|`itemSlugs`|`string[]`|si| --      |Conjunto de babosas de elementos|
|`days`|`number`|No| `7`     |Número de días para mirar atrás|

**Devoluciones:** `Promise<number>` -- Ver el recuento del período

**Patrón SQL:**

```sql
SELECT count(*) FROM item_views
WHERE item_id IN (...) AND viewed_date_utc >= ?;
```

**Notas de rendimiento:**
- Utiliza cadenas de fecha UTC para filtrado independiente de la zona horaria
- Eficiente cuando la columna `viewedDateUtc` está indexada

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

Obtiene el recuento de vistas por elemento para la visualización de los elementos principales.

```typescript
async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|si|Conjunto de babosas de elementos|

**Devoluciones:** `Promise<Map<string, number>>` -- Mapa del slug de elementos para ver el recuento

**Patrón SQL:**

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

## Notas de rendimiento

1. **Protección de matriz vacía**: todas las funciones de agregación regresan inmediatamente con resultados cero/vacíos cuando se pasa una matriz `itemSlugs` vacía, evitando consultas innecesarias a la base de datos.

2. **Deduplicación diaria**: `recordItemView` utiliza una restricción única y `ON CONFLICT DO NOTHING` para una deduplicación eficiente, sin bloqueos y sin verificación previa.

3. **Fechas basadas en UTC**: el filtrado de fechas de visualización utiliza cadenas de fechas UTC (`YYYY-MM-DD`), lo que garantiza un comportamiento coherente en todas las zonas horarias del servidor.

4. **Normalización de slug**: se llama a `getItemIdFromSlug` en toda la capa de participación (votos, comentarios) para garantizar una identificación coherente de los elementos.

## Ejemplos de uso

### Grabar una vista de página

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

### Creación de un gráfico de vistas del panel

```typescript
import { getDailyViewsData, getViewsPerItem } from '@/lib/db/queries';

const itemSlugs = ['clockify', 'toggl', 'harvest'];

// Daily trend data
const dailyViews = await getDailyViewsData(itemSlugs, 14);

// Per-item breakdown
const perItemViews = await getViewsPerItem(itemSlugs);
```
