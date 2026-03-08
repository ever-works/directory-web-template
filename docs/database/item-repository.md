---
id: item-repository
title: Item Repository
sidebar_label: Item Repository
sidebar_position: 16
---

# Item Repository

The `ItemRepository` class provides the primary data-access layer for managing items (listings/submissions) in the template. It delegates storage to a Git-backed service and adds validation, filtering, pagination, audit logging, and soft-delete support on top.

**Source file:** `template/lib/repositories/item.repository.ts`

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

## Class Definition

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Dependencies

| Import | Purpose |
|--------|---------|
| `ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions` | Type definitions from `@/lib/types/item` |
| `createItemGitService` / `ItemGitService` | Git-backed storage service |
| `getContentPath` | Resolves local vs. Vercel content directory |
| `coreConfig` | Centralized configuration service |
| `itemAuditService` / `AuditUser` | Audit trail logging |

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Query Methods

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Returns all items matching the provided filters. Applies the following filter chain in order:

1. **status** -- exact match on `item.status`
2. **categories** -- OR logic; item must contain at least one of the requested categories
3. **tags** -- OR logic; item must contain at least one of the requested tags
4. **submittedBy** -- exact match on `item.submitted_by`
5. **search** -- case-insensitive substring match on `item.name` or `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `options.status` | `string` | -- | Filter by item status |
| `options.categories` | `string[]` | -- | Filter by category slugs (OR) |
| `options.tags` | `string[]` | -- | Filter by tag names (OR) |
| `options.submittedBy` | `string` | -- | Filter by submitter user ID |
| `options.search` | `string` | -- | Free-text search |
| `options.includeDeleted` | `boolean` | `false` | Include soft-deleted items |

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

Looks up a single item by its unique ID.

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

Batch lookup of multiple items by their slugs. Returns an empty array if the input is empty.

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

Updates an existing item. Captures the previous state for audit diff logging.

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

Reviews an item (approve or reject). Validates that `reviewData.status` is either `"approved"` or `"rejected"`.

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

Marks an item as deleted (sets `deleted_at`) without removing the file.

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

## Utility Methods

### `checkDuplicateId(id): Promise<boolean>`

Returns `true` if any item (including deleted) shares the given ID.

### `checkDuplicateSlug(slug): Promise<boolean>`

Returns `true` if any item (including deleted) shares the given slug.

### `getStats(options?): Promise<StatsObject>`

Returns status counts filtered by optional `submittedBy`, `search`, `categories`, and `tags` constraints.

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

Items with a `deleted_at` timestamp are counted separately from active items.

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

## Usage Example

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
