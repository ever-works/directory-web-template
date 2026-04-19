---
id: engagement-queries-deep-dive
title: שאילתות מעורבות Deep Dive
sidebar_label: שאילתות מעורבות Deep Dive
sidebar_position: 64
---

# שאילתות מעורבות Deep Dive

התייחסות מקיפה לכל פונקציות שאילתות מסד הנתונים הקשורות למעורבות, כולל הצבעות, הערות, מועדפים, צפיות, דירוגים ומדדי פופולריות מצטברים.

## סקירה כללית

שכבת שאילתת המעורבות מאורגנת בשלושה מודולים מיוחדים:

- **`engagement.queries.ts`** -- צבירת מדדי מעורבות בכמות גדולה לציון פופולריות (צפיות, הצבעות, מועדפים, הערות, דירוגים)
- **`vote.queries.ts`** -- פעולות CRUD הצבעה, חישובי ניקוד נטו ומיון פריטים מבוסס הצבעה
- **`comment.queries.ts`** -- הערות CRUD פעולות עם פרטי משתמש, מחיקה רכה וניהול דירוג

## קבצי מקור

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

מקבל ספירת מועדפים לכל פריט.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|כן|מערך של שבלולים|

**החזרות:** `Promise<Map<string, number>>` -- מפה של שבלול פריט לספירת המועדפים

**הערה:** שואל את הטבלה `favorites` באמצעות `itemSlug` (לא `itemId`), המשקף את מוסכמות השמות של הסכימה עבור טבלה זו.

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

## הפניה לפונקציה: vote.queries.ts

### `createVote`

יוצר הצבעה חדשה. מנרמל את itemId באמצעות `getItemIdFromSlug` לפני ההכנסה.

```typescript
async function createVote(vote: InsertVote)
```

**פרמטרים:**

|פרמטר|הקלד|חובה|תיאור|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|כן|נתוני הצבעה עם שבלול פריט|

**החזרות:** שיא ההצבעה שנוצר (דרך `RETURNING`)

**דפוס SQL:**

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

מוחק לצמיתות הצבעה לפי תעודת זהות.

```typescript
async function deleteVote(voteId: string)
```

**דפוס SQL:**

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

מקבל את ציון ההצבעה נטו עבור פריט בודד (הצבעות למעלה מינוס הצבעות למטה).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**החזרות:** ניקוד הצבעה נטו (חיובי = יותר הצבעות בעד, שלילי = יותר הצבעות נגד, 0 = שווה או ללא הצבעות)

**דפוס SQL:**

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

## הפניה לפונקציה: comment.queries.ts

### `createComment`

יוצר הערה חדשה. מנרמל את `itemId` דרך `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**מחזירה:** רשומת ההערה שנוצרה

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

מקבל הערה לפי תעודת זהות (ללא פרטי משתמש).

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

מעדכן את תוכן הערות ו/או דירוג. מגדיר גם `updatedAt` וגם `editedAt` למעקב אחר היסטוריית העריכה.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**דפוס SQL:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**הערת עיצוב:** `editedAt` נפרד מ-`updatedAt` כדי להבחין בין עריכות של משתמשים לבין עדכוני מערכת. ממשק המשתמש יכול להציג מחוונים "ערוכים" בהתבסס על `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft מוחק הערה על ידי הגדרת `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**דפוס SQL:**

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

## הערות ביצועים

1. **ביצוע שאילתה מקבילה** -- `getEngagementMetricsPerItem` מריץ את כל ארבע השאילתות המטריות במקביל דרך `Promise.all`, ומפחית את השהיה הכוללת לשאילתה היחידה האיטית ביותר.

2. **ניקוד הצבעה נטו** -- משתמש בביטויים `CASE WHEN` ב-SQL לחישוב הצבעה למעלה/למטה, תוך הימנעות משאילתות נפרדות עבור כל סוג הצבעה.

3. **סינון מחיקה רכה** -- כל שאילתות ההערות מסננות באופן עקבי `deleted_at IS NULL` כדי לא לכלול הערות שנמחקו בצורה רכה.

4. **נורמליזציה של שבלולים** -- גם `vote.queries.ts` וגם `comment.queries.ts` מנרמל שבלול פריטים באמצעות `getItemIdFromSlug` לפני פעולות מסד הנתונים, ומבטיח התאמה עקבית של מפתחות.

5. **שומרי מערך ריקים** -- כל פונקציות השאילתה בכמות גדולה חוזרות מיד עם מפות ריקות כאשר עוברות מערכים ריקים.

## דוגמאות לשימוש

### מיון פריטים לפי פופולריות

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

### החלף הצבעה על פריט

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### מביא הערות עבור דף פריט

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
