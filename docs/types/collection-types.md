---
id: collection-types
title: Collection Type Definitions
sidebar_label: Collection Types
sidebar_position: 15
---

# Collection Type Definitions

**Source:** `types/collection.ts`

Collections are curated groups of items organized by theme. They allow admins to create hand-picked lists such as "Top Picks", "New This Week", or "Best for Enterprise".

## Interfaces

### `Collection`

The primary collection data structure.

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier, 3-50 characters |
| `slug` | `string` | URL-safe version of the name |
| `name` | `string` | Display name, 2-100 characters |
| `description` | `string` | Plain text description, max 500 characters |
| `icon_url` | `string?` | URL to an icon or cover image |
| `item_count` | `number` | Computed count of assigned items |
| `items` | `string[]?` | Item IDs; only populated when requested |
| `isActive` | `boolean` | Controls public visibility |

### `CreateCollectionRequest`

Payload for creating a new collection.

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

Payload for updating an existing collection. All fields except `id` are optional.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Payload for assigning items to a collection.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Query parameters for listing collections.

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## Response Types

### `CollectionsResponse`

Returned when listing multiple collections.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Returned when fetching a single collection with its items.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Validation Rules

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

| Field | Rule |
|-------|------|
| `id` | 3-50 characters, must be unique |
| `name` | 2-100 characters |
| `description` | Maximum 500 characters |

## Usage Example

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## Related Types

- [Item Types](./item-types.md) -- items that belong to collections
- [Tag Types](./tag-types.md) -- tags as an alternative organisational model
