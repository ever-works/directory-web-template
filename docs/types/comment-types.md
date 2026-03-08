---
id: comment-types
title: Comment Type Definitions
sidebar_label: Comment Types
sidebar_position: 4
---

# Comment Type Definitions

**Source:** `lib/types/comment.ts`

Comments allow users to leave reviews and feedback on items. The comment types are primarily inferred from the Drizzle ORM database schema, ensuring they stay in sync with database migrations.

## Database Schema

The `Comment` and `NewComment` types are inferred from the `comments` table defined in `lib/db/schema.ts`:

```typescript
// From lib/db/schema.ts
const comments = pgTable('comments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text('content').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => clientProfiles.id, { onDelete: 'cascade' }),
  itemId: text('itemId').notNull(),
  rating: integer('rating').notNull().default(0),
  createdAt: timestamp('created_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {
    mode: 'date',
    withTimezone: true,
  }).notNull().defaultNow(),
  editedAt: timestamp('edited_at', {
    mode: 'date',
    withTimezone: true,
  }),
  deletedAt: timestamp('deleted_at', {
    mode: 'date',
    withTimezone: true,
  }),
});
```

## Types

### `Comment`

Inferred select type from the database schema. Represents a comment as returned by database queries.

```typescript
import { comments } from '@/lib/db/schema';

type Comment = typeof comments.$inferSelect;
```

This resolves to an object with the following shape:

```typescript
// Effective type (inferred from schema)
interface CommentShape {
  id: string;
  content: string;
  userId: string;
  itemId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
}
```

**Field details:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Auto-generated UUID primary key |
| `content` | `string` | Comment text body |
| `userId` | `string` | Foreign key to `clientProfiles.id` (cascading delete) |
| `itemId` | `string` | Slug or ID of the item being commented on |
| `rating` | `number` | Numeric rating (default: 0) |
| `createdAt` | `Date` | Timestamp of creation (with timezone) |
| `updatedAt` | `Date` | Timestamp of last update (with timezone) |
| `editedAt` | `Date \| null` | Timestamp of last edit, null if never edited |
| `deletedAt` | `Date \| null` | Soft delete timestamp, null if not deleted |

### `NewComment`

Inferred insert type from the database schema. Represents the data needed to create a new comment.

```typescript
type NewComment = typeof comments.$inferInsert;
```

This resolves to an object where auto-generated and defaulted fields are optional:

```typescript
// Effective type (inferred from schema)
interface NewCommentShape {
  id?: string;       // Auto-generated if not provided
  content: string;   // Required
  userId: string;    // Required
  itemId: string;    // Required
  rating?: number;   // Defaults to 0
  createdAt?: Date;  // Defaults to now()
  updatedAt?: Date;  // Defaults to now()
  editedAt?: Date | null;
  deletedAt?: Date | null;
}
```

### `CommentWithUser`

Extended comment type that includes the related user data. Used when displaying comments in the UI where user information (name, avatar) is needed alongside the comment content.

```typescript
interface CommentWithUser extends Comment {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}
```

## Usage Examples

### Creating a new comment

```typescript
import type { NewComment } from '@/lib/types/comment';

const newComment: NewComment = {
  content: 'Great tool! Really helped with my workflow.',
  userId: 'user-uuid-123',
  itemId: 'my-tool-slug',
  rating: 5,
};
```

### Querying comments with user data

```typescript
import type { CommentWithUser } from '@/lib/types/comment';

function renderComment(comment: CommentWithUser) {
  const authorName = comment.user.name ?? 'Anonymous';
  const isEdited = comment.editedAt !== null;
  const isDeleted = comment.deletedAt !== null;

  return {
    author: authorName,
    avatar: comment.user.image,
    text: isDeleted ? '[Comment deleted]' : comment.content,
    rating: comment.rating,
    date: comment.createdAt,
    edited: isEdited,
  };
}
```

### Filtering out soft-deleted comments

```typescript
import type { Comment } from '@/lib/types/comment';

function getActiveComments(comments: Comment[]): Comment[] {
  return comments.filter(c => c.deletedAt === null);
}
```

### Checking if a comment has been edited

```typescript
import type { Comment } from '@/lib/types/comment';

function wasEdited(comment: Comment): boolean {
  return comment.editedAt !== null;
}
```

## Design Notes

### Why Drizzle-Inferred Types?

The `Comment` and `NewComment` types are derived from the Drizzle ORM schema using `$inferSelect` and `$inferInsert`. This approach provides:

1. **Automatic sync** - Types update automatically when the schema changes via migrations
2. **Insert vs. select distinction** - `NewComment` correctly marks auto-generated fields as optional
3. **Database accuracy** - Types exactly match the database column types and constraints

### Soft Delete Pattern

Comments use a `deletedAt` field for soft deletion:
- A non-null `deletedAt` value means the comment is "deleted" but still exists in the database
- Queries should filter by `deletedAt IS NULL` to show only active comments
- The `editedAt` field is separate from `updatedAt` to distinguish system updates from user edits

### Cascade Behavior

The `userId` field has a `CASCADE` delete policy. When a user is deleted from `clientProfiles`, all their comments are automatically removed from the database.

## Related Types

- [`Vote`](./vote-types.md) - Another per-item user interaction type
- [`ItemData`](./item-types.md) - The parent item that comments belong to
- [`Profile`](./user-types.md) - The user profile data referenced by `CommentWithUser.user`
