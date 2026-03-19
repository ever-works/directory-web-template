---
id: git-operations
title: Git Operations Services
sidebar_label: Git Operations
sidebar_position: 4
---

# Git Operations Services

The Ever Works Template uses a Git-based content management system where YAML files stored in a GitHub repository serve as the source of truth. Four dedicated Git service classes handle CRUD operations and synchronization for items, categories, tags, and collections.

## Architecture Overview

All Git services share a common architecture built on top of the `isomorphic-git` library, enabling server-side Git operations without a native Git binary.

| Service | File | Data Format | Storage |
|---------|------|-------------|---------|
| `ItemGitService` | `item-git.service.ts` | Per-item YAML directories | `data/{slug}/{slug}.yml` |
| `CategoryGitService` | `category-git.service.ts` | Single YAML file | `categories.yml` |
| `TagGitService` | `tag-git.service.ts` | Single YAML file | `tags.yml` |
| `CollectionGitService` | `collection-git.service.ts` | Single YAML file | `collections.yml` |

```
.content/
  .git/
  data/
    my-item/
      my-item.yml
  categories.yml
  tags.yml
  collections.yml
```

## ItemGitService

The `ItemGitService` manages individual content items. Each item is stored as a YAML file inside its own directory, identified by its slug.

### Configuration

```typescript
interface ItemGitServiceConfig {
  owner: string;    // GitHub repository owner
  repo: string;     // Repository name
  token: string;    // GitHub personal access token
  branch: string;   // Target branch (e.g., "main")
  dataDir: string;  // Local directory path (e.g., ".content")
  itemsDir: string; // Items subdirectory (e.g., "data")
}
```

### Initialization

The service initializes by ensuring directory structure exists and syncing with the remote repository:

```typescript
const service = await createItemGitService({
  owner: 'ever-works',
  repo: 'my-data',
  token: process.env.GITHUB_TOKEN,
  branch: 'main',
  dataDir: '.content',
  itemsDir: 'data',
});
```

During initialization, the service either clones the repository (first run) or pulls the latest changes from the remote.

### Item CRUD Operations

| Method | Description | Git Commit |
|--------|-------------|------------|
| `createItem(data)` | Creates a new item with duplicate detection | Yes |
| `updateItem(id, data)` | Updates an existing item by ID | Yes |
| `updateItemWithoutCommit(id, data)` | Updates locally without Git push | No |
| `deleteItem(id)` | Permanently removes an item file | Yes |
| `softDeleteItem(id)` | Sets `deleted_at` timestamp | Yes |
| `restoreItem(id)` | Clears `deleted_at` to restore item | Yes |
| `reviewItem(id, reviewData)` | Updates status with review metadata | Yes |

### Reading Items

```typescript
// Read all items (excludes soft-deleted by default)
const items = await service.readItems();

// Include soft-deleted items
const allItems = await service.readItems(true);

// Read specific items by slug (efficient targeted read)
const specific = await service.readItemsBySlugs(['item-one', 'item-two']);

// Find single item
const item = await service.findItemById('my-item-id');
const bySlug = await service.findItemBySlug('my-item-slug');
```

### Paginated Queries

The service supports server-side pagination with filtering and sorting:

```typescript
const result = await service.getItemsPaginated(1, 10, {
  status: 'approved',
  categories: ['tools', 'apps'],
  tags: ['open-source'],
  search: 'project management',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeDeleted: false,
  submittedBy: 'user-123',
});
// Returns: { items, total, page, limit, totalPages }
```

### Location Indexing Integration

When items contain location data, the `ItemGitService` automatically triggers asynchronous location indexing. This runs in the background and does not block the main operation:

```typescript
// On create/update with location data -> indexes location
// On delete/soft-delete -> removes from location index
```

### Batch Operations

For bulk updates, use `updateItemWithoutCommit` followed by a single batch commit:

```typescript
for (const item of itemsToUpdate) {
  await service.updateItemWithoutCommit(item.id, { featured: true });
}
await service.commitAndPushBatch('Batch: Mark items as featured');
```

## CategoryGitService

Categories are stored in a single `categories.yml` file. The service manages the full lifecycle with Git synchronization.

### Key Methods

```typescript
const categoryService = await createCategoryGitService(gitConfig, '.content');

// CRUD operations
const category = await categoryService.createCategory({ id: 'tools', name: 'Tools' });
const updated = await categoryService.updateCategory({ id: 'tools', name: 'Dev Tools' });
await categoryService.deleteCategory('tools');

// Read operations
const categories = await categoryService.readCategories();

// Repository status
const status = await categoryService.getStatus();
// { repoUrl, branch, lastSync, categoriesCount }
```

### Duplicate Detection

Both `createCategory` and `updateCategory` check for duplicate IDs and names (case-insensitive) before writing:

```typescript
// Throws: 'Category with ID "tools" already exists'
// Throws: 'Category with name "Tools" already exists'
```

## TagGitService

Tags are stored in `tags.yml` with support for an `isActive` flag for enabling/disabling tags without deletion.

### Tag Data Structure

```typescript
interface TagData {
  id: string;
  name: string;
  isActive: boolean; // Defaults to true for backward compatibility
}
```

### Key Methods

```typescript
const tagService = await createTagGitService(config);

// CRUD
const tag = await tagService.createTag({ id: 'react', name: 'React', isActive: true });
const updated = await tagService.updateTag('react', { name: 'React.js' });
await tagService.deleteTag('react');

// Querying
const allTags = await tagService.getAllTags();
const byName = await tagService.findTagByName('React');
const paginated = await tagService.getTagsPaginated(1, 20);

// Duplicate checking
const isDuplicateName = await tagService.checkDuplicateName('react', excludeId);
const isDuplicateId = await tagService.checkDuplicateId('react');
```

## CollectionGitService

Collections group items together and are stored in `collections.yml`. They support slugs, descriptions, icons, and item counts.

### Collection Data Structure

```typescript
interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url?: string;
  isActive: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}
```

### Pending Changes Merging

The `CollectionGitService` includes a sophisticated merge strategy for pending changes. When multiple writes occur before a Git push succeeds, the service merges them by collection ID, keeping the most recent version:

```typescript
// Internal merge logic preserves latest edits
// and prevents older pending state from overwriting newer changes
private mergePendingChanges(next: Collection[]): void {
  // Uses Map to deduplicate by ID, preferring `next` (newer)
}
```

## Background Sync and Resilience

All four Git services implement a resilient synchronization pattern with automatic retry.

### Sync Flow

1. **Local write first** -- The YAML file is always written locally before attempting Git operations
2. **Commit and push** -- Changes are staged, committed, and pushed to GitHub
3. **Failure handling** -- If Git operations fail, changes are stored as pending
4. **Background retry** -- A background process retries with exponential backoff

### Retry Configuration

| Parameter | Value |
|-----------|-------|
| Initial retry delay | 30 seconds |
| Backoff multiplier | 2x |
| Maximum delay | 5 minutes |
| Maximum retries | 3 |

### Sync Status

Each service exposes its synchronization state:

```typescript
const status = await service.getSyncStatus();
// {
//   hasPendingChanges: boolean,
//   syncInProgress: boolean,
//   lastSyncAttempt?: string,
//   retryCount?: number
// }
```

### Cleanup

The `CategoryGitService`, `TagGitService`, and `CollectionGitService` provide a `cleanup()` method to stop retry timers and release resources:

```typescript
service.cleanup(); // Clears timeouts, resets state
```

## Authentication

All services authenticate with GitHub using the personal access token pattern:

```typescript
// Authentication via x-access-token
{ username: 'x-access-token', password: config.token }
```

Commits are attributed to a configured committer identity:

```typescript
// Default committer
{ name: 'Ever Works Admin', email: 'admin@everworks.com' }
// Or environment-based
{ name: process.env.GIT_NAME, email: process.env.GIT_EMAIL }
```

## Source Files

| File | Path |
|------|------|
| Item Git Service | `template/lib/services/item-git.service.ts` |
| Category Git Service | `template/lib/services/category-git.service.ts` |
| Tag Git Service | `template/lib/services/tag-git.service.ts` |
| Collection Git Service | `template/lib/services/collection-git.service.ts` |
