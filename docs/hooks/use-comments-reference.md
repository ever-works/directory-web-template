---
id: use-comments-reference
title: useComments Hook Reference
sidebar_label: useComments
sidebar_position: 34
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useComments

Manages the full lifecycle of item comments including creating, reading, updating, deleting, and rating. Provides optimistic cache updates, automatic login modal triggers for unauthenticated users, and cross-query rating synchronization.

**Source:** `template/hooks/use-comments.ts`

## Signature

```ts
function useComments(itemId: string): UseCommentsResult
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemId` | `string` | The unique identifier of the item to manage comments for |

## Return Values

```ts
const {
  // Data
  comments,            // CommentWithUser[] -- Array of comments with user data
  commentRating,       // number -- Aggregate comment rating for the item
  isPending,           // boolean -- True while loading comments
  isLoadingRating,     // boolean -- True while loading aggregate rating

  // Create
  createComment,       // (data: CreateCommentData) => Promise<CommentWithUser>
  isCreating,          // boolean

  // Update
  updateComment,       // (data: UpdateCommentData) => Promise<CommentWithUser>
  isUpdating,          // boolean

  // Delete
  deleteComment,       // (commentId: string) => Promise<void>
  isDeleting,          // boolean
} = useComments(itemId);
```

## Types

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}

// CommentWithUser is defined in @/lib/types/comment
// Includes: id, content, rating, userId, user (name, image), createdAt, updatedAt
```

## Cache Configuration

| Setting | Value |
|---------|-------|
| Comments query key | `['comments', itemId]` |
| Comment rating query key | `['commentRating', itemId]` |
| `staleTime` | 2 minutes |
| `gcTime` | 10 minutes |
| `refetchOnMount` | `false` |
| `refetchOnWindowFocus` | `false` |

## Authentication Handling

When an unauthenticated user attempts to create or update a comment, the hook:

1. Detects the `401 Unauthorized` response
2. Opens the login modal with a contextual message (e.g., "Please sign in to comment")
3. Throws an `'Unauthorized'` error that the calling component can handle

```tsx
function CommentForm({ itemId }) {
  const { createComment, isCreating } = useComments(itemId);

  const handleSubmit = async (content: string, rating: number) => {
    try {
      await createComment({ content, itemId, rating });
    } catch (err) {
      if (err.message === 'Unauthorized') {
        // Login modal is already open, no further action needed
        return;
      }
      // Handle other errors
    }
  };
}
```

## Cache Invalidation and Synchronization

### Create Comment

On success, the new comment is:
1. Added to the beginning of the `['comments', itemId]` cache (newest first)
2. Duplicate-checked to prevent the same comment appearing twice
3. The `['item-rating', itemId]` query is immediately refetched to update aggregate ratings, and `['commentRating', itemId]` is invalidated

A custom `comment:mutated` DOM event is dispatched for cross-component synchronization.

### Update Comment

On success:
1. The updated comment replaces its previous version in the cache
2. The `['item-rating', itemId]` query is refetched and `['commentRating', itemId]` is invalidated, so a rating change moves both aggregates
3. A `comment:mutated` DOM event is dispatched

### Delete Comment

On success, the entire `['comments', itemId]` query is refetched from the server, and `['item-rating', itemId]` and `['commentRating', itemId]` are invalidated (the deleted comment's rating leaves the aggregates).

## Usage: Comment List with Create

```tsx
function CommentsSection({ itemId }) {
  const { comments, isPending, createComment, isCreating } = useComments(itemId);

  if (isPending) return <Skeleton count={3} />;

  return (
    <div>
      <CommentForm
        onSubmit={(content, rating) => createComment({ content, itemId, rating })}
        isSubmitting={isCreating}
      />
      {comments.map((comment) => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
```

## Usage: Editable Comment Card

```tsx
function EditableComment({ comment, itemId }) {
  const { updateComment, deleteComment, isUpdating, isDeleting } = useComments(itemId);
  const [editing, setEditing] = useState(false);

  const handleSave = async (newContent: string) => {
    await updateComment({ commentId: comment.id, content: newContent });
    setEditing(false);
  };

  return (
    <div>
      {editing ? (
        <EditForm
          initialContent={comment.content}
          onSave={handleSave}
          isSaving={isUpdating}
        />
      ) : (
        <>
          <p>{comment.content}</p>
          <button onClick={() => setEditing(true)}>Edit</button>
          <button
            onClick={() => deleteComment(comment.id)}
            disabled={isDeleting}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
```

## Usage: Changing a Comment's Rating

The hook has no dedicated rating mutation. Change a rating through `updateComment`, which accepts an optional `rating`:

```tsx
function CommentRating({ comment, itemId }) {
  const { updateComment, isUpdating } = useComments(itemId);

  return (
    <StarRating
      value={comment.rating}
      onChange={async (rating) => {
        try {
          await updateComment({ commentId: comment.id, rating });
        } catch (err) {
          if (err.message === 'Unauthorized') return; // login modal is already open
          // Handle other errors
        }
      }}
      disabled={isUpdating}
    />
  );
}
```

`updateComment` calls `PUT /api/items/{slug}/comments/{commentId}`, which only lets the comment's author edit it.

## Event System

The hook dispatches a custom DOM event `comment:mutated` on create and update operations. Other components can listen for this event to synchronize their state:

```tsx
useEffect(() => {
  const handler = (e: CustomEvent<CommentWithUser>) => {
    console.log('Comment changed:', e.detail);
  };
  window.addEventListener('comment:mutated', handler);
  return () => window.removeEventListener('comment:mutated', handler);
}, []);
```

## Error Handling

| Operation | Auth Error Behavior | Other Errors |
|-----------|-------------------|--------------|
| `createComment` | Opens login modal, throws `'Unauthorized'` | Throws with server error message |
| `updateComment` | Opens login modal, throws `'Unauthorized'` | Throws with server error message |
| `deleteComment` | Throws `'Please login to delete comment'` | Throws with server error message |

## Related Hooks

- [`useItemRating`](./use-voting-reference.md) - Aggregate item rating (refetched on comment mutations)
- [`useCurrentUser`](./use-current-user-reference.md) - Authentication state
- [`useFeatureFlagsWithSimulation`](./use-feature-flags-reference.md) - `features.comments` gate
- [`useItemVote`](./use-voting-reference.md) - Item voting system
