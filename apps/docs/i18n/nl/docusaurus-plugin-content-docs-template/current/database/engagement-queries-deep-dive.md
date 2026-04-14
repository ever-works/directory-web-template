---
id: engagement-queries-deep-dive
title: Betrokkenheidsvragen Deep Dive
sidebar_label: Betrokkenheidsvragen Deep Dive
sidebar_position: 64
---

# Betrokkenheidsvragen Deep Dive

Uitgebreide referentie voor alle betrokkenheidsgerelateerde databasequeryfuncties, inclusief stemmen, opmerkingen, favorieten, weergaven, beoordelingen en geaggregeerde populariteitsstatistieken.

## Overzicht

De betrokkenheidsquerylaag is georganiseerd in drie gespecialiseerde modules:

- **`engagement.queries.ts`** -- Bulk-aggregatie van betrokkenheidsstatistieken voor populariteitsscores (weergaven, stemmen, favorieten, opmerkingen, beoordelingen)
- **`vote.queries.ts`** -- Stem-CRUD-bewerkingen, nettoscoreberekeningen en op stemmen gebaseerde itemsortering
- **`comment.queries.ts`** -- Reageer op CRUD-bewerkingen met gebruikersgegevens, zachte verwijdering en beoordelingsbeheer

## Bronbestanden

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

Krijgt het aantal favorieten per item.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Ja|Array van item-slakken|

**Retourzendingen:** `Promise<Map<string, number>>` -- Kaart van item-slug naar favorieten telt

**Opmerking:** Voert een query uit op de `favorites` tabel met behulp van `itemSlug` (niet `itemId`), wat de naamgevingsconventie van het schema voor deze tabel weerspiegelt.

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

## Functiereferentie: vote.queries.ts

### `createVote`

Creëert een nieuwe stemming. Normaliseert de itemId via `getItemIdFromSlug` vóór het invoegen.

```typescript
async function createVote(vote: InsertVote)
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Ja|Stemgegevens met item-slug|

**Retouren:** Het aangemaakte stemrecord (via `RETURNING`)

**SQL-patroon:**

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

Verwijdert permanent een stem op ID.

```typescript
async function deleteVote(voteId: string)
```

**SQL-patroon:**

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

Krijgt de netto stemscore voor één item (upvotes minus downvotes).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Returns:** Netto stemscore (positief = meer stemmen omhoog, negatief = meer stemmen omlaag, 0 = gelijk of geen stemmen)

**SQL-patroon:**

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

## Functiereferentie: comment.queries.ts

### `createComment`

Creëert een nieuwe opmerking. Normaliseert de `itemId` via `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Retourneert:** Het gemaakte commentaarrecord

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

Krijgt een opmerking per ID (zonder gebruikersgegevens).

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

Werkt commentaarinhoud en/of beoordeling bij. Stelt zowel `updatedAt` als `editedAt` in om de bewerkingsgeschiedenis bij te houden.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**SQL-patroon:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Ontwerpopmerking:** `editedAt` staat los van `updatedAt` om gebruikersbewerkingen te onderscheiden van systeemupdates. De gebruikersinterface kan "bewerkte" indicatoren weergeven op basis van `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft verwijdert een opmerking door `deletedAt` in te stellen.

```typescript
async function deleteComment(id: string)
```

**SQL-patroon:**

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

## Prestatienotities

1. **Parallelle uitvoering van query's** -- `getEngagementMetricsPerItem` voert alle vier de metrische query's gelijktijdig uit via `Promise.all`, waardoor de totale latentie wordt teruggebracht tot de langzaamste enkele query.

2. **Netto stemscore** -- Gebruikt `CASE WHEN`-expressies in SQL voor de berekening van stemmen omhoog/omlaag, waarbij afzonderlijke zoekopdrachten voor elk stemtype worden vermeden.

3. **Zacht verwijderen filteren** - Alle opmerkingenquery's filteren consequent `deleted_at IS NULL` om zacht verwijderde opmerkingen uit te sluiten.

4. **Slug-normalisatie** - Zowel `vote.queries.ts` als `comment.queries.ts` normaliseren item-slugs via `getItemIdFromSlug` vóór databasebewerkingen, waardoor consistente sleutelmatching wordt gegarandeerd.

5. **Lege array guards** - Alle bulkqueryfuncties keren onmiddellijk terug met lege kaarten wanneer lege arrays worden doorgegeven.

## Gebruiksvoorbeelden

### Artikelen sorteren op populariteit

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

### Schakel stemmen op een item in of uit

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Opmerkingen ophalen voor een itempagina

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
