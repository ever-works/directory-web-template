---
id: use-admin-comments-reference
title: useAdminComments Hook Reference
sidebar_label: useAdminComments
sidebar_position: 73
---

# useAdminComments

## Overview

`useAdminComments` is a React hook for managing user comments in the admin panel. It provides paginated comment listing with search, delete operations with per-item tracking, and automatic cache invalidation. Built on top of TanStack React Query with `keepPreviousData` for seamless pagination transitions.

**Source:** `template/hooks/use-admin-comments.ts`

## Signature / Parameters

```typescript
function useAdminComments(
  options?: UseAdminCommentsOptions
): UseAdminCommentsReturn
```

### `UseAdminCommentsOptions`

| Parameter | Type     | Default     | Description                         |
|-----------|----------|-------------|-------------------------------------|
| `page`    | `number` | `1`         | Current page number for pagination  |
| `limit`   | `number` | `10`        | Number of comments per page         |
| `search`  | `string` | `undefined` | Search term to filter comments      |

## Return Values

The hook returns an object implementing `UseAdminCommentsReturn`:

### Data

| Property   | Type                 | Description                            |
|------------|----------------------|----------------------------------------|
| `comments` | `AdminCommentItem[]` | Array of comments for the current page |

### `AdminCommentItem`

```typescript
interface AdminCommentItem {
  id: string;
  content: string;
  rating: number | null;
  userId: string;
  itemId: string;
  createdAt: string | null;
  updatedAt: string | null;
  user: AdminCommentUser;
}

interface AdminCommentUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}
```

### Loading States

| Property        | Type             | Description                                              |
|-----------------|------------------|----------------------------------------------------------|
| `isLoading`     | `boolean`        | `true` only on initial load (no cached data)             |
| `isFetching`    | `boolean`        | `true` when fetching, including background refetch       |
| `isDeleting`    | `string \| null` | ID of the comment currently being deleted, or `null`     |

### Pagination

| Property        | Type     | Description                           |
|-----------------|----------|---------------------------------------|
| `totalPages`    | `number` | Total number of pages (defaults to 1) |
| `totalComments` | `number` | Total number of comments              |

### Actions

| Method          | Signature                            | Description                                         |
|-----------------|--------------------------------------|-----------------------------------------------------|
| `deleteComment` | `(id: string) => Promise<boolean>`   | Delete a comment by ID. Returns `true` on success.  |

### Utility

| Method        | Signature    | Description                                    |
|---------------|-------------|------------------------------------------------|
| `refetch`     | `() => void` | Re-execute the comments list query             |
| `refreshData` | `() => void` | Invalidate all admin-comments queries          |

## Implementation Details

- **Query caching:** Uses TanStack React Query with a 5-minute `staleTime`, 10-minute `gcTime`, 5-minute refetch interval, and 3 retries.
- **Placeholder data:** Uses `keepPreviousData` so that paginated transitions do not flash empty states.
- **Delete tracking:** The `isDeleting` property tracks which specific comment ID is being deleted, enabling per-row loading indicators in the UI.
- **Toast notifications:** Delete success and error states trigger `sonner` toast notifications automatically.
- **Cache invalidation:** After a successful delete, all queries under the `['admin-comments']` key family are invalidated.
- **Error handling:** The `deleteComment` action returns `boolean` -- `true` on success, `false` on failure. The `isDeleting` state is cleaned up in a `finally` block to ensure it resets even on error.
- **Read-only design:** This hook only supports listing and deleting comments. Comment creation and editing are handled by the client-facing `useComments` hook.

### Query Keys

```typescript
const commentsQueryKeys = {
  all: ['admin-comments'],
  lists: () => ['admin-comments', 'list'],
  list: (params) => ['admin-comments', 'list', params],
  details: () => ['admin-comments', 'detail'],
  detail: (id) => ['admin-comments', 'detail', id],
};
```

### API Endpoints

| Operation | Method   | Endpoint                     |
|-----------|----------|------------------------------|
| List      | `GET`    | `/api/admin/comments`        |
| Delete    | `DELETE` | `/api/admin/comments/:id`    |

## Usage Examples

### Paginated comment listing with search

```tsx
import { useAdminComments } from '@/hooks/use-admin-comments';

function CommentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const {
    comments,
    totalComments,
    totalPages,
    isLoading,
    isFetching,
  } = useAdminComments({ page, limit: 20, search });

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <p>{totalComments} comments found {isFetching && '(updating...)'}</p>

      {isLoading ? (
        <Spinner />
      ) : (
        <CommentsTable comments={comments} />
      )}

      <Pagination current={page} total={totalPages} onChange={setPage} />
    </div>
  );
}
```

### Deleting a comment with per-row indicator

```tsx
const { comments, deleteComment, isDeleting } = useAdminComments();

function CommentRow({ comment }: { comment: AdminCommentItem }) {
  const isThisDeleting = isDeleting === comment.id;

  const handleDelete = async () => {
    const success = await deleteComment(comment.id);
    if (success) {
      // Comment removed, list auto-refreshes
    }
  };

  return (
    <tr>
      <td>{comment.content}</td>
      <td>{comment.user.name}</td>
      <td>{comment.rating}</td>
      <td>
        <button onClick={handleDelete} disabled={isThisDeleting}>
          {isThisDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </td>
    </tr>
  );
}
```

## Related Hooks

- [`useComments`](./use-comments-reference.md) -- Client-facing hook for creating and viewing comments on items.
- [`useAdminItems`](./use-admin-items-reference.md) -- Comments are attached to items managed by this hook.
- [`useAdminUsers`](./use-admin-users-reference.md) -- Each comment includes user information.
