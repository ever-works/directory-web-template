---
id: item-service
title: "Item Service"
sidebar_label: "Item Service"
sidebar_position: 23
---

# Item Service

The item system provides full CRUD operations for directory listings stored as individual YAML files in a Git-backed content repository. Each item lives in its own directory under `data/{slug}/{slug}.yml` and is synchronized with GitHub through `isomorphic-git`.

## Architecture

Items are managed by the `ItemGitService` at `lib/services/item-git.service.ts`. Unlike categories and tags which use a single YAML file, items follow a directory-per-item pattern where each item slug maps to its own folder and YAML file.

## ItemData Type

Items follow the structure defined in `lib/types/item.ts`:

```ts
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string[];
  tags: string[];
  collections?: string[];
  featured: boolean;
  icon_url?: string;
  updated_at: string;
  status: string;
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;
  location?: ItemLocation;
}
```

## Configuration

```ts
export interface ItemGitServiceConfig {
  owner: string;
  repo: string;
  token: string;
  branch: string;
  dataDir: string;
  itemsDir: string;
}
```

## Initialization

```ts
import { createItemGitService } from '@/lib/services/item-git.service';

const itemService = await createItemGitService({
  owner: 'your-org',
  repo: 'your-data-repo',
  token: process.env.GITHUB_TOKEN,
  branch: 'main',
  dataDir: './.content',
  itemsDir: 'data',
});
```

Initialization creates the data directory if missing, then clones or pulls the remote repository.

## CRUD Operations

### Create an Item

```ts
const item = await itemService.createItem({
  id: 'my-tool',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A productivity tool for teams.',
  source_url: 'https://example.com',
  category: ['productivity'],
  tags: ['saas', 'teams'],
  status: 'draft',
  submitted_by: 'user@example.com',
});
```

The service validates against duplicate IDs and slugs before creating. New items default to `draft` status and receive timestamps via the `formatDateForYaml` helper.

### Read Items

```ts
// Get all non-deleted items
const items = await itemService.readItems();

// Include soft-deleted items
const allItems = await itemService.readItems(true);
```

The `readItems` method scans the `data/` directory, reads each `{slug}/{slug}.yml` file, and normalizes fields with sensible defaults. Categories are coerced to arrays, missing `status` defaults to `approved`, and `isActive` on locations defaults to `false`.

### Read by Slugs

For targeted lookups without a full directory scan:

```ts
const items = await itemService.readItemsBySlugs(
  ['my-tool', 'another-tool'],
  false // includeDeleted
);
```

Slug values are validated against the pattern `/^[a-z0-9-]+$/` and deduplicated before reading.

### Update an Item

```ts
const updated = await itemService.updateItem('my-tool', {
  name: 'My Tool Pro',
  description: 'An enhanced productivity tool.',
  tags: ['saas', 'teams', 'enterprise'],
});
```

The `id` field is preserved during updates. Only provided fields are merged with the existing item data.

### Review an Item

Administrators can approve or reject submissions:

```ts
const reviewed = await itemService.reviewItem('my-tool', {
  status: 'approved',
  review_notes: 'Meets all quality guidelines.',
});
```

This sets `reviewed_by`, `reviewed_at`, and `updated_at` timestamps automatically.

### Delete an Item

Hard delete removes the YAML file and its directory:

```ts
await itemService.deleteItem('my-tool');
```

### Soft Delete and Restore

Soft delete marks an item with a `deleted_at` timestamp without removing the file:

```ts
// Soft delete
const deleted = await itemService.softDeleteItem('my-tool');

// Restore a soft-deleted item
const restored = await itemService.restoreItem('my-tool');
```

Soft-deleted items are excluded from normal reads. Pass `includeDeleted: true` to include them.

### Update Without Commit

For batch operations, update files locally without triggering Git operations:

```ts
await itemService.updateItemWithoutCommit('item-1', { featured: true });
await itemService.updateItemWithoutCommit('item-2', { featured: true });
await itemService.commitAndPushBatch('Feature multiple items');
```

## Paginated Queries

```ts
const result = await itemService.getItemsPaginated(1, 10, {
  status: 'approved',
  categories: ['productivity', 'developer-tools'],
  tags: ['open-source'],
  search: 'project management',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeDeleted: false,
  submittedBy: 'user@example.com',
});
```

The returned object:

```ts
{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### Filtering

- **status** -- filters by item status (e.g., `pending`, `approved`, `rejected`)
- **categories** -- OR logic; items matching any selected category are included
- **tags** -- OR logic; items matching any selected tag are included
- **submittedBy** -- filters by the submitter identifier
- **search** -- case-insensitive search across `name` and `description` fields

### Sorting

Supported `sortBy` values: `name`, `updated_at`, `status`, `submitted_at`. Default is `updated_at` descending.

## YAML Storage Format

Each item is stored as `data/{slug}/{slug}.yml`:

```yaml
name: My Tool
description: A productivity tool for teams.
source_url: https://example.com
category:
  - productivity
tags:
  - saas
  - teams
collections: []
featured: false
icon_url: https://example.com/icon.png
updated_at: "2026-01-15 10:30"
status: approved
submitted_by: user@example.com
submitted_at: "2026-01-10 09:00"
reviewed_by: admin
reviewed_at: "2026-01-15 10:30"
location:
  city: New York
  country: US
  latitude: 40.7128
  longitude: -74.006
  is_remote: false
```

## Location Indexing

When items include location data, the service integrates with a location index for geographic queries:

```ts
private indexLocationAsync(item: ItemData): void {
  const indexService = getLocationIndexService();
  if (!indexService.isEnabled()) return;
  if (!item.location) return;
  indexService.indexItem(item).catch((err) => {
    console.error(`Failed to index location for ${item.slug}:`, err);
  });
}
```

Location indexing runs asynchronously and does not block write operations. When items are deleted or their location is removed, the index entry is cleaned up.

## Git Integration

### Write Flow

When an item is written:

1. The item directory is created if missing under `data/{slug}/`
2. Item data is serialized to YAML and written to `{slug}.yml`
3. All changes are staged with `git add`
4. A commit is created with a timestamped message
5. Changes are pushed to the remote repository

### Background Sync

If Git operations fail, the local file is preserved and changes are queued for background retry:

```ts
private scheduleBackgroundSync(): void {
  if (this.syncInProgress) return;
  setTimeout(() => {
    this.performBackgroundSync();
  }, 30000); // 30 seconds
}
```

Failed background syncs retry after 5 minutes.

### Sync Status

```ts
const status = await itemService.getSyncStatus();
// {
//   hasPendingChanges: boolean;
//   syncInProgress: boolean;
// }
```

## Related Files

| File | Description |
|------|-------------|
| `lib/services/item-git.service.ts` | Item CRUD with Git sync |
| `lib/types/item.ts` | Item type definitions |
| `.content/data/{slug}/{slug}.yml` | Per-item YAML storage |
| `lib/services/location/location-index.service.ts` | Geographic indexing |
| `lib/validations/client-item.ts` | Item validation schemas |
