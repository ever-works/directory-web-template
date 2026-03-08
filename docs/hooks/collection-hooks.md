---
id: collection-hooks
title: "Collection Hooks"
sidebar_label: "Collection Hooks"
sidebar_position: 17
---

# Collection Hooks

Collections are curated groups of items organized by theme (e.g., "Top Picks", "New Arrivals"). The template provides hooks for full CRUD management of collections from the admin panel, user-facing favorites with optimistic updates, and lightweight existence checks.

## Source Locations

```
hooks/use-admin-collections.ts    # Admin CRUD operations
hooks/use-favorites.ts            # User favorites (add/remove/toggle)
hooks/use-collections-exists.ts   # Check if collections exist
types/collection.ts               # Shared type definitions
```

## Type Definitions

### Collection

```ts
interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url?: string;
  item_count: number;
  items?: string[];       // Array of item IDs assigned to this collection
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}
```

### Favorite

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Request Types

```ts
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  icon_url?: string;
  isActive?: boolean;
}

interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}

interface AssignCollectionItemsRequest {
  itemIds: string[];
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### Validation Constants

```ts
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
};
```

---

## useAdminCollections

Full CRUD hook for managing collections from the admin panel.

### Import

```tsx
import { useAdminCollections } from '@/hooks/use-admin-collections';
```

### Parameters

```ts
interface CollectionListParams {
  page?: number;
  limit?: number;
  search?: string;
  includeInactive?: boolean;
  sortBy?: 'name' | 'item_count' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}
```

### Return Value

```ts
const {
  // Data
  collections,        // Collection[]
  total,              // number - total count across all pages
  page,               // number - current page
  totalPages,         // number
  limit,              // number - items per page

  // Loading states
  isLoading,          // boolean - initial query in progress
  isSubmitting,       // boolean - any mutation in progress

  // Actions
  createCollection,   // (data: CreateCollectionRequest) => Promise<boolean>
  updateCollection,   // (id: string, data: UpdateCollectionRequest) => Promise<boolean>
  deleteCollection,   // (id: string) => Promise<boolean>
  assignItems,        // (id: string, itemSlugs: string[]) => Promise<boolean>
  fetchAssignedItems, // (id: string) => Promise<Array<{ id, name, slug }>>
  refetch,            // () => void
  refreshData,        // () => void - clears API cache + invalidates queries
} = useAdminCollections(params);
```

### Query Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `staleTime` | 5 minutes | Data considered fresh |
| `gcTime` | 10 minutes | Cache retained after unmount |

### Usage Example

```tsx
import { useAdminCollections } from '@/hooks/use-admin-collections';

function CollectionManager() {
  const {
    collections,
    isLoading,
    isSubmitting,
    createCollection,
    updateCollection,
    deleteCollection,
    assignItems,
    totalPages,
  } = useAdminCollections({ page: 1, limit: 10, sortBy: 'name' });

  const handleCreate = async () => {
    const success = await createCollection({
      id: 'top-picks-2024',
      name: 'Top Picks 2024',
      description: 'Our curated selection of the best items this year',
      isActive: true,
    });
    // Toast notifications are handled automatically by the hook
  };

  const handleAssignItems = async (collectionId: string) => {
    const success = await assignItems(collectionId, [
      'item-slug-1',
      'item-slug-2',
      'item-slug-3',
    ]);
  };

  if (isLoading) return <Spinner />;

  return (
    <div>
      <button onClick={handleCreate} disabled={isSubmitting}>
        Create Collection
      </button>
      {collections.map((col) => (
        <div key={col.id}>
          <h3>{col.name}</h3>
          <span>{col.item_count} items</span>
          <button onClick={() => deleteCollection(col.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### Cache Invalidation

The `refreshData` method performs two-layer cache clearing:

1. `apiUtils.clearCache()` -- clears the HTTP-level API cache
2. `queryClient.invalidateQueries()` -- invalidates all React Query collection keys

All mutations (create, update, delete, assign items) call `invalidateCollections()` on success, which triggers both layers.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/collections` | List collections with pagination and filters |
| POST | `/api/admin/collections` | Create a new collection |
| PUT | `/api/admin/collections/{id}` | Update a collection |
| DELETE | `/api/admin/collections/{id}` | Delete a collection |
| GET | `/api/admin/collections/{id}/items` | Fetch assigned items |
| POST | `/api/admin/collections/{id}/items` | Assign items to a collection |

---

## useFavorites

User-facing hook for managing personal favorites with full optimistic update support.

### Import

```tsx
import { useFavorites } from '@/hooks/use-favorites';
```

### Return Value

```ts
const {
  favorites,       // Favorite[] - all user favorites
  isLoading,       // boolean
  error,           // Error | null
  refetch,         // () => void
  isFavorited,     // (itemSlug: string) => boolean
  toggleFavorite,  // (itemData: AddFavoriteRequest) => void
  addFavorite,     // mutation function
  removeFavorite,  // mutation function
  isAdding,        // boolean
  isRemoving,      // boolean
} = useFavorites();
```

### Feature Flag Gate

The favorites query is only enabled when **both** conditions are met:

```ts
enabled: !!user?.id && features.favorites
```

This means favorites are controlled by the `favorites` feature flag. If the flag is disabled, the query never fires and `favorites` returns an empty array.

### Optimistic Updates

The `useFavorites` hook implements full optimistic update patterns for both add and remove operations.

**Adding a favorite** -- a temporary favorite object is inserted into the cache immediately:

```ts
// Inside onMutate:
const optimisticFavorite: Favorite = {
  id: `temp-${Date.now()}`,   // temporary ID
  userId: user?.id || '',
  itemSlug: newFavorite.itemSlug,
  itemName: newFavorite.itemName,
  // ...
};
return [...old, optimisticFavorite];
```

On success, the temporary entry is replaced with the real server response. On error, the cache is rolled back to the previous snapshot.

**Removing a favorite** -- the item is filtered out of the cache immediately. If the server request fails, the previous state is restored.

### Toggle Pattern

The `toggleFavorite` helper checks the current state and calls the appropriate mutation:

```tsx
const toggleFavorite = (itemData: AddFavoriteRequest) => {
  if (isFavorited(itemData.itemSlug)) {
    removeFavoriteMutation.mutate(itemData.itemSlug);
  } else {
    addFavoriteMutation.mutate(itemData);
  }
};
```

### Usage Example

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function FavoriteButton({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  const isFav = isFavorited(item.slug);
  const isProcessing = isAdding || isRemoving;

  return (
    <button
      onClick={() =>
        toggleFavorite({
          itemSlug: item.slug,
          itemName: item.name,
          itemIconUrl: item.icon,
          itemCategory: item.category,
        })
      }
      disabled={isProcessing}
    >
      {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
    </button>
  );
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/favorites` | Fetch all user favorites |
| POST | `/api/favorites` | Add a favorite |
| DELETE | `/api/favorites/{itemSlug}` | Remove a favorite |

---

## useCollectionsExists

A lightweight hook that checks whether any collections exist in the database. Unlike the other hooks, this reads from the `SettingsProvider` context rather than making an API call, so it has zero loading delay.

### Import

```tsx
import { useCollectionsExists } from '@/hooks/use-collections-exists';
```

### Return Value

```ts
const {
  data,        // { exists: boolean } | undefined
  isLoading,   // always false (reads from context)
  error,       // always null
} = useCollectionsExists();
```

### Usage Example

```tsx
import { useCollectionsExists } from '@/hooks/use-collections-exists';

function CollectionsSection() {
  const { data } = useCollectionsExists();

  if (!data?.exists) return null;

  return (
    <section>
      <h2>Browse Collections</h2>
      {/* Render collection grid */}
    </section>
  );
}
```

This hook is useful for conditionally rendering collection-related UI without incurring an API request. It reads the `hasCollections` flag from the `useSettings()` context which is populated during server-side rendering.

---

## Collections vs. Favorites

The template distinguishes between two item grouping mechanisms:

| Feature | Collections | Favorites |
|---------|-------------|-----------|
| **Managed by** | Admins | Individual users |
| **Scope** | Global (visible to all users) | Per-user (private) |
| **Purpose** | Curated editorial groupings | Personal bookmarks |
| **Item assignment** | Admin assigns item slugs | User toggles on/off |
| **Data model** | `Collection` with `items[]` | `Favorite` with `itemSlug` |
| **Feature flag** | None (always available if created) | Gated by `features.favorites` |
| **Hook** | `useAdminCollections` | `useFavorites` |

Both systems use the same underlying item slug identifiers, so an item can be both in a curated collection and in a user's personal favorites list.
