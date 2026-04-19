---
id: engagement-queries-deep-dive
title: Глубокое погружение в вопросы взаимодействия
sidebar_label: Глубокое погружение в вопросы взаимодействия
sidebar_position: 64
---

# Глубокое погружение в вопросы взаимодействия

Комплексный справочник по всем функциям запросов к базе данных, связанным с взаимодействием, включая голоса, комментарии, избранное, просмотры, рейтинги и агрегированные показатели популярности.

## Обзор

Уровень запросов взаимодействия организован в три специализированных модуля:

- **`engagement.queries.ts`** – массовое агрегирование показателей вовлеченности для оценки популярности (просмотры, голоса, избранное, комментарии, рейтинги)
- **`vote.queries.ts`** — операции голосования CRUD, подсчет чистых баллов и сортировка элементов на основе голосов.
- **`comment.queries.ts`** — комментируйте операции CRUD с данными пользователя, мягким удалением и управлением рейтингами.

## Исходные файлы

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

Получает количество избранных для каждого элемента.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Да|Массив слизней элементов|

**Возвраты:** `Promise<Map<string, number>>` – сопоставление фрагмента элемента со счетчиком избранного.

**Примечание.** Запрашивает таблицу `favorites`, используя `itemSlug` (а не `itemId`), что отражает соглашение об именах схемы для этой таблицы.

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

## Ссылка на функцию: voice.queries.ts

### `createVote`

Создает новое голосование. Нормализует itemId через `getItemIdFromSlug` перед вставкой.

```typescript
async function createVote(vote: InsertVote)
```

**Параметры:**

|Параметр|Тип|Требуется|Описание|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Да|Данные голосования с указанием элемента|

**Возвраты:** Созданная запись голосования (через `RETURNING`)

**Шаблон SQL:**

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

Безвозвратно удаляет голосование по идентификатору.

```typescript
async function deleteVote(voteId: string)
```

**Шаблон SQL:**

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

Получает чистый балл голосов для одного элемента (голоса за минус голоса против).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Результаты:** Чистый рейтинг голосов (положительный = больше голосов за, отрицательный = больше голосов против, 0 = равно или нет голосов)

**Шаблон SQL:**

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

## Ссылка на функцию: comment.queries.ts

### `createComment`

Создает новый комментарий. Нормализует `itemId` через `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Возврат:** Созданная запись комментария.

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

Получает комментарий по идентификатору (без данных пользователя).

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

Обновляет содержание комментариев и/или рейтинг. Устанавливает `updatedAt` и `editedAt` для отслеживания истории редактирования.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**Шаблон SQL:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Примечание разработчика:** `editedAt` отделен от `updatedAt`, чтобы отличать изменения пользователя от обновлений системы. Пользовательский интерфейс может отображать «отредактированные» индикаторы на основе `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Программное удаление комментария осуществляется установкой `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**Шаблон SQL:**

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

## Примечания по производительности

1. **Параллельное выполнение запроса** – `getEngagementMetricsPerItem` одновременно выполняет все четыре запроса метрик через `Promise.all`, сокращая общую задержку до самого медленного отдельного запроса.

2. **Чистый подсчет голосов** – для расчета голосов "за" или "против" используются выражения `CASE WHEN` в SQL, избегая отдельных запросов для каждого типа голосования.

3. **Фильтрация обратимого удаления** – все запросы на комментарии последовательно фильтруют `deleted_at IS NULL`, чтобы исключить обратимое удаление комментариев.

4. **Нормализация слагов**. И `vote.queries.ts`, и `comment.queries.ts` нормализуют слаги элементов с помощью `getItemIdFromSlug` перед операциями с базой данных, обеспечивая согласованное сопоставление ключей.

5. **Защита пустого массива** – все функции массовых запросов немедленно возвращаются с пустыми картами при передаче пустых массивов.

## Примеры использования

### Сортировка товаров по популярности

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

### Переключить голосование за элемент

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Получение комментариев для страницы элемента

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
