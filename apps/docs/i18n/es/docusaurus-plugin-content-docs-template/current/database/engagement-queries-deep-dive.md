---
id: engagement-queries-deep-dive
title: Consultas de participación en profundidad
sidebar_label: Consultas de participación en profundidad
sidebar_position: 64
---

# Consultas de participación en profundidad

Referencia completa para todas las funciones de consulta de bases de datos relacionadas con la participación, incluidos votos, comentarios, favoritos, vistas, calificaciones y métricas de popularidad agregadas.

## Descripción general

La capa de consulta de participación está organizada en tres módulos especializados:

- **`engagement.queries.ts`** -- Agregación de métricas de participación masiva para puntuación de popularidad (vistas, votos, favoritos, comentarios, calificaciones)
- **`vote.queries.ts`** -- Operaciones CRUD de votación, cálculos de puntuación neta y clasificación de elementos basada en votos
- **`comment.queries.ts`** -- Comentar operaciones CRUD con detalles de usuario, eliminación temporal y gestión de calificaciones

## Archivos fuente

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

Obtiene el recuento de favoritos por artículo.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|si|Conjunto de babosas de elementos|

**Devoluciones:** `Promise<Map<string, number>>` -- Mapa del slug de elementos al recuento de favoritos

**Nota:** Consulta la tabla `favorites` usando `itemSlug` (no `itemId`), lo que refleja la convención de nomenclatura del esquema para esta tabla.

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

## Referencia de función: vote.queries.ts

### `createVote`

Crea un nuevo voto. Normaliza el itemId a través de `getItemIdFromSlug` antes de la inserción.

```typescript
async function createVote(vote: InsertVote)
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|si|Votar datos con item slug|

**Devoluciones:** El registro de votación creado (a través de `RETURNING`)

**Patrón SQL:**

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

Elimina permanentemente un voto por ID.

```typescript
async function deleteVote(voteId: string)
```

**Patrón SQL:**

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

Obtiene la puntuación neta de votos para un único elemento (votos a favor menos votos en contra).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Devoluciones:** Puntuación neta de votos (positivo = más votos a favor, negativo = más votos en contra, 0 = igual o ningún voto)

**Patrón SQL:**

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

## Referencia de función: comment.queries.ts

### `createComment`

Crea un nuevo comentario. Normaliza el `itemId` vía `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Devoluciones:** El registro de comentario creado.

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

Obtiene un comentario por ID (sin detalles del usuario).

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

Actualiza el contenido de los comentarios y/o la calificación. Establece `updatedAt` y `editedAt` para realizar un seguimiento del historial de edición.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**Patrón SQL:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Nota de diseño:** `editedAt` está separado de `updatedAt` para distinguir las ediciones del usuario de las actualizaciones del sistema. La interfaz de usuario puede mostrar indicadores "editados" basados ​​en `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

El software elimina un comentario configurando `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**Patrón SQL:**

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

## Notas de rendimiento

1. **Ejecución de consultas en paralelo**: `getEngagementMetricsPerItem` ejecuta las cuatro consultas de métricas simultáneamente a través de `Promise.all`, lo que reduce la latencia total a la consulta única más lenta.

2. **Puntuación de votos netos**: utiliza expresiones `CASE WHEN` en SQL para el cálculo de votos a favor/en contra, evitando consultas separadas para cada tipo de voto.

3. **Filtrado de eliminación temporal**: todas las consultas de comentarios filtran consistentemente `deleted_at IS NULL` para excluir los comentarios eliminados temporalmente.

4. **Normalización de slug**: tanto `vote.queries.ts` como `comment.queries.ts` normalizan los slugs de elementos a través de `getItemIdFromSlug` antes de las operaciones de la base de datos, asegurando una coincidencia de claves consistente.

5. **Guardias de matriz vacía**: todas las funciones de consulta masiva regresan inmediatamente con mapas vacíos cuando se pasan matrices vacías.

## Ejemplos de uso

### Ordenar artículos por popularidad

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

### Alternar votación sobre un artículo

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Obteniendo comentarios para una página de artículo

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
