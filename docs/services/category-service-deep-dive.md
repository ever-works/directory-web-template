---
id: category-service-deep-dive
title: Category Service Deep Dive
sidebar_label: Category Service (Deep Dive)
sidebar_position: 52
---

# Category Service Deep Dive

## Overview

The Category Service manages taxonomy data for items. Categories are stored as **YAML files** in the Git-backed content repository. The template provides two service classes with different persistence strategies:

- **`CategoryFileService`** -- Reads/writes categories from a local YAML file with i18n translation support. Server-only.
- **`CategoryGitService`** -- Full Git-backed CRUD with clone, pull, commit, and push to GitHub. Includes background sync and retry logic.

## Source Files

| File | Path |
|------|------|
| File Service | `template/lib/services/category-file.service.ts` |
| Git Service | `template/lib/services/category-git.service.ts` |
| Types | `template/lib/types/category.ts` |

## Architecture

```
API Routes / Server Components
        |
  ┌─────┴──────┐
  │             │
CategoryFileService    CategoryGitService
  │                         │
categories.yml         categories.yml
(local read/write)    (Git clone/pull/commit/push)
                           │
                    GitHub Remote
```

Both services operate on `categories.yml` in the `.content` directory. The file service is a simple read/write layer, while the Git service adds version control.

## CategoryFileService

### Constructor

Initializes paths based on `getContentPath()`:
- `contentPath` -- Base content directory (`.content` locally, `/tmp/.content` on Vercel)
- `categoriesDir` -- `{contentPath}/categories`
- `categoriesFilePath` -- `{contentPath}/categories.yml`

### `readCategories(lang?: string): Promise<CategoryData[]>`

Reads categories from the YAML file. If a `lang` parameter is provided (and is not `en`), applies translations from a language-specific file.

**Translation resolution:**
1. Read base `categories.yml`
2. If `lang` is provided, look for `categories.{lang}.yml`
3. Merge translations by matching `id` field

### `writeCategories(categories: CategoryData[]): Promise<void>`

Serializes the categories array to YAML and writes to the file. Uses `yaml.stringify` with:
- `indent: 2`
- `lineWidth: 0` (disabled line wrapping)
- `minContentWidth: 0`

### `categoriesFileExists(): Promise<boolean>`

Checks if the `categories.yml` file exists on disk.

### `createBackup(): Promise<string>`

Creates a timestamped backup of the current categories file. Returns the backup file path.

**Format:** `categories.backup.{ISO-timestamp}.yml`

## CategoryGitService

### Constructor

```typescript
new CategoryGitService({
  dataDir: string;
  categoriesFile: string;
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
2. Syncs with remote (clone or pull)
3. Ensures the categories file exists (creates empty array if missing)

### `readCategories(): Promise<CategoryData[]>`

Reads and parses `categories.yml`. Returns empty array on error.

### `writeCategories(categories: CategoryData[]): Promise<void>`

Writes categories to YAML, then performs Git add, commit, and push. On Git failure, saves locally and schedules background sync.

### `createCategory(data: CreateCategoryRequest): Promise<CategoryData>`

Creates a new category. Validates:
- No duplicate ID
- No duplicate name (case-insensitive)

### `updateCategory(data: UpdateCategoryRequest): Promise<CategoryData>`

Updates an existing category by ID. Checks for duplicate name conflicts.

### `deleteCategory(id: string): Promise<void>`

Removes a category by filtering it from the array and writing the updated list.

### `createBackup(): Promise<void>`

Creates a timestamped backup YAML file in the data directory.

### `getStatus(): Promise<RepoStatus>`

Returns repository URL, branch, last sync time, and category count.

### `getGitStatus(): Promise<any>`

Returns the raw `isomorphic-git` status matrix for the repository.

### `getSyncStatus(): Promise<SyncStatus>`

Returns pending changes flag, sync-in-progress flag, and retry count.

### `cleanup(): void`

Stops background sync timers and resets retry state.

## Background Sync and Retry

The Git service implements exponential backoff for failed pushes:

1. On push failure: schedule retry in 30 seconds
2. Retry 1: 30s delay
3. Retry 2: 60s delay
4. Retry 3: 120s delay (max 5 minutes)
5. After 3 retries: stop and log error

The `syncInProgress` flag prevents concurrent sync operations.

## Factory Function

```typescript
export async function createCategoryGitService(
  gitConfig: GitConfig,
  dataDir: string = './.content'
): Promise<CategoryGitService>
```

Creates and initializes a `CategoryGitService` instance with a default categories file name of `categories.yml`.

## Error Handling

- **File not found:** `CategoryFileService.readCategories` returns empty array for `ENOENT` errors
- **Git sync failures:** Logged but do not prevent local file saves
- **Duplicate names/IDs:** Throw descriptive `Error`
- **Translation failures:** Logged with `console.warn`, original categories returned

## Usage Examples

```typescript
// Using the file service (singleton)
import { categoryFileService } from '@/lib/services/category-file.service';

const categories = await categoryFileService.readCategories('fr');
await categoryFileService.writeCategories(updatedCategories);

// Using the Git service
import { createCategoryGitService } from '@/lib/services/category-git.service';

const gitService = await createCategoryGitService({
  owner: 'my-org',
  repo: 'my-data',
  token: process.env.GH_TOKEN!,
});

const newCat = await gitService.createCategory({
  id: 'web-tools',
  name: 'Web Tools',
});

await gitService.updateCategory({
  id: 'web-tools',
  name: 'Web Development Tools',
});

await gitService.deleteCategory('web-tools');
```
