---
id: tag-service
title: "Tag Service"
sidebar_label: "Tag Service"
sidebar_position: 22
---

# Tag Service

The tag system provides CRUD operations for managing tags that can be assigned to items. Tags are stored in `tags.yml` within the Git-based content repository and automatically synchronized with the remote through `isomorphic-git`.

## Architecture

Tags are managed by the `TagGitService` at `lib/services/tag-git.service.ts`. Like the category service, it writes to local YAML files and commits/pushes changes to GitHub with background retry logic.

## TagData Type

```ts
interface TagData {
  id: string;
  name: string;
  isActive: boolean;
}
```

Each tag has a unique `id`, a display `name`, and an `isActive` flag for soft-disabling tags without deletion.

## TagGitService

### Configuration

```ts
export interface TagGitServiceConfig {
  owner: string;
  repo: string;
  token: string;
  branch: string;
  dataDir: string;
  tagsFile: string;
}
```

### Initialization

```ts
import { createTagGitService } from '@/lib/services/tag-git.service';

const tagService = await createTagGitService({
  owner: 'your-org',
  repo: 'your-data-repo',
  token: process.env.GITHUB_TOKEN,
  branch: 'main',
  dataDir: './.content',
  tagsFile: 'tags.yml',
});
```

Initialization ensures the data directory exists and creates an empty `tags.yml` if it does not exist.

### CRUD Operations

**Create a Tag:**

```ts
const tag = await tagService.createTag({
  id: 'open-source',
  name: 'Open Source',
  isActive: true,
});
```

Validates against duplicate IDs and names (case-insensitive) before creating.

**Read Tags:**

```ts
// Get all tags
const allTags = await tagService.getAllTags();

// Get a single tag by ID
const tag = await tagService.findTagById('open-source');

// Get a tag by name (case-insensitive)
const tag = await tagService.findTagByName('Open Source');
```

The `readTags()` method ensures backward compatibility by defaulting `isActive` to `true` for older tags that may not have the field.

**Update a Tag:**

```ts
const updated = await tagService.updateTag('open-source', {
  name: 'Open-Source Software',
  isActive: true,
});
```

Only provided fields are updated; the `id` is preserved.

**Delete a Tag:**

```ts
await tagService.deleteTag('open-source');
```

### Paginated Queries

```ts
const result = await tagService.getTagsPaginated(1, 10);
// Returns:
// {
//   tags: TagData[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }
```

### Duplicate Checking

```ts
// Check if a tag name already exists (optionally excluding a specific ID)
const isDuplicate = await tagService.checkDuplicateName('Open Source', 'exclude-this-id');

// Check if a tag ID already exists
const idExists = await tagService.checkDuplicateId('open-source');
```

## Git Integration

### Write Flow

When tags are written via `writeTags()`:

1. Tags are normalized to ensure required fields (`id`, `name`, `isActive`)
2. The array is serialized to YAML
3. The file is written to disk at `tags.yml`
4. Git operations execute: `add` -> `commit` -> `push`

```ts
async writeTags(tags: TagData[]): Promise<void> {
  const normalizedTags = tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    isActive: tag.isActive,
  }));
  const content = yaml.stringify(normalizedTags);
  await fs.writeFile(filePath, content, 'utf-8');
  await this.commitAndPush('Update tags');
}
```

### Background Sync

If Git operations fail, the service stores pending changes and schedules retries:

- Retry schedule uses exponential backoff: 30s, 60s, 120s (max 5 minutes)
- Maximum of 3 retry attempts
- Previous retry timers are cleared to prevent memory leaks

```ts
const syncStatus = await tagService.getSyncStatus();
// {
//   hasPendingChanges: boolean;
//   syncInProgress: boolean;
//   lastSyncAttempt?: string;
//   retryCount?: number;
// }
```

### Cleanup

Stop background retries when shutting down:

```ts
tagService.cleanup();
```

## YAML Storage Format

Tags are stored in `tags.yml` as a YAML array:

```yaml
- id: open-source
  name: Open Source
  isActive: true
- id: saas
  name: SaaS
  isActive: true
- id: deprecated-tool
  name: Deprecated Tool
  isActive: false
```

## API Integration

Tags are managed through admin API routes:

```ts
// GET /api/admin/tags
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const result = await tagService.getTagsPaginated(page, limit);
  return Response.json(result);
}

// POST /api/admin/tags
export async function POST(request: Request) {
  const data = await request.json();
  const tag = await tagService.createTag(data);
  return Response.json(tag, { status: 201 });
}
```

## Tag Assignment to Items

Tags are assigned to items through the item schema. Each item has a `tags` array:

```ts
// In item YAML
tags:
  - open-source
  - saas
  - productivity
```

The `clientCreateItemSchema` validates tags as an array of non-empty strings:

```ts
tags: z.array(z.string().min(1)).optional().default([]),
```

## Active/Inactive Tags

The `isActive` field allows administrators to disable tags without deleting them:

- **Active tags** appear in tag selection dropdowns and filter lists
- **Inactive tags** are hidden from new assignments but remain on existing items
- Items with inactive tags continue to display them

## Related Files

| File | Description |
|------|-------------|
| `lib/services/tag-git.service.ts` | Tag CRUD with Git sync |
| `lib/types/tag.ts` | Tag type definitions |
| `.content/tags.yml` | Tag data storage |
| `lib/validations/client-item.ts` | Tag validation in item schemas |
