---
id: content-services
title: Content Management Services
sidebar_label: Content Services
sidebar_position: 1
---

# Content Management Services

The template uses a Git-based CMS architecture where content (items, categories, collections, tags) is stored as YAML files in a Git repository. The content services handle reading, writing, and synchronizing these files between the local filesystem and remote Git repositories.

## Git-Based CMS Architecture

```
Remote Git Repository (DATA_REPOSITORY)
  -> .content/ (local clone)
    -> items/           # Individual YAML files per item
    -> categories.yml   # All categories in one file
    -> collections.yml  # All collections in one file
    -> tags.yml         # All tags in one file
```

Content is stored in YAML format for human readability and easy editing via GitHub PRs. The application reads from the local `.content/` directory clone and pushes changes back to the remote repository.

## ItemGitService

**File:** `lib/services/item-git.service.ts`

The `ItemGitService` manages individual item files stored as YAML in the items directory.

### Configuration

```typescript
interface ItemGitServiceConfig {
  owner: string;      // GitHub owner/organization
  repo: string;       // Repository name
  token: string;      // GitHub personal access token
  branch: string;     // Git branch (default: main)
  dataDir: string;    // Local data directory path
  itemsDir: string;   // Items subdirectory name
}
```

### Initialization

```typescript
const service = new ItemGitService(config);
await service.initialize();
```

Initialization ensures the local data directories exist and synchronizes with the remote repository:

1. Creates `dataDir` and `dataDir/itemsDir` directories
2. Checks if `.git` exists in `dataDir`
3. If exists: pulls latest changes
4. If not: clones the repository

### Git Operations

The service uses `isomorphic-git` for Git operations, which works in both Node.js and browser environments:

```typescript
import git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';

// Clone
await git.clone({
  fs, http,
  dir: this.config.dataDir,
  url: repositoryUrl,
  singleBranch: true,
  depth: 1,  // Shallow clone for performance
});

// Pull latest
await git.pull({
  fs, http,
  dir: this.config.dataDir,
  ref: this.config.branch,
});
```

### YAML File Format

Each item is stored as a YAML file with frontmatter-style fields:

```yaml
name: "Example Tool"
slug: "example-tool"
description: "A description of the tool"
category: "productivity"
tags:
  - "open-source"
  - "saas"
url: "https://example.com"
featured: false
createdAt: "2025-01-15 10:30"
updatedAt: "2025-01-15 10:30"
```

### Date Formatting

Dates are formatted in a specific `YYYY-MM-DD HH:mm` format for YAML consistency:

```typescript
function formatDateForYaml(date: Date = new Date()): string {
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
```

### Concurrency Control

The service uses a `syncInProgress` mutex flag to prevent concurrent write operations:

```typescript
private pendingChanges: ItemData[] | null = null;
private syncInProgress = false;
```

When a sync is in progress, changes are queued in `pendingChanges` and applied after the current sync completes.

## CategoryGitService

**File:** `lib/services/category-git.service.ts`

Manages categories stored in a single YAML file.

### Configuration

```typescript
interface CategoryGitServiceConfig {
  dataDir: string;           // Local data directory
  categoriesFile: string;    // Categories filename (e.g., 'categories.yml')
  gitConfig: GitConfig;      // Git remote configuration
}
```

### Initialization

```typescript
const service = new CategoryGitService(config);
await service.initialize();
```

The initialization process:
1. Creates the data directory
2. Syncs with the remote repository
3. Ensures the categories file exists (creates empty file if missing)

### Retry Logic

The `CategoryGitService` includes built-in retry logic for Git operations:

```typescript
private retryCount = 0;
private maxRetries = 3;
private retryTimeout: NodeJS.Timeout | null = null;
```

Failed sync operations are retried up to 3 times with exponential backoff.

## CollectionGitService

**File:** `lib/services/collection-git.service.ts`

Manages collections stored in a single YAML file, following the same pattern as `CategoryGitService`.

```typescript
interface CollectionGitServiceConfig {
  dataDir: string;
  collectionsFile: string;
  gitConfig: GitConfig;
}

class CollectionGitService {
  private pendingChanges: Collection[] | null = null;
  private syncInProgress = false;
  // CRUD operations similar to CategoryGitService
}
```

## SyncManager

**File:** `lib/services/sync-service.ts`

The `SyncManager` is a singleton service that handles automatic background synchronization of the content repository.

### Configuration Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `SYNC_INTERVAL_MS` | 5 minutes | Time between sync attempts |
| `SYNC_TIMEOUT_MS` | 5 minutes | Maximum sync operation duration |
| `MAX_RETRIES` | 3 | Maximum retry attempts |

### Sync Process

```typescript
class SyncManager {
  private syncInProgress = false;
  private lastSyncTime: Date | null = null;
  private lastSyncResult: SyncResult | null = null;
  private retryCount = 0;

  async performSync(): Promise<SyncResult> {
    // 1. Check dev-mode skip (DISABLE_AUTO_SYNC)
    // 2. Acquire mutex lock
    // 3. Dynamic import of repository module
    // 4. Execute sync with timeout
    // 5. Handle success/failure/retry
    // 6. Release mutex lock
  }
}
```

### Development Mode

In development, auto-sync can be disabled via the `DISABLE_AUTO_SYNC` environment variable to reduce unnecessary Git operations:

```typescript
if (coreConfig.NODE_ENV === 'development' && coreConfig.DISABLE_AUTO_SYNC) {
  return { success: true, message: 'Sync disabled in development mode' };
}
```

### Timeout Handling

Sync operations are wrapped in a `Promise.race` with a timeout to prevent hung processes:

```typescript
const syncPromise = trySyncRepository();
const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('Sync timeout')), SYNC_TIMEOUT_MS);
});
await Promise.race([syncPromise, timeoutPromise]);
```

### SyncResult Type

```typescript
type SyncResult = {
  success: boolean;
  message: string;
  details?: string;
  duration?: number;
};
```

### SyncStatus Type

```typescript
interface SyncStatus {
  isRunning: boolean;
  lastSyncTime: Date | null;
  lastSyncResult: SyncResult | null;
  nextSyncTime: Date | null;
}
```

## FileService

**File:** `lib/services/file.service.ts`

The `FileService` provides generic YAML file read/write operations used by the Git-based services.

```typescript
export class FileService {
  // Read YAML file and parse to object
  async readYaml<T>(filePath: string): Promise<T>;

  // Write object to YAML file
  async writeYaml(filePath: string, data: YamlData): Promise<void>;

  // Check if file exists
  async exists(filePath: string): Promise<boolean>;
}
```

The `createFileService` factory function creates configured instances, and `fileServices` provides a shared singleton.

## Conflict Resolution

When multiple users edit content simultaneously, the Git-based approach handles conflicts at the file level:

1. **Optimistic concurrency**: Changes are applied locally and pushed to the remote
2. **Push failure**: If the remote has newer changes, the push fails
3. **Pull and merge**: The service pulls remote changes and attempts a merge
4. **YAML merge**: Since items are individual files, most changes affect different files and merge cleanly
5. **Conflict detection**: If the same file is modified, the service reports a conflict for manual resolution

The `pendingChanges` queue in each Git service ensures that local changes are not lost during sync operations.

## Content Path Resolution

Content paths are resolved based on the `DATA_REPOSITORY` environment variable and the `getContentPath()` utility. The default content directory is `.content/` at the project root.
