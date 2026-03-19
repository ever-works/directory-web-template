---
id: item-hooks
title: Item Management Hooks
sidebar_label: Item Management Hooks
sidebar_position: 12
---

# Item Management Hooks

Hooks for managing directory items: company associations, audit history, deleted item recovery, featured item sections, and sponsor ad management.

## useItemCompany

Manages the association between items and companies. Provides fetching, assigning, and removing company assignments with optimistic updates and toast notifications.

```
useItemCompany(options: UseItemCompanyOptions): UseItemCompanyReturn
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `itemSlug` | `string` | -- | The item slug to manage (required) |
| `enabled` | `boolean` | `true` | Whether to fetch the current assignment |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `company` | `Company \| null` | Currently assigned company |
| `isLoading` | `boolean` | Whether the company assignment is loading |
| `isAssigning` | `boolean` | Whether an assign operation is in progress |
| `isRemoving` | `boolean` | Whether a remove operation is in progress |
| `assignCompany` | `(companyId: string) => Promise<boolean>` | Assign a company; returns success status |
| `removeCompany` | `() => Promise<boolean>` | Remove the company assignment |
| `refetch` | `() => void` | Re-fetch the current assignment |

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['item-company', itemSlug]` |
| Stale time | 5 minutes |
| GC time | 10 minutes |
| Retry | 2 times |

```tsx
import { useItemCompany } from '@/hooks/use-item-company';

function CompanyAssignment({ itemSlug }) {
  const { company, isLoading, assignCompany, removeCompany, isAssigning } =
    useItemCompany({ itemSlug });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {company ? (
        <div>
          <p>Company: {company.name}</p>
          <button onClick={removeCompany}>Remove</button>
        </div>
      ) : (
        <CompanySelector
          onSelect={(id) => assignCompany(id)}
          disabled={isAssigning}
        />
      )}
    </div>
  );
}
```

---

## useItemHistory

Fetches paginated audit history for an item, including status changes, field modifications, and performer information.

```
useItemHistory(params: UseItemHistoryParams): UseQueryResult<ItemHistoryData>
```

### Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `itemId` | `string` | -- | Item ID to fetch history for (required) |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `20` | Items per page |
| `actionFilter` | `ItemAuditActionValues[]` | -- | Filter by specific action types |
| `enabled` | `boolean` | `true` | Whether to enable the query |

### ItemAuditLogEntry Shape

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Log entry ID |
| `itemId` | `string` | Associated item ID |
| `itemName` | `string` | Item name at time of action |
| `action` | `ItemAuditActionValues` | Action type (create, update, approve, reject, etc.) |
| `previousStatus` | `string \| null` | Status before the action |
| `newStatus` | `string \| null` | Status after the action |
| `changes` | `Record<string, { old, new }>` | Field-level change details |
| `performedBy` | `string \| null` | User ID who performed the action |
| `performedByName` | `string \| null` | Display name of the performer |
| `notes` | `string \| null` | Optional notes about the action |
| `createdAt` | `string` | ISO timestamp of the action |
| `performer` | `{ id, email } \| null` | Performer user data |

### Query Configuration

| Setting | Value |
|---------|-------|
| Query key | `['admin', 'items', 'history', itemId, { page, actionFilter }]` |
| Stale time | 30 seconds |
| Placeholder data | Previous page data (smooth pagination) |

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemAuditLog({ itemId }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useItemHistory({ itemId, page, limit: 10 });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {data?.logs.map((entry) => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <time>{new Date(entry.createdAt).toLocaleString()}</time>
        </div>
      ))}
      <Pagination
        page={page}
        totalPages={data?.totalPages ?? 1}
        onChange={setPage}
      />
    </div>
  );
}
```

---

## useDeletedClientItems

Manages deleted (trashed) client items with pagination and restore functionality.

```
useDeletedClientItems(params?: UseDeletedClientItemsParams): UseDeletedClientItemsReturn
```

### Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `10` | Items per page |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `items` | `ClientSubmissionData[]` | Deleted items for the current page |
| `total` | `number` | Total number of deleted items |
| `page` | `number` | Current page |
| `totalPages` | `number` | Total pages available |
| `isLoading` | `boolean` | Initial loading state |
| `isFetching` | `boolean` | Background refetch state |
| `restoringItemId` | `string \| null` | ID of item currently being restored |
| `error` | `Error \| null` | Fetch error |
| `restoreItem` | `(id: string) => Promise<boolean>` | Restore a deleted item |
| `refetch` | `() => void` | Re-fetch deleted items |
| `refreshData` | `() => void` | Invalidate all deleted item caches |

```tsx
import { useDeletedClientItems } from '@/hooks/use-deleted-client-items';

function TrashBin() {
  const { items, isLoading, restoreItem, restoringItemId } =
    useDeletedClientItems({ page: 1, limit: 20 });

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <span>{item.name}</span>
          <button
            onClick={() => restoreItem(item.id)}
            disabled={restoringItemId === item.id}
          >
            {restoringItemId === item.id ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

---

## useFeaturedItemsSection

Fetches and filters featured items for display sections. Sorts by featured order and filters by active status.

```
useFeaturedItemsSection(props?: UseFeaturedItemsSectionProps): UseFeaturedItemsSectionReturn
```

### Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | `number` | `6` | Maximum number of items to display |
| `enabled` | `boolean` | `true` | Whether to enable fetching |

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `featuredItems` | `FeaturedItem[]` | Active featured items sorted by order, limited |
| `isLoading` | `boolean` | Loading state |
| `isError` | `boolean` | Whether an error occurred |
| `error` | `string \| null` | Error message |
| `refetch` | `() => void` | Re-fetch featured items |
| `invalidateFeaturedItems` | `() => void` | Invalidate cache |

```tsx
import { useFeaturedItemsSection } from '@/hooks/use-feature-items-section';

function FeaturedSection() {
  const { featuredItems, isLoading } = useFeaturedItemsSection({ limit: 8 });

  if (isLoading) return <FeaturedSkeleton />;
  if (!featuredItems.length) return null;

  return (
    <section>
      <h2>Featured</h2>
      <div className="grid grid-cols-4 gap-4">
        {featuredItems.map((item) => (
          <FeaturedCard key={item.slug} item={item} />
        ))}
      </div>
    </section>
  );
}
```

---

## useUserSponsorAds

Full-featured hook for managing user sponsor ads with CRUD operations, filtering, pagination, and statistics.

```
useUserSponsorAds(options?: UseUserSponsorAdsOptions): UseUserSponsorAdsReturn
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `page` | `number` | `1` | Initial page |
| `limit` | `number` | `10` | Items per page |
| `status` | `SponsorAdStatus` | -- | Filter by status |
| `interval` | `'weekly' \| 'monthly'` | -- | Filter by billing interval |
| `search` | `string` | `""` | Search query (debounced) |

### Return Values

| Category | Property | Type | Description |
|----------|----------|------|-------------|
| Data | `sponsorAds` | `SponsorAd[]` | Current page of sponsor ads |
| Data | `stats` | `SponsorAdStats` | Overview, interval, and revenue stats |
| Loading | `isLoading` | `boolean` | Initial load |
| Loading | `isCreating` | `boolean` | Creating a new ad |
| Loading | `isCancelling` | `boolean` | Cancelling an ad |
| Loading | `isPayingNow` | `boolean` | Processing payment |
| Loading | `isRenewing` | `boolean` | Processing renewal |
| Pagination | `currentPage` | `number` | Current page |
| Pagination | `totalPages` | `number` | Total pages |
| Pagination | `nextPage` / `prevPage` | `() => void` | Page navigation |
| Actions | `createSponsorAd` | `(input) => Promise<SponsorAd \| null>` | Create new sponsor ad |
| Actions | `cancelSponsorAd` | `(id, reason?) => Promise<boolean>` | Cancel a sponsor ad |
| Actions | `payNow` | `(id) => Promise<{ checkoutUrl } \| null>` | Get checkout URL |
| Actions | `renewSponsorship` | `(id) => Promise<{ checkoutUrl } \| null>` | Get renewal URL |
| Filters | `setStatusFilter` | `(status) => void` | Update status filter |
| Filters | `setIntervalFilter` | `(interval) => void` | Update interval filter |
| Filters | `setSearch` | `(search) => void` | Update search (debounced) |

```tsx
import { useUserSponsorAds } from '@/hooks/use-user-sponsor-ads';

function SponsorAdManager() {
  const {
    sponsorAds,
    stats,
    isLoading,
    createSponsorAd,
    cancelSponsorAd,
    setStatusFilter,
    currentPage,
    nextPage,
  } = useUserSponsorAds({ limit: 10 });

  return (
    <div>
      <p>Active ads: {stats.overview.active}</p>
      <select onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
      </select>
      {sponsorAds.map((ad) => (
        <SponsorAdCard key={ad.id} ad={ad} onCancel={cancelSponsorAd} />
      ))}
    </div>
  );
}
```

---

## Summary Table

| Hook | Purpose | Source File |
|------|---------|-------------|
| `useItemCompany` | Item-company association CRUD | `use-item-company.ts` |
| `useItemHistory` | Item audit log with pagination | `use-item-history.ts` |
| `useDeletedClientItems` | Trashed item management and restore | `use-deleted-client-items.ts` |
| `useFeaturedItemsSection` | Featured items display section | `use-feature-items-section.ts` |
| `useUserSponsorAds` | Sponsor ad CRUD, filtering, stats | `use-user-sponsor-ads.ts` |
