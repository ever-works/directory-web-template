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

  // Rating
  rateComment,         // (data: { commentId: string; rating: number }) => void
  isRatingComment,     // boolean
  updateCommentRating, // (data: { commentId: string; rating: number }) => void
  isUpdatingRating,    // boolean
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

When an unauthenticated user attempts to create, update, delete, or rate a comment, the hook:

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
3. The `['item-rating', itemId]` query is immediately refetched to update aggregate ratings

A custom `comment:mutated` DOM event is dispatched for cross-component synchronization.

### Update Comment

On success:
1. The updated comment replaces its previous version in the cache
2. The `['item-rating', itemId]` query is refetched
3. A `comment:mutated` DOM event is dispatched

### Delete Comment

On success, the entire `['comments', itemId]` query is refetched from the server.

### Rate / Update Rating

On success:
1. The `['comments', itemId]` query is invalidated
2. The `['item-rating', itemId]` query is refetched

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

## Usage: Comment Rating

```tsx
function CommentRating({ comment, itemId }) {
  const { rateComment, isRatingComment } = useComments(itemId);

  return (
    <StarRating
      value={comment.rating}
      onChange={(rating) => rateComment({ commentId: comment.id, rating })}
      disabled={isRatingComment}
    />
  );
}
```

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
| `rateComment` | Opens login modal, returns silently | Throws with server error message |

## Related Hooks

- [`useItemRating`](/template/hooks/use-voting-reference) - Aggregate item rating (refetched on comment mutations)
- [`useCurrentUser`](/template/hooks/use-current-user-reference) - Authentication state
- [`useFeatureFlagsWithSimulation`](/template/hooks/use-feature-flags-reference) - `features.comments` gate
- [`useItemVote`](/template/hooks/use-voting-reference) - Item voting system
