---
id: item-repository
title: Repozytorium elementów
sidebar_label: Repozytorium elementów
sidebar_position: 16
---

# Repozytorium elementów

Klasa `ItemRepository` zapewnia podstawową warstwę dostępu do danych służącą do zarządzania elementami (listami/przesłaniami) w szablonie. Deleguje pamięć do usługi wspieranej przez Git i dodaje dodatkowo sprawdzanie poprawności, filtrowanie, paginację, rejestrowanie audytu i obsługę miękkiego usuwania.

**Plik źródłowy:** `template/lib/repositories/item.repository.ts`

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

## Definicja klasy

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Zależności

|Importuj|Cel|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Wpisz definicje z `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Usługa przechowywania danych wspierana przez Git|
|`getContentPath`|Rozwiązuje katalog treści lokalny i Vercel|
|`coreConfig`|Scentralizowana usługa konfiguracji|
|`itemAuditService` / `AuditUser`|Rejestrowanie ścieżki audytu|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Metody zapytań

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Zwraca wszystkie elementy pasujące do podanych filtrów. Stosuje następujący łańcuch filtrów w kolejności:

1. **status** -- dokładne dopasowanie na `item.status`
2. **kategorie** -- logika LUB; element musi zawierać co najmniej jedną z żądanych kategorii
3. **tagi** -- logika LUB; element musi zawierać co najmniej jeden z żądanych tagów
4. **przesłane przez** — dokładne dopasowanie w `item.submitted_by`
5. **szukaj** -- dopasowanie podciągu bez uwzględniania wielkości liter w `item.name` lub `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Parametr|Wpisz|Domyślne|Opis|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Filtruj według stanu przedmiotu|
|`options.categories`|`string[]`| -- |Filtruj według kategorii ślimaki (LUB)|
|`options.tags`|`string[]`| -- |Filtruj według nazw tagów (LUB)|
|`options.submittedBy`|`string`| -- |Filtruj według identyfikatora użytkownika przesyłającego|
|`options.search`|`string`| -- |Wyszukiwanie dowolnego tekstu|
|`options.includeDeleted`|`boolean`|`false`|Uwzględnij elementy usunięte nietrwało|

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

Wyszukuje pojedynczy element według jego unikalnego identyfikatora.

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

Wyszukiwanie zbiorcze wielu elementów według ich ślimaków. Zwraca pustą tablicę, jeśli dane wejściowe są puste.

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

Aktualizuje istniejący element. Przechwytuje poprzedni stan na potrzeby rejestrowania różnic inspekcji.

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

Recenzuje element (zatwierdza lub odrzuca). Sprawdza, czy `reviewData.status` to `"approved"` lub `"rejected"`.

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

Oznacza element jako usunięty (ustawia `deleted_at`) bez usuwania pliku.

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

## Metody użytkowe

### `checkDuplicateId(id): Promise<boolean>`

Zwraca `true`, jeśli jakikolwiek element (w tym usunięty) ma ten sam identyfikator.

### `checkDuplicateSlug(slug): Promise<boolean>`

Zwraca `true`, jeśli jakikolwiek element (w tym usunięty) ma ten sam ślimak.

### `getStats(options?): Promise<StatsObject>`

Zwraca liczniki statusów przefiltrowane według opcjonalnych ograniczeń `submittedBy`, `search`, `categories` i `tags`.

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

Przedmioty ze znacznikiem czasu `deleted_at` są liczone oddzielnie od elementów aktywnych.

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

## Przykład użycia

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
