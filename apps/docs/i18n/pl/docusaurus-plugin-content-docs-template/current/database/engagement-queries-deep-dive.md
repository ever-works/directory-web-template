---
id: engagement-queries-deep-dive
title: Zapytania o zaangażowanie Głębokie nurkowanie
sidebar_label: Zapytania o zaangażowanie Głębokie nurkowanie
sidebar_position: 64
---

# Zapytania o zaangażowanie Głębokie nurkowanie

Kompleksowe odniesienie do wszystkich funkcji zapytań do baz danych związanych z zaangażowaniem, w tym głosów, komentarzy, ulubionych, wyświetleń, ocen i zagregowanych wskaźników popularności.

## Przegląd

Warstwa zapytań dotyczących zaangażowania jest podzielona na trzy wyspecjalizowane moduły:

- **`engagement.queries.ts`** — Zbiorcza agregacja wskaźników zaangażowania w celu oceny popularności (wyświetlenia, głosy, ulubione, komentarze, oceny)
- **`vote.queries.ts`** — Głosuj na operacje CRUD, obliczenia wyniku netto i sortowanie przedmiotów na podstawie głosów
- **`comment.queries.ts`** — Komentuj operacje CRUD ze szczegółami użytkownika, nietrwałym usuwaniem i zarządzaniem ocenami

## Pliki źródłowe

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

Pobiera liczbę ulubionych na element.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Tak|Tablica ślimaków przedmiotów|

**Zwroty:** `Promise<Map<string, number>>` -- Mapa ślimaka przedmiotu do liczby ulubionych

**Uwaga:** Wysyła zapytanie do tabeli `favorites` przy użyciu `itemSlug` (a nie `itemId`), co odzwierciedla konwencję nazewnictwa schematu dla tej tabeli.

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

## Odniesienie do funkcji: głosowanie.queries.ts

### `createVote`

Tworzy nowy głos. Normalizuje itemId poprzez `getItemIdFromSlug` przed wstawieniem.

```typescript
async function createVote(vote: InsertVote)
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Tak|Głosuj na dane za pomocą item slug|

**Zwroty:** Utworzony zapis głosowania (przez `RETURNING`)

**Wzorzec SQL:**

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

Trwale usuwa głos oddany na podstawie identyfikatora.

```typescript
async function deleteVote(voteId: string)
```

**Wzorzec SQL:**

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

Pobiera wynik głosów netto dla pojedynczego elementu (głosy za minus).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Zwroty:** Wynik głosów netto (dodatni = więcej głosów za, ujemny = więcej głosów przeciw, 0 = równa liczba głosów lub brak głosów)

**Wzorzec SQL:**

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

## Odniesienie do funkcji: komentarz.queries.ts

### `createComment`

Tworzy nowy komentarz. Normalizuje `itemId` poprzez `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Zwroty:** Utworzony rekord komentarza

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

Pobiera komentarz według identyfikatora (bez danych użytkownika).

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

Aktualizuje treść komentarzy i/lub ocenę. Ustawia zarówno `updatedAt`, jak i `editedAt` śledzenie historii edycji.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**Wzorzec SQL:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Uwaga projektowa:** `editedAt` jest czymś odrębnym od `updatedAt`, aby odróżnić zmiany użytkownika od aktualizacji systemu. Interfejs użytkownika może wyświetlać „edytowane” wskaźniki w oparciu o `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft usuwa komentarz, ustawiając `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**Wzorzec SQL:**

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

## Uwagi dotyczące wydajności

1. **Równoległe wykonywanie zapytań** -- `getEngagementMetricsPerItem` uruchamia wszystkie cztery zapytania metryczne jednocześnie za pośrednictwem `Promise.all`, redukując całkowite opóźnienie do najwolniejszego pojedynczego zapytania.

2. **Ocena głosów netto** — Wykorzystuje wyrażenia `CASE WHEN` w języku SQL do obliczania głosów za/przeciw, unikając oddzielnych zapytań dla każdego typu głosowania.

3. **Filtrowanie nietrwałego usuwania** — wszystkie zapytania dotyczące komentarzy konsekwentnie filtrują `deleted_at IS NULL`, aby wykluczyć komentarze usunięte nietrwało.

4. **Normalizacja ślimaków** — Zarówno `vote.queries.ts`, jak i `comment.queries.ts` normalizują błędy elementów poprzez `getItemIdFromSlug` przed operacjami na bazie danych, zapewniając spójne dopasowanie kluczy.

5. **Ochrona pustych tablic** — Wszystkie funkcje zapytań zbiorczych zwracają się natychmiast z pustymi mapami po przekazaniu pustych tablic.

## Przykłady użycia

### Sortowanie artykułów według popularności

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

### Przełącz głosowanie na element

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Pobieranie komentarzy do strony elementu

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
