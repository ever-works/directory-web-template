---
id: admin-hooks
title: Admin Hooks Reference
sidebar_label: Admin Hooks
sidebar_position: 1
---

# Admin Hooks Reference

The template provides **18 admin hooks** that power the admin dashboard. Each hook follows a consistent CRUD pattern built on TanStack React Query with automatic cache invalidation and toast notifications.

## Common Pattern

Every admin hook exports:

- **Data** -- Paginated list, total count, page number, totalPages
- **Loading states** -- `isLoading` (initial), `isFetching` (background), `isSubmitting` (mutations)
- **Actions** -- `create*`, `update*`, `delete*` returning `Promise<boolean>`
- **Utility** -- `refetch()`, `refreshData()`

All hooks use a 5-minute `staleTime`, 10-minute `gcTime`, and 3 retries.

## useAdminCategories

Manages content categories with pagination, sorting, and CRUD operations.

```typescript
import { useAdminCategories } from '@/hooks/use-admin-categories';

const {
  categories,      // CategoryWithCount[]
  total,           // number
  page,            // number
  totalPages,      // number
  isLoading,       // boolean
  isSubmitting,    // boolean
  createCategory,  // (data: CreateCategoryRequest) => Promise<boolean>
  updateCategory,  // (id: string, data: UpdateCategoryRequest) => Promise<boolean>
  deleteCategory,  // (id: string, hard?: boolean) => Promise<boolean>
  refetch,
  refreshData,
} = useAdminCategories({
  params: { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc', includeInactive: false },
  enabled: true,
});
```

**Additional exports:** `useCategory({ id })` for single category fetch, `useCategoryMutations()` for mutations-only, `useAllCategories()` for unpaginated list.

**Cache key:** `['admin', 'categories', ...]`

## useAdminClients

Dashboard for client/user management with filtering by status, plan, account type, and provider.

```typescript
import { useAdminClients } from '@/hooks/use-admin-clients';

const {
  clients,        // ClientProfileWithAuth[]
  stats,          // ClientStats (overview, byProvider, byPlan, activity, growth)
  total, page, totalPages, limit,
  isLoading, isSubmitting,
  createClient,   // (data: CreateClientRequest) => Promise<boolean>
  updateClient,   // (id: string, data: UpdateClientRequest) => Promise<boolean>
  deleteClient,   // (id: string) => Promise<boolean>
  refetch, refreshData,
} = useAdminClients({
  params: { search: '', status: 'active', plan: '', page: 1, limit: 10 },
});
```

**Additional exports:** `useClient({ id })`, `useClientMutations()`, `useClientStats()`

## useAdminItems

Full item lifecycle management including review workflow and bulk actions.

```typescript
import { useAdminItems } from '@/hooks/use-admin-items';

const {
  items,           // ItemData[]
  stats,           // { total, draft, pending, approved, rejected }
  total, page, totalPages,
  isLoading, isFetching, isSubmitting,
  isApproving, isRejecting, isDeleting, pendingItemId,
  isBulkProcessing, bulkActionType,
  createItem,      // (data: CreateItemRequest) => Promise<boolean>
  updateItem,      // (id: string, data: UpdateItemRequest) => Promise<boolean>
  deleteItem,      // (id: string) => Promise<boolean>
  reviewItem,      // (id: string, status: 'approved'|'rejected', notes?: string) => Promise<boolean>
  bulkApprove,     // (ids: string[]) => Promise<BulkActionResponse | null>
  bulkReject,      // (ids: string[], reason: string) => Promise<BulkActionResponse | null>
  bulkDelete,      // (ids: string[]) => Promise<BulkActionResponse | null>
  refetch, refreshData,
} = useAdminItems({ page: 1, limit: 20, status: 'pending', sortBy: 'submitted_at' });
```

Per-action loading states (`isApproving`, `isRejecting`, `isDeleting`) enable granular button-level feedback.

## useAdminCollections

CRUD for curated item collections with item assignment.

```typescript
import { useAdminCollections } from '@/hooks/use-admin-collections';

const {
  collections,       // Collection[]
  total, page, totalPages, limit,
  isLoading, isSubmitting,
  createCollection,  // (data: CreateCollectionRequest) => Promise<boolean>
  updateCollection,  // (id: string, data: UpdateCollectionRequest) => Promise<boolean>
  deleteCollection,  // (id: string) => Promise<boolean>
  assignItems,       // (id: string, itemSlugs: string[]) => Promise<boolean>
  fetchAssignedItems, // (id: string) => Promise<Item[]>
  refetch, refreshData,
} = useAdminCollections({ page: 1, limit: 10, search: '' });
```

## useAdminComments

Comment moderation with search and pagination.

```typescript
import { useAdminComments } from '@/hooks/use-admin-comments';

const {
  comments,        // AdminCommentItem[]
  totalPages, totalComments,
  isLoading, isFetching,
  isDeleting,      // string | null (ID of comment being deleted)
  deleteComment,   // (id: string) => Promise<boolean>
  refetch, refreshData,
} = useAdminComments({ page: 1, limit: 10, search: '' });
```

## useAdminFeaturedItems

Manage featured item display with ordering and expiration.

```typescript
import { useAdminFeaturedItems } from '@/hooks/use-admin-featured-items';

const {
  featuredItems,     // FeaturedItem[]
  allItems,          // ItemData[] (for assignment picker)
  filteredItems,     // FeaturedItem[] (after local filtering)
  isLoading, isSubmitting,
  currentPage, totalPages, totalItems,
  searchTerm, showActiveOnly,
  setSearchTerm, setShowActiveOnly,
  addFeaturedItem,   // (data) => Promise<boolean>
  updateFeaturedItem,// (id, data) => Promise<boolean>
  removeFeaturedItem,// (id) => Promise<boolean>
  reorderItems,      // (orderedIds: string[]) => Promise<boolean>
  refetch, refreshData,
} = useAdminFeaturedItems({ page: 1, limit: 20 });
```

## Additional Admin Hooks

| Hook | Purpose | Key Returns |
|------|---------|-------------|
| `useAdminCompanies` | Company management | companies, create/update/delete |
| `useAdminFilters` | Filter configuration | filters, create/update/delete |
| `useAdminNotifications` | Notification management | notifications, markRead, markAllRead |
| `useAdminReports` | Content report moderation | reports, resolveReport, dismissReport |
| `useAdminRoles` | Role-based access control | roles, create/update/delete |
| `useAdminSponsorAds` | Sponsor advertisement CRUD | sponsorAds, create/update/delete |
| `useAdminStats` | Dashboard statistics | stats (items, users, revenue) |
| `useAdminTags` | Tag management | tags, create/update/delete |
| `useAdminUsers` | User account management | users, updateRole, suspendUser |

## Cache Invalidation Strategy

Admin hooks invalidate at the namespace level. For example, when `useAdminItems` creates an item:

```typescript
// On mutation success:
queryClient.invalidateQueries({ queryKey: ['admin', 'items'] });
```

This invalidates all queries under `['admin', 'items']`, including list views and stats. The `refreshData()` helper also calls `serverClient.clearCache()` to bust any HTTP-level caching before invalidating React Query caches.

## Error Handling

All mutations follow a try/catch pattern returning `boolean`:

```typescript
const handleCreate = useCallback(async (data) => {
  try {
    await mutation.mutateAsync(data);
    return true;
  } catch {
    return false;   // toast.error() already fired in onError
  }
}, [mutation]);
```

Consumers can use the boolean result for conditional UI updates (e.g., closing modals on success).
