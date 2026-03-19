---
id: tag-repository-service
title: Tag Repository Service
sidebar_label: Tag Repository
sidebar_position: 40
---

# Tag Repository Service

The `TagRepository` class manages tags used to label and categorize items. Tags are stored as YAML data in the Git-backed content repository and provide a flexible taxonomy system complementing the primary category structure.

**Source file:** `template/lib/repositories/tag.repository.ts`

---

## Architecture Overview

```
Admin Tag UI / API Route
        |
  TagRepository           <-- validation, duplicate checks, sorting
        |
  TagGitService            <-- Git read/write via GitHub API
        |
  GitHub Repository        <-- .content/tags.yml
```

Tags are persisted in a single `tags.yml` file within the content repository. The repository layer adds validation, duplicate checking, and sorting on top of the raw Git service.

---

## Class Definition

```ts
export class TagRepository {
  private gitService: any = null;
}
```

### Dependencies

| Import | Purpose |
|--------|---------|
| `TagData` | Tag data model type |
| `CreateTagRequest` | Creation DTO |
| `UpdateTagRequest` | Update DTO |
| `TagListResponse` | Paginated response type |
| `createTagGitService` | Factory for the Git storage service |
| `getContentPath` | Resolves local vs. Vercel content directory |
| `coreConfig` | Centralized configuration service |

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub URL
2. Parsing the URL to extract `owner` and `repo`
3. Configuring with `coreConfig.content.ghToken` and `coreConfig.content.githubBranch`
4. Setting `dataDir` to the dynamic content path (local: `.content`, Vercel: `/tmp/.content`)
5. Setting `tagsFile` to `'tags.yml'`

Throws descriptive errors if required configuration is missing.

---

## Query Methods

### `findAll(): Promise<TagData[]>`

Returns all tags, sorted alphabetically by name.

```ts
async findAll(): Promise<TagData[]>
```

Delegates to `gitService.getAllTags()` and applies the private `sortTags` method.

---

### `findAllPaginated(page?, limit?): Promise<TagListResponse>`

Returns a paginated list of tags.

```ts
async findAllPaginated(page: number = 1, limit: number = 10): Promise<TagListResponse>
```

**Return type:**

```ts
interface TagListResponse {
  tags: TagData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Delegates directly to `gitService.getTagsPaginated`.

---

### `findById(id): Promise<TagData | null>`

Retrieves a single tag by its unique identifier.

```ts
async findById(id: string): Promise<TagData | null>
```

---

### `findByName(name): Promise<TagData | null>`

Retrieves a single tag by its display name.

```ts
async findByName(name: string): Promise<TagData | null>
```

---

## Mutation Methods

### `create(data): Promise<TagData>`

Creates a new tag after validation.

```ts
async create(data: CreateTagRequest): Promise<TagData>
```

**Validation rules** enforced by `validateCreateData`:

| Field | Rule |
|-------|------|
| `id` | Required, non-empty |
| `name` | Required, non-empty |
| `id` format | Must match `/^[a-z0-9-]+$/` (lowercase letters, numbers, hyphens) |
| `id` length | Between 2 and 50 characters |
| `name` length | Between 2 and 50 characters |

---

### `update(id, data): Promise<TagData>`

Updates an existing tag after validation.

```ts
async update(id: string, data: UpdateTagRequest): Promise<TagData>
```

**Validation rules** enforced by `validateUpdateData`:

| Field | Rule |
|-------|------|
| `id` | Required, non-empty |
| `name` (if provided) | Non-empty, between 2 and 50 characters |

---

### `delete(id): Promise<void>`

Permanently removes a tag from the Git repository.

```ts
async delete(id: string): Promise<void>
```

---

## Utility Methods

### `checkDuplicateName(name, excludeId?): Promise<boolean>`

Returns `true` if a tag with the given name already exists. Optionally excludes a specific tag ID (useful during updates to allow keeping the same name).

```ts
async checkDuplicateName(name: string, excludeId?: string): Promise<boolean>
```

---

### `checkDuplicateId(id): Promise<boolean>`

Returns `true` if a tag with the given ID already exists.

```ts
async checkDuplicateId(id: string): Promise<boolean>
```

---

## Private Methods

### `validateCreateData(data: CreateTagRequest): void`

Performs synchronous validation of creation input. Throws descriptive `Error` messages for:
- Missing or empty `id`
- Missing or empty `name`
- Invalid ID format (non-lowercase-alphanumeric-hyphen characters)
- ID length outside 2--50 range
- Name length outside 2--50 range

### `validateUpdateData(id: string, data: UpdateTagRequest): void`

Performs synchronous validation of update input. Throws for:
- Missing or empty `id`
- Empty `name` (if provided)
- Name length outside 2--50 range (if provided)

### `sortTags(tags: TagData[]): TagData[]`

Sorts tags alphabetically by name using `localeCompare`.

---

## Singleton Export

```ts
export const tagRepository = new TagRepository();
```

A pre-instantiated singleton is exported for direct use in API routes and services.

---

## Data Flow

### Creating a Tag

```
1. API route receives CreateTagRequest
2. tagRepository.create(data)
3.   validateCreateData(data)        -- throws on validation failure
4.   gitService.createTag(data)      -- writes to tags.yml, commits, pushes
5. Return TagData
```

### Listing Tags

```
1. API route calls tagRepository.findAll()
2.   gitService.getAllTags()          -- reads tags.yml
3.   sortTags(tags)                  -- alphabetical sort
4. Return TagData[]
```

---

## Usage Example

```ts
import { tagRepository } from '@/lib/repositories/tag.repository';

// List all tags
const tags = await tagRepository.findAll();

// Paginated listing
const page = await tagRepository.findAllPaginated(1, 25);

// Create a new tag
const newTag = await tagRepository.create({
  id: 'open-source',
  name: 'Open Source',
});

// Check for duplicates before creation
const nameExists = await tagRepository.checkDuplicateName('Open Source');
const idExists = await tagRepository.checkDuplicateId('open-source');

// Update a tag
const updated = await tagRepository.update('open-source', {
  name: 'Open Source Software',
});

// Delete a tag
await tagRepository.delete('deprecated-tag');
```

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/services/tag-git.service.ts` | Git storage backend for tags |
| `lib/types/tag.ts` | `TagData`, `CreateTagRequest`, `UpdateTagRequest`, `TagListResponse` types |
| `lib/config/config-service.ts` | Configuration for repository URL and tokens |
| `lib/lib.ts` | `getContentPath()` for content directory resolution |
| `lib/repositories/item.repository.ts` | Items reference tags in their `tags` array |
