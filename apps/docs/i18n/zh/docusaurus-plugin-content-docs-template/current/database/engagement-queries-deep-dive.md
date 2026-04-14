---
id: engagement-queries-deep-dive
title: 参与度查询深入探讨
sidebar_label: 参与度查询深入探讨
sidebar_position: 64
---

# 参与度查询深入探讨

所有与参与相关的数据库查询功能的综合参考，包括投票、评论、收藏夹、视图、评级和聚合流行度指标。

## 概述

参与查询层分为三个专门的模块：

- **`engagement.queries.ts`** -- 用于流行度评分的批量参与度指标聚合（视图、投票、收藏夹、评论、评级）
- **`vote.queries.ts`** -- 投票 CRUD 操作、净分数计算和基于投票的项目排序
- **`comment.queries.ts`** -- 评论CRUD操作，包括用户详细信息、软删除和评级管理

## 源文件

```
lib/db/queries/engagement.queries.ts
lib/db/queries/vote.queries.ts
lib/db/queries/comment.queries.ts
```

---

## Function Reference: engagement.queries.ts

### `ItemEngagementMetrics` (Interface)

```typescript
interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

### `getEngagementMetricsPerItem`

Gets all engagement metrics for multiple items in a single query batch. Optimized for bulk operations like sorting all items by popularity.

```typescript
async function getEngagementMetricsPerItem(
  itemSlugs: string[]
): Promise<Map<string, ItemEngagementMetrics>>
```

**Parameters:**

| Parameter   | Type       | Required | Description               |
|-------------|------------|----------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs       |

**Returns:** `Promise<Map<string, ItemEngagementMetrics>>` -- Map of item slug to full engagement metrics

**SQL Pattern:** Runs four queries in parallel using `Promise.all`:

1. **Views per item:**
   ```sql
   SELECT item_id, count(*) FROM item_views
   WHERE item_id IN (...) GROUP BY item_id;
   ```

2. **Net votes per item (upvotes - downvotes):**
   ```sql
   SELECT item_id,
     SUM(CASE WHEN vote_type = 'upvote' THEN 1
              WHEN vote_type = 'downvote' THEN -1
              ELSE 0 END) as net_score
   FROM votes WHERE item_id IN (...) GROUP BY item_id;
   ```

3. **Favorites per item:**
   ```sql
   SELECT item_slug, count(*) FROM favorites
   WHERE item_slug IN (...) GROUP BY item_slug;
   ```

4. **Comments count and average rating:**
   ```sql
   SELECT item_id, count(*), COALESCE(AVG(rating), 0) as avg_rating
   FROM comments
   WHERE item_id IN (...) AND deleted_at IS NULL
   GROUP BY item_id;
   ```

**Performance Notes:**
- All four queries run concurrently via `Promise.all`
- Empty array guard avoids unnecessary database calls
- Results merged in-memory into a single Map
- Items with no engagement data receive default zeros

---

### `getFavoritesPerItem`

获取每个项目的收藏计数。

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**参数：**

|参数|类型|必填|描述|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|是的|物品块数组|

**返回：** `Promise<Map<string, number>>` -- 项目 slug 到收藏夹计数的映射

**注意：** 使用`itemSlug`（而不是`itemId`）查询`favorites` 表，反映该表的模式命名约定。

---

### `getCommentsPerItem`

Gets comments count and average rating per item.

```typescript
async function getCommentsPerItem(
  itemSlugs: string[]
): Promise<Map<string, { count: number; avgRating: number }>>
```

**Returns:** `Promise<Map<string, { count: number; avgRating: number }>>` -- Map of item slug to comment count and average rating

**SQL Pattern:**

```sql
SELECT item_id, count(*), COALESCE(AVG(rating), 0) as avg_rating
FROM comments
WHERE item_id IN (...) AND deleted_at IS NULL
GROUP BY item_id;
```

**Note:** Excludes soft-deleted comments (`deleted_at IS NULL`).

---

## 函数参考：vote.queries.ts

### `createVote`

创建新投票。在插入之前通过 `getItemIdFromSlug` 标准化 itemId。

```typescript
async function createVote(vote: InsertVote)
```

**参数：**

|参数|类型|必填|描述|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|是的|使用 item slug 对数据进行投票|

**返回：** 创建的投票记录（通过`RETURNING`）

**SQL 模式：**

```sql
INSERT INTO votes (user_id, item_id, vote_type, ...)
VALUES (?, ?, ?, ...) RETURNING *;
```

---

### `getVoteByUserIdAndItemId`

Gets a user's vote on a specific item.

```typescript
async function getVoteByUserIdAndItemId(
  userId: string,
  itemSlug: string
)
```

**Parameters:**

| Parameter  | Type     | Required | Description |
|------------|----------|----------|-------------|
| `userId`   | `string` | Yes      | User ID     |
| `itemSlug` | `string` | Yes      | Item slug   |

**Returns:** Vote array (empty if not found, single element if found)

**SQL Pattern:**

```sql
SELECT * FROM votes
WHERE user_id = ? AND item_id = ?
LIMIT 1;
```

---

### `deleteVote`

通过 ID 永久删除投票。

```typescript
async function deleteVote(voteId: string)
```

**SQL 模式：**

```sql
DELETE FROM votes WHERE id = ?;
```

---

### `getItemsSortedByVotes`

Gets items sorted by total vote count with pagination.

```typescript
async function getItemsSortedByVotes(
  limit: number = 10,
  offset: number = 0
)
```

**Parameters:**

| Parameter | Type     | Required | Default | Description        |
|-----------|----------|----------|---------|--------------------|
| `limit`   | `number` | No       | `10`    | Results per page   |
| `offset`  | `number` | No       | `0`     | Pagination offset  |

**Returns:** Array of `{ itemId: string, voteCount: number }` sorted by vote count descending

**SQL Pattern:**

```sql
SELECT item_id, count(id) as vote_count
FROM votes
GROUP BY item_id
ORDER BY vote_count DESC
LIMIT ? OFFSET ?;
```

---

### `getVoteCountForItem`

获取单个项目的净投票分数（赞成票减去反对票）。

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**返回：** 净投票分数（正值 = 更多赞成票，负值 = 更多反对票，0 = 相等或无票）

**SQL 模式：**

```sql
SELECT SUM(CASE
  WHEN vote_type = 'upvote' THEN 1
  WHEN vote_type = 'downvote' THEN -1
  ELSE 0
END) as net_score
FROM votes WHERE item_id = ?;
```

---

### `getVotesPerItem`

Gets net vote scores for multiple items.

```typescript
async function getVotesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Returns:** `Promise<Map<string, number>>` -- Map of item slug to net vote score

---

## 函数参考：comment.queries.ts

### `createComment`

创建新评论。通过`getItemIdFromSlug` 标准化`itemId`。

```typescript
async function createComment(data: NewComment)
```

**返回：** 创建的评论记录

---

### `getCommentsByItemId`

Gets all non-deleted comments for an item with user information, ordered by most recent first.

```typescript
async function getCommentsByItemId(
  itemSlug: string
): Promise<CommentWithUser[]>
```

**Returns:** Array of `CommentWithUser` including:
- Comment fields: `id`, `content`, `rating`, `createdAt`, `updatedAt`, `editedAt`, `deletedAt`
- User fields: `user.id`, `user.name`, `user.email`, `user.image`

**SQL Pattern:**

```sql
SELECT comments.*, client_profiles.id, name, email, avatar
FROM comments
INNER JOIN client_profiles ON comments.user_id = client_profiles.id
WHERE comments.item_id = ? AND comments.deleted_at IS NULL
ORDER BY comments.created_at DESC;
```

---

### `getCommentById`

通过 ID 获取评论（没有用户详细信息）。

```typescript
async function getCommentById(id: string)
```

---

### `getCommentWithUserById`

Gets a comment by ID with user information.

```typescript
async function getCommentWithUserById(
  id: string
): Promise<CommentWithUser | undefined>
```

---

### `updateComment`

更新评论内容和/或评级。设置 `updatedAt` 和 `editedAt` 以跟踪编辑历史记录。

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**SQL 模式：**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**设计说明：** `editedAt` 与`updatedAt` 是分开的，以区分用户编辑和系统更新。 UI可以显示基于`editedAt`的“编辑”指标。

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

通过设置`deletedAt`软删除评论。

```typescript
async function deleteComment(id: string)
```

**SQL 模式：**

```sql
UPDATE comments SET deleted_at = NOW() WHERE id = ? RETURNING *;
```

---

## Shared Types

### `CommentWithUser`

```typescript
type CommentWithUser = {
  id: string;
  content: string;
  rating: number | null;
  userId: string;
  itemId: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};
```

---

## 性能说明

1. **并行查询执行** -- `getEngagementMetricsPerItem` 通过 `Promise.all` 同时运行所有四个指标查询，将总延迟减少到最慢的单个查询。

2. **净投票评分** -- 在 SQL 中使用 `CASE WHEN` 表达式进行赞成票/反对票计算，避免对每种投票类型进行单独查询。

3. **软删除过滤** -- 所有评论查询一致地过滤`deleted_at IS NULL` 以排除软删除评论。

4. **Slug 标准化** -- `vote.queries.ts` 和`comment.queries.ts` 在数据库操作之前通过`getItemIdFromSlug` 标准化项目slug，确保一致的键匹配。

5. **空数组防护** - 当传递空数组时，所有批量查询函数都会立即返回空映射。

## 使用示例

### 按受欢迎程度对项目进行排序

```typescript
import { getEngagementMetricsPerItem } from '@/lib/db/queries';

const metrics = await getEngagementMetricsPerItem(allItemSlugs);

const sorted = allItemSlugs.sort((a, b) => {
  const ma = metrics.get(a) ?? { votes: 0, views: 0, favorites: 0, comments: 0 };
  const mb = metrics.get(b) ?? { votes: 0, views: 0, favorites: 0, comments: 0 };
  const scoreA = ma.votes * 3 + ma.favorites * 2 + ma.comments + ma.views * 0.1;
  const scoreB = mb.votes * 3 + mb.favorites * 2 + mb.comments + mb.views * 0.1;
  return scoreB - scoreA;
});
```

### 切换对项目的投票

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### 获取项目页面的评论

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
