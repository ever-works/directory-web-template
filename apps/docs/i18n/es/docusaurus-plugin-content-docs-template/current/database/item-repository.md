---
id: item-repository
title: Repositorio de artículos
sidebar_label: Repositorio de artículos
sidebar_position: 16
---

# Repositorio de artículos

La clase `ItemRepository` proporciona la capa principal de acceso a datos para administrar elementos (listados/envíos) en la plantilla. Delega el almacenamiento a un servicio respaldado por Git y agrega validación, filtrado, paginación, registro de auditoría y soporte de eliminación temporal.

**Archivo fuente:** `template/lib/repositories/item.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  ItemRepository          <-- validation, filtering, audit
        |
  ItemGitService          <-- Git read/write via GitHub API
        |
  GitHub Repository       <-- .content/data/*.yml files
```

The repository lazily initializes an `ItemGitService` instance by parsing the `DATA_REPOSITORY` environment variable for the GitHub owner/repo pair and authenticating with `GH_TOKEN`.

---

## Definición de clase

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Dependencias

|Importar|Propósito|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Definiciones de tipos de `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Servicio de almacenamiento respaldado por Git|
|`getContentPath`|Resuelve el directorio de contenido local versus Vercel.|
|`coreConfig`|Servicio de configuración centralizado|
|`itemAuditService` / `AuditUser`|Registro de seguimiento de auditoría|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Métodos de consulta

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Devuelve todos los elementos que coinciden con los filtros proporcionados. Aplica la siguiente cadena de filtros en orden:

1. **estado** -- coincidencia exacta en `item.status`
2. **categorías** -- O lógica; El artículo debe contener al menos una de las categorías solicitadas.
3. **etiquetas** -- O lógica; El artículo debe contener al menos una de las etiquetas solicitadas.
4. **submittedBy** -- coincidencia exacta en `item.submitted_by`
5. **búsqueda** -- coincidencia de subcadena que no distingue entre mayúsculas y minúsculas en `item.name` o `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Parámetro|Tipo|Predeterminado|Descripción|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Filtrar por estado del artículo|
|`options.categories`|`string[]`| -- |Filtrar por categoría babosas (O)|
|`options.tags`|`string[]`| -- |Filtrar por nombres de etiquetas (O)|
|`options.submittedBy`|`string`| -- |Filtrar por ID de usuario del remitente|
|`options.search`|`string`| -- |Búsqueda de texto libre|
|`options.includeDeleted`|`boolean`|`false`|Incluir elementos eliminados temporalmente|

---

### `findAllPaginated(page?, limit?, options?): Promise<PaginatedResult>`

Server-side paginated query that delegates to `gitService.getItemsPaginated`. Supports the same filter options as `findAll` plus `sortBy` and `sortOrder`.

```ts
async findAllPaginated(
  page: number = 1,
  limit: number = 10,
  options: ItemListOptions = {}
): Promise<{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

---

### `findById(id, includeDeleted?): Promise<ItemData | null>`

Busca un solo elemento por su ID única.

```ts
async findById(id: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findBySlug(slug, includeDeleted?): Promise<ItemData | null>`

Looks up a single item by its URL slug.

```ts
async findBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findManyBySlugs(slugs, includeDeleted?): Promise<ItemData[]>`

Búsqueda por lotes de varios elementos por sus slugs. Devuelve una matriz vacía si la entrada está vacía.

```ts
async findManyBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]>
```

---

## Mutation Methods

### `create(data, auditUser?): Promise<ItemData>`

Creates a new item after running `validateCreateData`. Logs the creation via `itemAuditService.logCreation` (best-effort -- failures are warned but not thrown).

```ts
async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

**Validation rules** enforced by `validateCreateData`:
- `id`, `name`, `slug`, `description`, `source_url` are all required and non-empty
- `slug` must match `/^[a-z0-9-]+$/`
- `source_url` must be a valid URL (parsed via `new URL()`)

---

### `update(id, data, auditUser?): Promise<ItemData>`

Actualiza un elemento existente. Captura el estado anterior para el registro de diferencias de auditoría.

```ts
async update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `batchUpdate(updates, auditUser?): Promise<ItemData[]>`

Applies multiple updates in a single Git commit for atomicity. Pre-validates all entries before writing any. After committing, logs each change to the audit trail.

```ts
async batchUpdate(
  updates: Array<{ id: string; data: UpdateItemRequest }>,
  auditUser?: AuditUser
): Promise<ItemData[]>
```

Uses `gitService.updateItemWithoutCommit` for each item, then calls `gitService.commitAndPushBatch` once.

---

### `review(id, reviewData, auditUser?): Promise<ItemData>`

Revisa un artículo (aprobar o rechazar). Valida que `reviewData.status` es `"approved"` o `"rejected"`.

```ts
async review(id: string, reviewData: ReviewRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `delete(id, auditUser?): Promise<void>`

Hard-deletes an item permanently from the Git repository.

```ts
async delete(id: string, auditUser?: AuditUser): Promise<void>
```

---

### `softDelete(id, auditUser?): Promise<ItemData>`

Marca un elemento como eliminado (establece `deleted_at`) sin eliminar el archivo.

```ts
async softDelete(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

### `restore(id, auditUser?): Promise<ItemData>`

Restores a previously soft-deleted item by clearing the `deleted_at` timestamp.

```ts
async restore(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

## Métodos de utilidad

### `checkDuplicateId(id): Promise<boolean>`

Devuelve `true` si algún elemento (incluido el eliminado) comparte el ID proporcionado.

### `checkDuplicateSlug(slug): Promise<boolean>`

Devuelve `true` si algún elemento (incluido el eliminado) comparte el slug dado.

### `getStats(options?): Promise<StatsObject>`

Devuelve recuentos de estado filtrados por restricciones opcionales `submittedBy`, `search`, `categories` y `tags`.

```ts
async getStats(options?: {
  submittedBy?: string;
  search?: string;
  categories?: string[];
  tags?: string[];
}): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}>
```

Los elementos con una marca de tiempo `deleted_at` se cuentan por separado de los elementos activos.

---

## Audit Trail Integration

Every mutation method accepts an optional `AuditUser` parameter. When provided, the repository logs the action via `itemAuditService`:

| Method | Audit Call |
|--------|-----------|
| `create` | `logCreation(item, auditUser)` |
| `update` | `logUpdate(previousItem, updatedItem, auditUser)` |
| `batchUpdate` | `logUpdate(...)` for each changed item |
| `review` | `logReview(item, previousStatus, notes, auditUser)` |
| `delete` | `logDeletion(item, auditUser, false)` |
| `softDelete` | `logDeletion(item, auditUser, true)` |
| `restore` | `logRestoration(item, auditUser)` |

All audit calls are wrapped in try/catch and log warnings on failure -- they never cause the parent operation to fail.

---

## Ejemplo de uso

```ts
import { ItemRepository } from '@/lib/repositories/item.repository';

const repo = new ItemRepository();

// List approved items in a category
const items = await repo.findAll({
  status: 'approved',
  categories: ['developer-tools'],
});

// Paginated query
const page = await repo.findAllPaginated(1, 20, { search: 'timer' });

// Create with audit
const newItem = await repo.create(
  { id: 'my-tool', name: 'My Tool', slug: 'my-tool', description: '...', source_url: 'https://...' },
  { id: 'user-123', email: 'admin@example.com' }
);
```
