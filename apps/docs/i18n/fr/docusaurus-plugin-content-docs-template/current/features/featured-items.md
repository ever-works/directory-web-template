---
id: featured-items
title: Système d'éléments en vedette
sidebar_label: Éléments en vedette
sidebar_position: 2
---

# Système d'éléments en vedette

The featured items system allows administrators to highlight specific items on the site with custom ordering, expiration dates, and activation controls.

## Data Model

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  itemDescription?: string;
  featuredOrder: number;        // Display position
  featuredUntil?: string;       // Expiration date (ISO string)
  isActive: boolean;
  featuredBy: string;           // Admin user ID
  featuredAt: string;           // When it was featured
  createdAt: string;
  updatedAt: string;
}
```

## Admin Management

### useAdminFeaturedItems Hook

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  // Data
  featuredItems,        // FeaturedItem[]
  allItems,             // ItemData[] (for picker)
  filteredItems,        // FeaturedItem[] (after local search/filter)

  // State
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,

  // Actions
  setSearchTerm,        // (term: string) => void
  setShowActiveOnly,    // (active: boolean) => void
  addFeaturedItem,      // (data) => Promise<boolean>
  updateFeaturedItem,   // (id, data) => Promise<boolean>
  removeFeaturedItem,   // (id) => Promise<boolean>
  reorderItems,         // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

### API Response

The featured items API returns paginated results with navigation metadata:

```typescript
interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Ordering

Featured items support drag-and-drop reordering through the `reorderItems` function, which accepts an array of IDs in the desired display order:

```typescript
await reorderItems(['item-3', 'item-1', 'item-2']);
```

The `featuredOrder` field determines the display position on the frontend.

## Expiration

Items can be featured with an optional expiration date (`featuredUntil`). When set:
- The item is automatically excluded from display after the expiration date
- Admin can see expired items by toggling the `showActiveOnly` filter
- Manual removal is also supported via `removeFeaturedItem`

## Client-Side Display

### useFeaturedItemsClient Hook

The public-facing hook fetches active featured items for display:

```typescript
import { useFeaturedItemsClient } from '@/hooks/use-featured-items-client';

const { featuredItems, isLoading } = useFeaturedItemsClient();
```

### useFeatureItemsSection Hook

Higher-level hook that provides section-level display logic:

```typescript
import { useFeatureItemsSection } from '@/hooks/use-feature-items-section';

const {
  items,
  isLoading,
  showSection,     // boolean -- whether to render the section
} = useFeatureItemsSection();
```

## Feature Flag

Featured items respect the `featuredItems` feature flag:

```typescript
const flags = getFeatureFlags();
if (flags.featuredItems) {
  // Render featured items section
}
```

The feature is automatically disabled when `DATABASE_URL` is not configured.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/featured-items` | List featured items (paginated) |
| POST | `/api/admin/featured-items` | Add a featured item |
| PUT | `/api/admin/featured-items/:id` | Update featured item settings |
| DELETE | `/api/admin/featured-items/:id` | Remove from featured |
| PUT | `/api/admin/featured-items/reorder` | Reorder featured items |
| GET | `/api/featured-items` | Public: get active featured items |