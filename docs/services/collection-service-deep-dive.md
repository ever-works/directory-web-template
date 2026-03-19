---
id: collection-service-deep-dive
title: Collection Service Deep Dive
sidebar_label: Collection Service (Deep Dive)
sidebar_position: 58
---

# Collection Service Deep Dive

## Overview

The Collection Service manages curated groups of items (e.g., "Editor's Picks", "Top Free Tools"). Collections are stored in a `collections.yml` file within the Git-backed content repository, following the same Git-first architecture as items and categories. The service handles CRUD operations, Git synchronization, and background retry logic.

## Source Files

| File | Path |
|------|------|
| Git Service | `template/lib/services/collection-git.service.ts` |
| Repository | `template/lib/repositories/collection.repository.ts` |
| Types | `template/types/collection.ts` |

## Architecture

```
API Routes / Server Components
        |
   CollectionRepository (if exists)
        |
   CollectionGitService
        |
   collections.yml (YAML array)
        |
   Local Filesystem (.content/collections.yml)
        |
   GitHub Remote (isomorphic-git)
```

Collections are stored as a YAML array in a single file rather than individual files per collection. Items reference collections via a `collections` array field in their YAML data.

## Data Model

```typescript
interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url?: string;
  isActive: boolean;
  item_count: number;
  created_at: string;   // ISO timestamp
  updated_at: string;   // ISO timestamp
}
```

## CollectionGitService

### Constructor

```typescript
new CollectionGitService({
  dataDir: string;            // Base content directory
  collectionsFile: string;    // Filename (default: 'collections.yml')
  gitConfig: {
    owner: string;
    repo: string;
    token: string;
    branch?: string;
  };
})
```

### `initialize(): Promise<void>`

1. Creates the data directory
2. Syncs with remote Git (clone or pull)
3. Ensures `collections.yml` exists (creates with empty array if missing)

### `readCollections(): Promise<Collection[]>`

Reads and parses the collections YAML file. Returns empty array on error.

### `writeCollections(collections: Collection[]): Promise<void>`

Writes the full collections array to YAML, then performs Git operations:

1. Write file locally
2. `git add` the collections file
3. `git commit` with timestamped message
4. `git push` to GitHub

On Git failure: saves locally, merges pending changes, and schedules background sync.

### `createCollection(data: CreateCollectionRequest): Promise<Collection>`

Creates a new collection.

**Parameters:**
```typescript
interface CreateCollectionRequest {
  id: string;
  slug?: string;    // Defaults to id if not provided
  name: string;
  description?: string;
  icon_url?: string;
  isActive?: boolean;  // Defaults to true
}
```

**Validation:**
- ID must be unique among existing collections
- Slug must be unique among existing collections
- Both ID and slug are trimmed

**Auto-populated fields:**
- `item_count` starts at 0
- `created_at` and `updated_at` set to current ISO timestamp
- `isActive` defaults to `true`

### `updateCollection(data: UpdateCollectionRequest): Promise<Collection>`

Updates an existing collection by ID.

**Parameters:** All fields optional except `id`:
```typescript
interface UpdateCollectionRequest {
  id: string;
  slug?: string;
  name?: string;
  description?: string;
  icon_url?: string;
  isActive?: boolean;
  item_count?: number;
}
```

**Validation:**
- Collection must exist (throws if not found)
- If slug is changed, must not conflict with other collections

Preserves existing values for fields not included in the update. Updates `updated_at` timestamp.

### `deleteCollection(id: string): Promise<void>`

Removes a collection by filtering it from the array. Throws if the collection ID is not found.

### `getStatus(): Promise<CollectionStatus>`

Returns repository metadata:

```typescript
{
  repoUrl: string;
  branch: string;
  lastSync: string;     // ISO timestamp
  collectionsCount: number;
}
```

### `cleanup(): void`

Stops background sync timers and resets retry state. Should be called when the service is being disposed.

## Pending Changes and Background Sync

### Merge Strategy

When a Git push fails, pending changes are merged with any previously pending changes using an ID-based merge:

1. Start from the new (most recent) changes as the base
2. For each previously pending collection: add it only if its ID is not already in the new set
3. This ensures newer edits always take priority

### Retry Strategy

- **Initial delay:** 30 seconds
- **Exponential backoff:** 30s, 60s, 120s (doubles each retry, capped at 5 minutes)
- **Max retries:** 3
- **Sync process:**
  1. Sync with remote (pull latest)
  2. Re-write pending changes to file
  3. Git add, commit, push

The `syncInProgress` flag prevents concurrent sync operations. After reaching max retries, the retry count resets so future write operations can trigger new attempts.

## Factory Function

```typescript
export async function createCollectionGitService(
  gitConfig: GitConfig,
  dataDir: string = getContentPath()
): Promise<CollectionGitService>
```

Creates, initializes, and returns a `CollectionGitService` instance. Uses `getContentPath()` for environment-aware path resolution.

## Item-Collection Relationship

Items reference collections through their `collections` field:

```yaml
# In an item's YAML file
name: My Tool
collections:
  - editors-picks
  - top-free-tools
```

To assign items to a collection, use `ItemRepository.batchUpdate()` to update multiple items' `collections` arrays in a single Git commit.

## Error Handling

- **Initialize failure:** Throws and logs the error -- the service cannot function without successful initialization
- **Read failure:** Returns empty array, logs error
- **Write failure (file):** Throws -- local save must succeed
- **Write failure (Git):** Saves locally, merges pending, schedules retry -- does not throw
- **Duplicate ID/slug:** Throws descriptive error
- **Not found:** Throws descriptive error on update/delete of non-existent collection

## Usage Examples

```typescript
import { createCollectionGitService } from '@/lib/services/collection-git.service';

const collectionService = await createCollectionGitService({
  owner: 'my-org',
  repo: 'my-data-repo',
  token: process.env.GH_TOKEN!,
});

// Create a collection
const collection = await collectionService.createCollection({
  id: 'editors-picks',
  name: "Editor's Picks",
  description: 'Hand-picked tools recommended by our team',
  isActive: true,
});

// Read all collections
const collections = await collectionService.readCollections();

// Update a collection
await collectionService.updateCollection({
  id: 'editors-picks',
  name: "Editor's Top Picks",
  item_count: 15,
});

// Delete a collection
await collectionService.deleteCollection('editors-picks');

// Check sync status
const status = await collectionService.getStatus();
// { repoUrl: '...', branch: 'main', collectionsCount: 5, lastSync: '...' }

// Clean up when done
collectionService.cleanup();
```
