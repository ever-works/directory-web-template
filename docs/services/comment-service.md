---
id: comment-service
title: Comment Service
sidebar_label: Comment Service
sidebar_position: 36
---

# Comment Service

The comment system enables users to leave text reviews with star ratings on items. It supports full CRUD operations, soft deletion, user profile joins, and integration with the engagement metrics system.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Comment Queries | `lib/db/queries/comment.queries.ts` | Database CRUD for comments |
| Engagement Queries | `lib/db/queries/engagement.queries.ts` | Aggregated comment metrics per item |
| Dashboard Queries | `lib/db/queries/dashboard.queries.ts` | Comment counts for dashboards |
| Schema | `lib/db/schema.ts` | Comment table definition |

## Database Schema

### comments

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` (UUID) | Primary key |
| `content` | `text` | Comment text content (required) |
| `userId` | `text` | FK to `client_profiles.id` (cascade delete) |
| `itemId` | `text` | Item slug the comment belongs to |
| `rating` | `integer` | Star rating, default `0` |
| `created_at` | `timestamp` | Creation time |
| `updated_at` | `timestamp` | Last modification time |
| `edited_at` | `timestamp` | When content was edited (nullable) |
| `deleted_at` | `timestamp` | Soft deletion marker (nullable) |

Comments reference `client_profiles` (not `users`) because they are authored by client-side users. The `itemId` field stores the item slug rather than a foreign key, since items live in the Git-based CMS.

## Types

```ts
// Returned by queries that join with client profiles
export interface CommentWithUser {
  id: string;
  content: string;
  rating: number;
  userId: string;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}
```

## Comment Queries

### Creating a Comment

```ts
export async function createComment(data: NewComment) {
  const normalizedData = {
    ...data,
    itemId: getItemIdFromSlug(data.itemId),
  };
  return (
    await db.insert(comments).values(normalizedData).returning()
  )[0];
}
```

The `itemId` is normalized through `getItemIdFromSlug` to ensure consistent slug formatting.

### Fetching Comments by Item

Returns all non-deleted comments for an item, ordered by newest first, with user profile data:

```ts
export async function getCommentsByItemId(
  itemSlug: string
): Promise<CommentWithUser[]> {
  const itemId = getItemIdFromSlug(itemSlug);
  return db
    .select({
      id: comments.id,
      content: comments.content,
      rating: comments.rating,
      userId: comments.userId,
      itemId: comments.itemId,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      editedAt: comments.editedAt,
      deletedAt: comments.deletedAt,
      user: {
        id: clientProfiles.id,
        name: clientProfiles.name,
        email: clientProfiles.email,
        image: clientProfiles.avatar,
      },
    })
    .from(comments)
    .innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
    .where(
      and(eq(comments.itemId, itemId), isNull(comments.deletedAt))
    )
    .orderBy(desc(comments.createdAt));
}
```

### Fetching a Single Comment

```ts
// Without user data
export async function getCommentById(id: string)

// With user data
export async function getCommentWithUserById(
  id: string
): Promise<CommentWithUser | undefined>
```

### Updating a Comment

Both content and rating can be updated. The `editedAt` field is set to mark the comment as edited:

```ts
export async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
) {
  const now = new Date();
  const [comment] = await db
    .update(comments)
    .set({
      ...(data.content !== undefined && { content: data.content }),
      ...(data.rating !== undefined && { rating: data.rating }),
      updatedAt: now,
      editedAt: now,
    })
    .where(eq(comments.id, id))
    .returning();
  return comment;
}
```

### Rating-Only Update

```ts
export async function updateCommentRating(id: string, rating: number) {
  return (
    await db
      .update(comments)
      .set({ rating })
      .where(eq(comments.id, id))
      .returning()
  )[0];
}
```

### Soft Deletion

Comments are soft-deleted by setting `deletedAt`. They are excluded from all standard queries:

```ts
export async function deleteComment(id: string) {
  const [comment] = await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();
  return comment;
}
```

## Engagement Integration

### Comments Per Item

The engagement queries module provides aggregated comment data:

```ts
// lib/db/queries/engagement.queries.ts
export async function getCommentsPerItem(
  itemSlugs: string[]
): Promise<Map<string, { count: number; avgRating: number }>> {
  const commentCounts = await db
    .select({
      itemId: comments.itemId,
      count: count(),
      avgRating: sql`COALESCE(AVG(${comments.rating}), 0)`,
    })
    .from(comments)
    .where(
      and(
        inArray(comments.itemId, itemSlugs),
        isNull(comments.deletedAt)
      )
    )
    .groupBy(comments.itemId);
  // Returns Map of slug -> { count, avgRating }
}
```

### Dashboard Stats

```ts
// lib/db/queries/dashboard.queries.ts
export async function getCommentsReceivedCount(
  itemSlugs: string[]
): Promise<number>
```

### Weekly Comment Trends

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

## Comment Flow

1. User writes comment text and optionally selects a star rating
2. Client calls the comment API with content, rating, and item slug
3. `createComment()` normalizes the slug and inserts into the database
4. Comment appears in the item detail page via `getCommentsByItemId()`
5. Users can edit their own comments (sets `editedAt`)
6. Users or admins can soft-delete comments (sets `deletedAt`)
7. Deleted comments are excluded from all standard query results

## Moderation

Comments can be reported through the report system. When a comment is reported:

- A report record is created with `contentType: 'comment'` and `contentId` set to the comment ID
- Admins can review the report and take action (warn, suspend, ban, or remove content)
- Content removal triggers a soft delete on the comment

## Related Documentation

- [Voting & Comments Feature](/docs/template/features/voting-comments) -- UI components
- [Report Service](/docs/template/services/report-service) -- Content reporting
- [Engagement Service](/docs/template/services/engagement-services) -- Popularity scoring
