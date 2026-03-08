---
id: item-service-deep-dive
title: Item Service Deep Dive
sidebar_label: Item Service (Deep Dive)
sidebar_position: 50
---

# Item Service Deep Dive

## Overview

The Item Service is the core data management layer for items (directory listings) in the Ever Works template. It uses a **Git-backed storage model** where items are stored as individual YAML files inside a GitHub repository, synced to the local filesystem. The architecture is split across two classes:

- **`ItemRepository`** (`lib/repositories/item.repository.ts`) -- the high-level API that validates input and manages audit trails.
- **`ItemGitService`** (`lib/services/item-git.service.ts`) -- the low-level service that handles YAML file I/O, Git clone/pull/commit/push, and pagination.

## Source Files

| File | Path |
|------|------|
| Repository (public API) | `template/lib/repositories/item.repository.ts` |
| Git Service (storage layer) | `template/lib/services/item-git.service.ts` |
| Types | `template/lib/types/item.ts` |
| Audit Service | `template/lib/services/item-audit.service.ts` |

## Architecture

```
API Routes / Server Components
        |
   ItemRepository        (validation, audit logging)
        |
   ItemGitService         (YAML I/O, Git operations)
        |
   Local Filesystem       (.content/data/{slug}/{slug}.yml)
        |
   GitHub Remote          (isomorphic-git push/pull)
```

Items are stored as YAML files in a directory-per-item structure:

```
.content/data/
  my-tool/
    my-tool.yml
  another-tool/
    another-tool.yml
```

## Method Reference -- ItemRepository

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Returns all items matching the given filter criteria.

**Parameters:**
- `options.status` -- Filter by item status (`draft`, `pending`, `approved`, `rejected`)
- `options.categories` -- Filter by categories (OR logic: item matches if it has at least one)
- `options.tags` -- Filter by tags (OR logic)
- `options.submittedBy` -- Filter by submitter user ID
- `options.search` -- Case-insensitive search in name and description
- `options.includeDeleted` -- Include soft-deleted items (default: `false`)

**Returns:** Array of `ItemData` objects.

### `findAllPaginated(page, limit, options?): Promise<PaginatedResult>`

Server-side paginated listing with sorting support.

**Parameters:**
- `page` (`number`, default `1`) -- Page number
- `limit` (`number`, default `10`) -- Items per page
- `options.sortBy` -- Sort field: `name`, `updated_at`, `status`, `submitted_at`
- `options.sortOrder` -- `asc` or `desc`

**Returns:**
```typescript
{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `findById(id: string, includeDeleted?: boolean): Promise<ItemData | null>`

Looks up a single item by its unique ID.

### `findBySlug(slug: string, includeDeleted?: boolean): Promise<ItemData | null>`

Looks up a single item by its URL slug.

### `findManyBySlugs(slugs: string[], includeDeleted?: boolean): Promise<ItemData[]>`

Batch lookup by slug array. Uses targeted file reads instead of scanning the entire data directory for better performance.

### `create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData>`

Creates a new item. Validates required fields (id, name, slug, description, source_url), slug format (`/^[a-z0-9-]+$/`), and URL format. Checks for duplicate ID and slug. Logs creation to audit trail.

**Validation rules:**
- `id`, `name`, `slug`, `description`, `source_url` are all required and non-empty
- `slug` must match `/^[a-z0-9-]+$/`
- `source_url` must be a valid URL

### `update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData>`

Updates an existing item. Captures previous state for change-detection audit logging.

### `batchUpdate(updates, auditUser?): Promise<ItemData[]>`

Atomically updates multiple items with a single Git commit. Used for collection assignment operations. Pre-validates all updates before writing any files to prevent partial writes.

**Flow:**
1. Validate all updates
2. Write each item file without committing
3. Single `commitAndPush` for the batch
4. Log audit entries after successful commit

### `review(id: string, reviewData: ReviewRequest, auditUser?): Promise<ItemData>`

Approve or reject an item submission. Sets `status`, `review_notes`, `reviewed_by`, and `reviewed_at`.

**ReviewRequest:**
```typescript
{
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

### `delete(id: string, auditUser?): Promise<void>`

**Hard delete** -- removes the YAML file and directory from the filesystem and pushes to Git.

### `softDelete(id: string, auditUser?): Promise<ItemData>`

Sets `deleted_at` timestamp without removing the file. Soft-deleted items are excluded from normal queries.

### `restore(id: string, auditUser?): Promise<ItemData>`

Restores a soft-deleted item by clearing the `deleted_at` field.

### `checkDuplicateId(id: string): Promise<boolean>`

Returns `true` if an item with the given ID already exists.

### `checkDuplicateSlug(slug: string): Promise<boolean>`

Returns `true` if an item with the given slug already exists.

### `getStats(options?): Promise<ItemStats>`

Returns aggregated counts by status (total, draft, pending, approved, rejected, deleted). Supports the same filter options as `findAll`.

## Method Reference -- ItemGitService

### `initialize(): Promise<void>`

Creates data directories and syncs with the remote Git repository (clone or pull).

### `readItems(includeDeleted?: boolean): Promise<ItemData[]>`

Reads all item YAML files from the `data/` directory. Normalizes fields, provides defaults for missing values, and parses location data.

### `readItemsBySlugs(slugs: string[], includeDeleted?: boolean): Promise<ItemData[]>`

Targeted read of specific items by slug. Validates slugs match `/^[a-z0-9-]+$/` to prevent path traversal. Skips missing items gracefully.

### `createItem(data: CreateItemRequest): Promise<ItemData>`

Creates a new item YAML file, commits, and pushes. Default status is `draft`.

### `updateItem(id, data): Promise<ItemData>`

Updates item, writes YAML, commits, and pushes.

### `updateItemWithoutCommit(id, data): Promise<ItemData>`

Writes the updated YAML file but does not commit -- used by `batchUpdate` for atomic multi-item operations.

### `commitAndPushBatch(message: string): Promise<void>`

Commits and pushes all staged changes with a single commit message.

### `reviewItem(id, reviewData): Promise<ItemData>`

Updates review fields and commits.

### `deleteItem(id): Promise<void>`

Removes the YAML file, cleans up empty directory, commits, and pushes.

### `softDeleteItem(id): Promise<ItemData>`

Sets `deleted_at` timestamp.

### `restoreItem(id): Promise<ItemData>`

Clears `deleted_at` to restore visibility.

### `getItemsPaginated(page, limit, options): Promise<PaginatedResult>`

Full pagination with filter, sort, and search support. Sorting is by string comparison on `name`, `status`, `submitted_at`, or `updated_at`.

### `getSyncStatus(): Promise<SyncStatus>`

Returns whether there are pending changes and if a sync is in progress.

## Git Sync and Background Recovery

The service implements a resilient sync pattern:

1. **Primary path:** Write file, `git add .`, `git commit`, `git push`
2. **On push failure:** Save locally, store pending changes, schedule background sync in 30 seconds
3. **Background sync:** Retry push. On failure, retry again in 5 minutes

This ensures data is never lost -- YAML is always saved locally first.

## Location Indexing

When items have location data, the service asynchronously indexes them for geo-queries:

- `createItem` / `updateItem` / `restoreItem` call `indexLocationAsync()`
- `deleteItem` / `softDeleteItem` call `removeLocationIndexAsync()`

These are fire-and-forget operations that do not block the main request.

## Error Handling

- All validation errors throw `Error` with descriptive messages
- Git sync failures are logged but do not prevent local saves
- Audit logging failures are caught with `console.warn` and do not affect the main operation
- File read errors for individual items are caught and skipped (other items continue loading)

## Usage Examples

```typescript
import { ItemRepository } from '@/lib/repositories/item.repository';

const repo = new ItemRepository();

// List approved items in a category
const items = await repo.findAll({
  status: 'approved',
  categories: ['productivity'],
});

// Create a new item
const newItem = await repo.create({
  id: 'my-new-tool',
  name: 'My New Tool',
  slug: 'my-new-tool',
  description: 'A great productivity tool',
  source_url: 'https://example.com',
  category: ['productivity'],
  tags: ['free', 'open-source'],
  status: 'pending',
  submitted_by: 'user_123',
});

// Approve an item
const approved = await repo.review('my-new-tool', {
  status: 'approved',
  review_notes: 'Looks good!',
});

// Paginated admin listing
const page = await repo.findAllPaginated(1, 20, {
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeDeleted: true,
});

// Batch update for collection assignment
await repo.batchUpdate([
  { id: 'tool-1', data: { collections: ['featured'] } },
  { id: 'tool-2', data: { collections: ['featured'] } },
]);
```
