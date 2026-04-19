---
id: engagement-queries-deep-dive
title: Analyse approfondie des requêtes d'engagement
sidebar_label: Analyse approfondie des requêtes d'engagement
sidebar_position: 64
---

# Analyse approfondie des requêtes d'engagement

Référence complète pour toutes les fonctions de requête de base de données liées à l'engagement, y compris les votes, les commentaires, les favoris, les vues, les notes et les mesures de popularité agrégées.

## Aperçu

La couche de requêtes d'engagement est organisée en trois modules spécialisés :

- **`engagement.queries.ts`** -- Agrégation de mesures d'engagement en masse pour le score de popularité (vues, votes, favoris, commentaires, notes)
- **`vote.queries.ts`** -- Opérations de vote CRUD, calculs du score net et tri des éléments en fonction du vote
- **`comment.queries.ts`** -- Commentez les opérations CRUD avec les détails de l'utilisateur, la suppression logicielle et la gestion des notes

## Fichiers sources

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

Obtient le nombre de favoris par élément.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Oui|Tableau de limaces d'éléments|

**Retours :** `Promise<Map<string, number>>` -- Carte du slug d'élément vers le nombre de favoris

**Remarque :** Interroge la table `favorites` à l'aide de `itemSlug` (et non de `itemId`), reflétant la convention de dénomination du schéma pour cette table.

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

## Référence de la fonction : vote.queries.ts

### `createVote`

Crée un nouveau vote. Normalise l'itemId via `getItemIdFromSlug` avant l'insertion.

```typescript
async function createVote(vote: InsertVote)
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Oui|Données de vote avec élément slug|

**Renvoie :** L'enregistrement de vote créé (via `RETURNING`)

**Modèle SQL :**

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

Supprime définitivement un vote par ID.

```typescript
async function deleteVote(voteId: string)
```

**Modèle SQL :**

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

Obtient le score de vote net pour un seul élément (votes positifs moins votes négatifs).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Retours :** Score de vote net (positif = plus de votes positifs, négatif = plus de votes négatifs, 0 = votes égaux ou nuls)

**Modèle SQL :**

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

## Référence de la fonction : comment.queries.ts

### `createComment`

Crée un nouveau commentaire. Normalise le `itemId` via `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Renvoie :** L'enregistrement de commentaire créé

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

Obtient un commentaire par ID (sans détails utilisateur).

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

Met à jour le contenu des commentaires et/ou la note. Définit à la fois `updatedAt` et `editedAt` pour suivre l'historique des modifications.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**Modèle SQL :**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Note de conception :** `editedAt` est distinct de `updatedAt` pour distinguer les modifications utilisateur des mises à jour du système. L'interface utilisateur peut afficher des indicateurs « modifiés » basés sur `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft supprime un commentaire en définissant `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**Modèle SQL :**

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

## Notes de performances

1. **Exécution de requêtes parallèles** -- `getEngagementMetricsPerItem` exécute les quatre requêtes métriques simultanément via `Promise.all`, réduisant ainsi la latence totale à la requête unique la plus lente.

2. **Score de vote net** -- Utilise les expressions `CASE WHEN` dans SQL pour le calcul des votes positifs/contre, évitant ainsi les requêtes distinctes pour chaque type de vote.

3. **Filtrage de suppression logicielle** -- Toutes les requêtes de commentaires filtrent systématiquement `deleted_at IS NULL` pour exclure les commentaires supprimés de manière logicielle.

4. **Normalisation des slugs** -- `vote.queries.ts` et `comment.queries.ts` normalisent les slugs d'éléments via `getItemIdFromSlug` avant les opérations de base de données, garantissant ainsi une correspondance de clé cohérente.

5. **Gardes de tableau vides** -- Toutes les fonctions de requête groupée renvoient immédiatement avec des cartes vides lorsqu'elles transmettent des tableaux vides.

## Exemples d'utilisation

### Trier les éléments par popularité

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

### Activer/désactiver le vote sur un élément

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Récupérer des commentaires pour une page d'article

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
