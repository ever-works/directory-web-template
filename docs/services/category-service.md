---
id: category-service
title: "Category Service"
sidebar_label: "Category Service"
sidebar_position: 21
---

# Category Service

The category system manages hierarchical content classification through a Git-backed YAML storage layer. Categories are stored in `.content/categories.yml` and synchronized with a remote GitHub repository. The system supports CRUD operations, translations, backups, and background sync with retry logic.

## Architecture Overview

Category management is split across two service classes following the Single Responsibility Principle:

| Service | File | Responsibility |
|---------|------|---------------|
| **CategoryFileService** | `lib/services/category-file.service.ts` | File I/O operations (read/write YAML) |
| **CategoryGitService** | `lib/services/category-git.service.ts` | Full CRUD with Git commit/push and sync |

Both services operate on the same YAML files but `CategoryGitService` adds version control.

## CategoryData Type

Categories follow this structure defined in `lib/types/category.ts`:

```ts
interface CategoryData {
  id: string;
  name: string;
}
```

## CategoryFileService

The `CategoryFileService` at `lib/services/category-file.service.ts` handles direct file operations on categories.

### Reading Categories

```ts
const { categoryFileService } = require('@/lib/services/category-file.service');

// Read all categories (English)
const categories = await categoryFileService.readCategories();

// Read categories with translations
const frenchCategories = await categoryFileService.readCategories('fr');
```

The service reads from `categories.yml` in the content directory. When a language code is provided, it looks for a translation file like `categories.fr.yml` and merges translations by matching `id` fields.

### Writing Categories

```ts
await categoryFileService.writeCategories(updatedCategories);
```

Categories are serialized to YAML with controlled formatting:

```ts
const yamlContent = yaml.stringify(categories, {
  indent: 2,
  lineWidth: 0,       // Disable line wrapping
  minContentWidth: 0,
});
```

### Backup

```ts
const backupPath = await categoryFileService.createBackup();
// Returns: .content/categories.backup.2026-01-15T10-30-00-000Z.yml
```

### Singleton Access

The module exports a singleton instance:

```ts
export const categoryFileService = new CategoryFileService();
```

## CategoryGitService

The `CategoryGitService` at `lib/services/category-git.service.ts` provides full CRUD operations with Git integration using `isomorphic-git`.

### Initialization

```ts
import { createCategoryGitService } from '@/lib/services/category-git.service';

const service = await createCategoryGitService({
  owner: 'your-org',
  repo: 'your-data-repo',
  token: process.env.GITHUB_TOKEN,
  branch: 'main',
}, './.content');
```

Initialization performs:
1. Creates the data directory if missing
2. Clones or pulls the remote repository
3. Ensures `categories.yml` exists

### CRUD Operations

**Create:**

```ts
const newCategory = await service.createCategory({
  id: 'productivity',
  name: 'Productivity',
});
```

Creates a new category after checking for duplicate IDs and names.

**Read:**

```ts
const allCategories = await service.readCategories();
```

**Update:**

```ts
const updated = await service.updateCategory({
  id: 'productivity',
  name: 'Productivity Tools',
});
```

**Delete:**

```ts
await service.deleteCategory('productivity');
```

All write operations automatically commit and push to the remote repository.

### Git Operations Flow

When a write operation occurs:

1. Categories are written to the local YAML file
2. The file is staged with `git add`
3. A commit is created with timestamp: `Update categories - 2026-01-15T10:30:00.000Z`
4. Changes are pushed to the remote repository

If Git operations fail, the local file is still saved and changes are queued for background sync.

### Background Sync and Retry

When a push fails, the service schedules background retries:

```ts
private scheduleBackgroundSync(): void {
  setTimeout(() => {
    this.performBackgroundSync();
  }, 30000); // Initial retry after 30 seconds
}
```

The retry uses exponential backoff with a maximum of 3 retries:
- Attempt 1: 30 seconds
- Attempt 2: 60 seconds
- Attempt 3: 120 seconds
- Maximum delay: 5 minutes

### Sync Status

```ts
const status = await service.getSyncStatus();
// Returns:
// {
//   hasPendingChanges: boolean;
//   syncInProgress: boolean;
//   lastSyncAttempt?: string;
//   retryCount?: number;
// }
```

### Repository Status

```ts
const repoStatus = await service.getStatus();
// Returns:
// {
//   repoUrl: string;
//   branch: string;
//   lastSync: string;
//   categoriesCount: number;
// }
```

### Cleanup

When shutting down, call `cleanup()` to stop retry timers:

```ts
service.cleanup();
```

## Translation Support

Categories support multi-language translations through separate YAML files:

- `categories.yml` -- English (default)
- `categories.fr.yml` -- French translations
- `categories.es.yml` -- Spanish translations

Translation files contain the same `id` fields with localized `name` values. The `CategoryFileService.readCategories(lang)` method merges translations automatically.

## API Integration

Categories are typically managed through admin API routes:

```ts
// GET /api/admin/categories
export async function GET() {
  const categories = await categoryFileService.readCategories();
  return Response.json(categories);
}

// POST /api/admin/categories
export async function POST(request: Request) {
  const data = await request.json();
  const category = await gitService.createCategory(data);
  return Response.json(category, { status: 201 });
}

// PUT /api/admin/categories/[id]
export async function PUT(request: Request) {
  const data = await request.json();
  const updated = await gitService.updateCategory(data);
  return Response.json(updated);
}

// DELETE /api/admin/categories/[id]
export async function DELETE(request: Request, { params }) {
  await gitService.deleteCategory(params.id);
  return Response.json({ success: true });
}
```

## Related Files

| File | Description |
|------|-------------|
| `lib/services/category-file.service.ts` | File-based category I/O |
| `lib/services/category-git.service.ts` | Git-backed category CRUD |
| `lib/types/category.ts` | Category type definitions |
| `.content/categories.yml` | Category data storage |
