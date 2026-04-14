---
id: engagement-queries-deep-dive
title: Задълбочено гмуркане на запитвания за ангажираност
sidebar_label: Задълбочено гмуркане на запитвания за ангажираност
sidebar_position: 64
---

# Задълбочено гмуркане на запитвания за ангажираност

Изчерпателна справка за всички свързани с ангажиментите функции за заявки към бази данни, включително гласове, коментари, любими, изгледи, оценки и обобщени показатели за популярност.

## Преглед

Слоят на заявката за ангажиране е организиран в три специализирани модула:

- **`engagement.queries.ts`** -- Обобщаване на показатели за групова ангажираност за оценка на популярността (гледания, гласове, любими, коментари, оценки)
- **`vote.queries.ts`** -- Гласувайте CRUD операции, изчисления на нетен резултат и сортиране на елементи въз основа на гласуване
- **`comment.queries.ts`** -- Коментирайте CRUD операции с потребителски данни, меко изтриване и управление на рейтинга

## Изходни файлове

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

Получава брой любими за артикул.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|да|Масив от охлюви за артикули|

**Връща:** `Promise<Map<string, number>>` -- Карта на броя на охлювите на артикулите към любимите

**Забележка:** Запитва таблицата `favorites`, използвайки `itemSlug` (не `itemId`), отразявайки конвенцията за именуване на схемата за тази таблица.

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

## Препратка към функция: vote.queries.ts

### `createVote`

Създава нов вот. Нормализира itemId чрез `getItemIdFromSlug` преди вмъкване.

```typescript
async function createVote(vote: InsertVote)
```

**Параметри:**

|Параметър|Тип|Задължително|Описание|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|да|Данни за гласуване с елемент|

**Връща:** Създаденият запис на гласуване (чрез `RETURNING`)

**SQL модел:**

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

Изтрива завинаги гласуване по ID.

```typescript
async function deleteVote(voteId: string)
```

**SQL модел:**

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

Получава нетния резултат от гласовете за един елемент (гласове за минус гласове против).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Връща:** Нетен резултат от гласуването (положителен = повече гласувания за, отрицателен = повече гласувания против, 0 = равно или без гласуване)

**SQL модел:**

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

## Препратка към функцията: comment.queries.ts

### `createComment`

Създава нов коментар. Нормализира `itemId` чрез `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Връща:** Създаденият запис на коментар

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

Получава коментар по ID (без потребителски данни).

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

Актуализира съдържанието на коментара и/или рейтинга. Задава както `updatedAt`, така и `editedAt` за проследяване на хронологията на редакциите.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**SQL модел:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Забележка за дизайна:** `editedAt` е отделен от `updatedAt`, за да се разграничат редакциите на потребителя от системните актуализации. Потребителският интерфейс може да показва „редактирани“ индикатори въз основа на `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft изтрива коментар чрез настройка на `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**SQL модел:**

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

## Бележки за ефективността

1. **Паралелно изпълнение на заявки** -- `getEngagementMetricsPerItem` изпълнява всичките четири заявки за показатели едновременно чрез `Promise.all`, намалявайки общото забавяне до най-бавната единична заявка.

2. **Отчитане на нетните гласове** -- Използва `CASE WHEN` изрази в SQL за изчисляване на гласуване за/против, като избягва отделни заявки за всеки тип гласуване.

3. **Филтриране на плавно изтриване** -- Всички заявки за коментари последователно филтрират `deleted_at IS NULL`, за да изключат плавно изтритите коментари.

4. **Нормализиране на охлузи** -- Както `vote.queries.ts`, така и `comment.queries.ts` нормализират охлювите на елемента чрез `getItemIdFromSlug` преди операции с базата данни, осигурявайки последователно съвпадение на ключовете.

5. **Предпазители на празни масиви** -- Всички функции за групови заявки се връщат незабавно с празни карти, когато бъдат предадени празни масиви.

## Примери за използване

### Сортиране на елементи по популярност

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

### Превключване на гласуването за елемент

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Извличане на коментари за страница с артикул

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
