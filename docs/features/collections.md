---
id: collections
title: Collections System
sidebar_label: Collections
sidebar_position: 1
---

# Collections System

Collections allow administrators to curate groups of items for display on the site. The system stores collection data in the Git-based CMS repository and provides CRUD operations through the admin dashboard.

## Architecture

```
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────────────┐
│  Admin Dashboard │────▶│  /api/admin/collections│────▶│  CollectionRepository│
│  (React)         │     │  (API Routes)          │     │  (Git-backed)        │
└─────────────────┘     └───────────────────────┘     └──────────┬──────────┘
                                                                  │
                                                       ┌──────────▼──────────┐
                                                       │  CollectionGitService│
                                                       │  (GitHub API)        │
                                                       └─────────────────────┘
```

Collections are stored as files in the Git-based CMS repository (configured via `DATA_REPOSITORY`), using the `CollectionGitService` for read/write operations through the GitHub API.

## Data Model

```typescript
interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  items: string[];          // Array of item slugs
  item_count: number;       // Computed from items array
  displayOrder?: number;
  created_at: string;
  updated_at: string;
}
```

## CollectionRepository

Located at `lib/repositories/collection.repository.ts`, the repository provides:

```typescript
class CollectionRepository {
  async findAll(options?: CollectionListOptions): Promise<Collection[]>;
  async findById(id: string): Promise<Collection | null>;
  async findBySlug(slug: string): Promise<Collection | null>;
  async create(data: CreateCollectionRequest): Promise<Collection>;
  async update(id: string, data: UpdateCollectionRequest): Promise<Collection>;
  async delete(id: string): Promise<void>;
  async assignItems(id: string, itemSlugs: string[]): Promise<void>;
}
```

### List Options

```typescript
interface CollectionListOptions {
  search?: string;           // Filter by name
  includeInactive?: boolean; // Include inactive collections
  sortBy?: 'name' | 'item_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

## Admin Hook

```typescript
import { useAdminCollections } from '@/hooks/use-admin-collections';

const {
  collections,        // Collection[]
  total, page, totalPages, limit,
  isLoading, isSubmitting,
  createCollection,   // (data: CreateCollectionRequest) => Promise<boolean>
  updateCollection,   // (id: string, data: UpdateCollectionRequest) => Promise<boolean>
  deleteCollection,   // (id: string) => Promise<boolean>
  assignItems,        // (id: string, itemSlugs: string[]) => Promise<boolean>
  fetchAssignedItems, // (id: string) => Promise<Item[]>
  refetch, refreshData,
} = useAdminCollections({ page: 1, limit: 10, search: '' });
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/collections` | List collections (paginated) |
| POST | `/api/admin/collections` | Create a new collection |
| PUT | `/api/admin/collections/:id` | Update a collection |
| DELETE | `/api/admin/collections/:id` | Delete a collection |
| GET | `/api/admin/collections/:id/items` | Get assigned items |
| POST | `/api/admin/collections/:id/items` | Assign items to collection |

## Client-Side Display

The `useCollectionsExists` hook checks whether any active collections exist, used for conditional rendering:

```typescript
import { useCollectionsExists } from '@/hooks/use-collections-exists';
const { exists, isLoading } = useCollectionsExists();
```

## Configuration

Collections require the following environment variables:

```bash
DATA_REPOSITORY=https://github.com/owner/repo   # Git CMS repository
GH_TOKEN=ghp_xxx                                  # GitHub API token
GITHUB_BRANCH=main                                # Branch for collection data
```

The `CollectionRepository` parses the `DATA_REPOSITORY` URL to extract the GitHub owner and repo, then uses the token for API authentication.
