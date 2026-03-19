---
id: tag-types
title: Tag Type Definitions
sidebar_label: Tag Types
sidebar_position: 20
---

# Tag Type Definitions

**Source:** `lib/types/tag.ts`

Tags provide a flat labelling system for items. They are managed through the admin interface and stored in the file-based content system.

## Interfaces

### `TagData`

The base tag data structure.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable identifier used in item YAML files |
| `name` | `string` | Human-readable label shown in UI, 2-50 characters |
| `isActive` | `boolean` | Inactive tags are hidden from public filters but preserved in data |

### `TagWithCount`

Tag data extended with usage statistics.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Payload for creating a new tag.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Payload for updating a tag. The `id` cannot be changed.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Query parameters for listing tags.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Response Types

### `TagListResponse`

Paginated tag list response.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

Single tag operation result.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Validation Rules

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

| Field | Rule |
|-------|------|
| `name` | 2-50 characters |
| `id` | Must be unique across all tags |

## Tags in the Content System

Tags are referenced by ID in item YAML files:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

The tag repository reads tag definitions from the content repository and provides them to the admin UI and filter components.

## Filter Integration

Tags integrate with the client-side filter system through these components:

- `components/filters/components/tags/` -- tag filter UI
- `components/filters/hooks/use-tag-visibility.ts` -- controls which tags appear
- `components/filters/utils/tag-utils.ts` -- helper functions for tag filtering

## Usage Example

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## Related Types

- [Collection Types](./collection-types.md) -- collections as an alternative grouping model
- [Item Types](./item-types.md) -- items that reference tags
- [Permission Types](./permission-types.md) -- `tags:read`, `tags:create`, etc.
