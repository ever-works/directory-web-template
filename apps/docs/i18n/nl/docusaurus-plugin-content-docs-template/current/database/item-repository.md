---
id: item-repository
title: Artikelopslagplaats
sidebar_label: Artikelopslagplaats
sidebar_position: 16
---

# Artikelopslagplaats

De klasse `ItemRepository` biedt de primaire laag voor gegevenstoegang voor het beheren van items (aanbiedingen/inzendingen) in de sjabloon. Het delegeert opslag naar een door Git ondersteunde service en voegt daar validatie, filtering, paginering, auditlogboekregistratie en ondersteuning voor zacht verwijderen aan toe.

**Bronbestand:** `template/lib/repositories/item.repository.ts`

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

## Klasse definitie

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Afhankelijkheden

|Importeren|Doel|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Typedefinities van `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Door Git ondersteunde opslagservice|
|`getContentPath`|Lost de lokale versus Vercel-inhoudsmap op|
|`coreConfig`|Gecentraliseerde configuratieservice|
|`itemAuditService` / `AuditUser`|Loggen van audittrails|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Querymethoden

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Retourneert alle items die overeenkomen met de opgegeven filters. Past de volgende filterketen in volgorde toe:

1. **status** -- exacte overeenkomst op `item.status`
2. **categorieën** -- OF logica; item moet ten minste één van de gevraagde categorieën bevatten
3. **tags** -- OF logica; item moet minimaal één van de gevraagde tags bevatten
4. **ingedienddoor** -- exacte overeenkomst op `item.submitted_by`
5. **zoeken** -- hoofdletterongevoelige subtekenreeksovereenkomst op `item.name` of `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Parameter|Typ|Standaard|Beschrijving|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Filter op artikelstatus|
|`options.categories`|`string[]`| -- |Filter op categorie naaktslakken (OR)|
|`options.tags`|`string[]`| -- |Filter op tagnamen (OR)|
|`options.submittedBy`|`string`| -- |Filter op gebruikers-ID van de indiener|
|`options.search`|`string`| -- |Zoeken in vrije tekst|
|`options.includeDeleted`|`boolean`|`false`|Voeg voorlopig verwijderde items toe|

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

Zoekt een enkel item op aan de hand van zijn unieke ID.

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

Batch opzoeken van meerdere items op basis van hun slugs. Retourneert een lege array als de invoer leeg is.

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

Werkt een bestaand item bij. Legt de vorige status vast voor het loggen van auditverschillen.

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

Een item beoordelen (goedkeuren of afwijzen). Valideert dat `reviewData.status` `"approved"` of `"rejected"` is.

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

Markeert een item als verwijderd (stelt `deleted_at` in) zonder het bestand te verwijderen.

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

## Nutsmethoden

### `checkDuplicateId(id): Promise<boolean>`

Retourneert `true` als een item (inclusief verwijderd) de opgegeven ID deelt.

### `checkDuplicateSlug(slug): Promise<boolean>`

Retourneert `true` als een item (inclusief verwijderd) de opgegeven slug deelt.

### `getStats(options?): Promise<StatsObject>`

Retourneert statustellingen gefilterd door optionele `submittedBy`, `search`, `categories` en `tags` beperkingen.

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

Artikelen met een `deleted_at` tijdstempel worden afzonderlijk van actieve artikelen geteld.

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

## Gebruiksvoorbeeld

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
