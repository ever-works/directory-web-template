---
id: use-admin-tags-reference
title: useAdminTags Hook Reference
sidebar_label: useAdminTags
sidebar_position: 72
---

# useAdminTags

## Overview

The `use-admin-tags.ts` module exports a family of React hooks for managing tags in the admin panel. Rather than a single monolithic hook, it provides granular hooks for specific operations -- paginated listing, fetching all tags, individual CRUD mutations -- as well as a unified `useTagManagement` convenience hook. Built on top of TanStack React Query and the internal `serverClient` API layer.

**Source:** `template/hooks/use-admin-tags.ts`

## Exported Hooks

| Hook                  | Purpose                                                  |
|-----------------------|----------------------------------------------------------|
| `useTags`             | Paginated tag listing query                              |
| `useAllTags`          | Fetch all tags without pagination                        |
| `useCreateTag`        | Mutation hook for creating a tag                         |
| `useUpdateTag`        | Mutation hook for updating a tag                         |
| `useDeleteTag`        | Mutation hook for deleting a tag                         |
| `useTagManagement`    | Unified hook combining create, update, and delete        |
| `useAllTagsFormatted` | Convenience wrapper around `useAllTags` with defaults    |

---

## useTags

Fetches a paginated list of tags.

```typescript
function useTags(page?: number, limit?: number): UseQueryResult<TagsResponse>
```

| Parameter | Type     | Default | Description              |
|-----------|----------|---------|--------------------------|
| `page`    | `number` | `1`     | Page number              |
| `limit`   | `number` | `10`    | Number of tags per page  |

### `TagsResponse`

```typescript
interface TagsResponse {
  tags: TagData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
  message?: string;
  error?: string;
}
```

---

## useAllTags

Fetches all tags in a single request (no pagination).

```typescript
function useAllTags(): UseQueryResult<TagData[]>
```

Returns a standard React Query result with `data` typed as `TagData[]`.

---

## useCreateTag

Mutation hook for creating a new tag.

```typescript
function useCreateTag(): UseMutationResult<SingleTagResponse, Error, TagData>
```

On success, invalidates all tag list queries and adds the new tag to the detail cache.

### `SingleTagResponse`

```typescript
interface SingleTagResponse {
  tag: TagData;
  success: boolean;
  message?: string;
}
```

---

## useUpdateTag

Mutation hook for updating an existing tag.

```typescript
function useUpdateTag(): UseMutationResult<
  SingleTagResponse,
  Error,
  { id: string; data: UpdateTagData }
>
```

On success, invalidates all tag list queries and updates the specific tag in the detail cache.

---

## useDeleteTag

Mutation hook for deleting a tag.

```typescript
function useDeleteTag(): UseMutationResult<
  { success: boolean; message?: string },
  Error,
  string
>
```

On success, invalidates all tag list queries and removes the tag from the detail cache.

---

## useTagManagement

A convenience hook that composes `useCreateTag`, `useUpdateTag`, and `useDeleteTag` into a single object with async action methods and loading/error states.

```typescript
function useTagManagement(): UseTagManagementReturn
```

### Return Values

| Property      | Type                                                    | Description                        |
|---------------|---------------------------------------------------------|------------------------------------|
| `createTag`   | `(data: TagData) => Promise<SingleTagResponse>`         | Create a new tag                   |
| `updateTag`   | `(id: string, data: UpdateTagData) => Promise<SingleTagResponse>` | Update an existing tag   |
| `deleteTag`   | `(id: string) => Promise<{ success: boolean; message?: string }>` | Delete a tag by ID       |
| `isCreating`  | `boolean`                                               | `true` while create is pending     |
| `isUpdating`  | `boolean`                                               | `true` while update is pending     |
| `isDeleting`  | `boolean`                                               | `true` while delete is pending     |
| `createError` | `Error \| null`                                         | Error from the last create attempt |
| `updateError` | `Error \| null`                                         | Error from the last update attempt |
| `deleteError` | `Error \| null`                                         | Error from the last delete attempt |

---

## useAllTagsFormatted

A convenience wrapper around `useAllTags` that normalizes the response with safe defaults.

```typescript
function useAllTagsFormatted(): UseAllTagsFormattedReturn
```

### Return Values

| Property   | Type         | Description                                  |
|------------|-------------|----------------------------------------------|
| `allTags`  | `TagData[]` | All tags, defaults to empty array if loading |
| `isLoading`| `boolean`   | `true` while tags are being fetched          |
| `error`    | `Error \| null` | Query error, if any                      |
| `refetch`  | `() => void`| Re-execute the all-tags query                |

## Implementation Details

- **Query caching:** Both `useTags` and `useAllTags` use a 5-minute `staleTime` and 10-minute `gcTime`.
- **Optimistic cache updates:** On create/update success, the individual tag is written directly into the detail cache via `queryClient.setQueryData`. On delete, the tag is removed from the detail cache via `queryClient.removeQueries`.
- **List invalidation:** All mutations invalidate the `['tags', 'list']` query family, triggering a refetch of any active paginated listing.
- **Error logging:** Mutation errors are logged to `console.error` for debugging. Toast notifications are not built into these hooks -- consumers should handle UI feedback.

### Query Keys

```typescript
const tagsKeys = {
  all: ['tags'],
  lists: () => ['tags', 'list'],
  list: (page, limit) => ['tags', 'list', { page, limit }],
  allTags: () => ['tags', 'all'],
  details: () => ['tags', 'detail'],
  detail: (id) => ['tags', 'detail', id],
};
```

### API Endpoints

| Operation  | Method   | Endpoint                     |
|------------|----------|------------------------------|
| List       | `GET`    | `/api/admin/tags?page=&limit=` |
| All        | `GET`    | `/api/admin/tags/all`        |
| Create     | `POST`   | `/api/admin/tags`            |
| Update     | `PUT`    | `/api/admin/tags/:id`        |
| Delete     | `DELETE` | `/api/admin/tags/:id`        |

## Usage Examples

### Paginated tag listing

```tsx
import { useTags } from '@/hooks/use-admin-tags';

function TagsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTags(page, 20);

  if (isLoading) return <Spinner />;

  return (
    <div>
      <p>{data?.total} tags found</p>
      <TagsTable tags={data?.tags || []} />
      <Pagination
        current={page}
        total={data?.totalPages || 1}
        onChange={setPage}
      />
    </div>
  );
}
```

### CRUD operations with useTagManagement

```tsx
import { useTagManagement } from '@/hooks/use-admin-tags';

function TagEditor() {
  const {
    createTag,
    updateTag,
    deleteTag,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTagManagement();

  const handleCreate = async () => {
    const result = await createTag({
      id: '',
      name: 'New Tag',
      slug: 'new-tag',
    });
    console.log('Created:', result.tag);
  };

  const handleUpdate = async (tagId: string) => {
    const result = await updateTag(tagId, {
      id: tagId,
      name: 'Updated Name',
      slug: 'updated-name',
    });
    console.log('Updated:', result.tag);
  };

  const handleDelete = async (tagId: string) => {
    await deleteTag(tagId);
  };

  return (
    <div>
      <button onClick={handleCreate} disabled={isCreating}>
        {isCreating ? 'Creating...' : 'Create Tag'}
      </button>
    </div>
  );
}
```

### Fetching all tags for a dropdown

```tsx
import { useAllTagsFormatted } from '@/hooks/use-admin-tags';

function TagSelector({ onChange }: { onChange: (tagId: string) => void }) {
  const { allTags, isLoading } = useAllTagsFormatted();

  if (isLoading) return <Spinner />;

  return (
    <select onChange={(e) => onChange(e.target.value)}>
      <option value="">Select a tag</option>
      {allTags.map((tag) => (
        <option key={tag.id} value={tag.id}>
          {tag.name}
        </option>
      ))}
    </select>
  );
}
```

## Related Hooks

- [`useAdminItems`](./use-admin-items-reference.md) -- Items can be filtered by tags; shares similar query patterns.
- [`useAdminCategories`](./use-admin-categories-reference.md) -- Similar organizational taxonomy management.
- [`useAdminFilters`](./use-admin-filters-reference.md) -- Filter state management that can include tag-based filtering.
