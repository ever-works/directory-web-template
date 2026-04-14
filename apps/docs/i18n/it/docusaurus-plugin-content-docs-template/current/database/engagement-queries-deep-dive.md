---
id: engagement-queries-deep-dive
title: Approfondimento delle query di coinvolgimento
sidebar_label: Approfondimento delle query di coinvolgimento
sidebar_position: 64
---

# Approfondimento delle query di coinvolgimento

Riferimento completo per tutte le funzioni di query del database relative al coinvolgimento, inclusi voti, commenti, preferiti, visualizzazioni, valutazioni e metriche di popolarità aggregate.

## Panoramica

Il livello delle query di coinvolgimento è organizzato in tre moduli specializzati:

- **`engagement.queries.ts`** -- Aggregazione collettiva delle metriche di coinvolgimento per il punteggio di popolarità (visualizzazioni, voti, preferiti, commenti, valutazioni)
- **`vote.queries.ts`** -- Operazioni CRUD di voto, calcoli del punteggio netto e ordinamento degli elementi basato sul voto
- **`comment.queries.ts`** -- Commenta le operazioni CRUD con i dettagli dell'utente, l'eliminazione temporanea e la gestione della valutazione

## File di origine

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

Ottiene il conteggio dei preferiti per articolo.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Sì|Matrice di slug di oggetti|

**Resi:** `Promise<Map<string, number>>` -- Mappa del conteggio degli articoli nel conteggio dei preferiti

**Nota:** interroga la tabella `favorites` utilizzando `itemSlug` (non `itemId`), riflettendo la convenzione di denominazione dello schema per questa tabella.

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

## Riferimento alla funzione: vote.queries.ts

### `createVote`

Crea un nuovo voto. Normalizza l'itemId tramite `getItemIdFromSlug` prima dell'inserimento.

```typescript
async function createVote(vote: InsertVote)
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Sì|Dati di voto con slug articolo|

**Restituisce:** Il record di voto creato (tramite `RETURNING`)

**Modello SQL:**

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

Elimina permanentemente un voto per ID.

```typescript
async function deleteVote(voteId: string)
```

**Modello SQL:**

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

Ottiene il punteggio netto del voto per un singolo elemento (voti positivi meno voti negativi).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Restituisce:** Punteggio voto netto (positivo = più voti positivi, negativo = più voti negativi, 0 = voto uguale o nessun voto)

**Modello SQL:**

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

## Riferimento funzione: comment.queries.ts

### `createComment`

Crea un nuovo commento. Normalizza `itemId` tramite `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Restituisce:** Il record del commento creato

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

Ottiene un commento per ID (senza dettagli dell'utente).

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

Aggiorna il contenuto dei commenti e/o la valutazione. Imposta `updatedAt` e `editedAt` per tenere traccia della cronologia delle modifiche.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**Modello SQL:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Nota di progettazione:** `editedAt` è separato da `updatedAt` per distinguere le modifiche dell'utente dagli aggiornamenti del sistema. L'interfaccia utente può visualizzare indicatori "modificati" in base a `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft elimina un commento impostando `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**Modello SQL:**

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

## Note sulle prestazioni

1. **Esecuzione di query parallele** -- `getEngagementMetricsPerItem` esegue tutte e quattro le query di metriche contemporaneamente tramite `Promise.all`, riducendo la latenza totale alla singola query più lenta.

2. **Punteggio voto netto** -- Utilizza le espressioni `CASE WHEN` in SQL per il calcolo del voto positivo/negativo, evitando query separate per ciascun tipo di voto.

3. **Filtro per l'eliminazione temporanea** -- Tutte le query relative ai commenti filtrano costantemente `deleted_at IS NULL` per escludere i commenti eliminati temporaneamente.

4. **Normalizzazione slug** -- Sia `vote.queries.ts` che `comment.queries.ts` normalizzano gli slug degli elementi tramite `getItemIdFromSlug` prima delle operazioni del database, garantendo una corrispondenza coerente delle chiavi.

5. **Protezioni di array vuoti** -- Tutte le funzioni di query di massa restituiscono immediatamente mappe vuote quando vengono passati array vuoti.

## Esempi di utilizzo

### Ordinamento degli articoli per popolarità

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

### Attiva/disattiva la votazione su un elemento

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Recupero dei commenti per la pagina di un elemento

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
