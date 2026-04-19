---
id: engagement-queries-deep-dive
title: Aprofundamento nas consultas de engajamento
sidebar_label: Aprofundamento nas consultas de engajamento
sidebar_position: 64
---

# Aprofundamento nas consultas de engajamento

Referência abrangente para todas as funções de consulta de banco de dados relacionadas ao engajamento, incluindo votos, comentários, favoritos, visualizações, classificações e métricas de popularidade agregadas.

## Visão geral

A camada de consulta de engajamento é organizada em três módulos especializados:

- **`engagement.queries.ts`** -- Agregação de métricas de engajamento em massa para pontuação de popularidade (visualizações, votos, favoritos, comentários, classificações)
- **`vote.queries.ts`** -- Operações de votação CRUD, cálculos de pontuação líquida e classificação de itens com base em votos
- **`comment.queries.ts`** -- Comente operações CRUD com detalhes do usuário, exclusão reversível e gerenciamento de classificação

## Arquivos de origem

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

Obtém a contagem de favoritos por item.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Sim|Matriz de slugs de itens|

**Retornos:** `Promise<Map<string, number>>` -- Mapa do slug do item para contagem de favoritos

**Observação:** Consulta a tabela `favorites` usando `itemSlug` (não `itemId`), refletindo a convenção de nomenclatura do esquema para esta tabela.

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

## Referência da função: vote.queries.ts

### `createVote`

Cria uma nova votação. Normaliza o itemId via `getItemIdFromSlug` antes da inserção.

```typescript
async function createVote(vote: InsertVote)
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Sim|Dados de votação com slug de item|

**Retorna:** O registro de voto criado (via `RETURNING`)

**Padrão SQL:**

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

Exclui permanentemente um voto por ID.

```typescript
async function deleteVote(voteId: string)
```

**Padrão SQL:**

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

Obtém a pontuação líquida de votos para um único item (votos positivos menos votos negativos).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Retornos:** Pontuação líquida de votos (positiva = mais votos positivos, negativa = mais votos negativos, 0 = votos iguais ou nenhum voto)

**Padrão SQL:**

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

## Referência da função: comment.queries.ts

### `createComment`

Cria um novo comentário. Normaliza o `itemId` via `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Retorna:** O registro de comentário criado

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

Obtém um comentário por ID (sem detalhes do usuário).

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

Atualiza o conteúdo e/ou classificação dos comentários. Define `updatedAt` e `editedAt` para rastrear o histórico de edições.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**Padrão SQL:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Nota de design:** `editedAt` é separado de `updatedAt` para distinguir as edições do usuário das atualizações do sistema. A UI pode exibir indicadores "editados" com base em `editedAt`.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Exclui suavemente um comentário definindo `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**Padrão SQL:**

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

## Notas de Desempenho

1. **Execução de consulta paralela** -- `getEngagementMetricsPerItem` executa todas as quatro consultas métricas simultaneamente via `Promise.all`, reduzindo a latência total para a consulta única mais lenta.

2. **Pontuação líquida de votos** -- Usa expressões `CASE WHEN` em SQL para cálculo de votos positivos/negativos, evitando consultas separadas para cada tipo de voto.

3. **Filtragem de exclusão reversível** – Todas as consultas de comentários filtram consistentemente `deleted_at IS NULL` para excluir comentários excluídos reversivelmente.

4. **Normalização de slugs** -- Tanto `vote.queries.ts` quanto `comment.queries.ts` normalizam slugs de itens via `getItemIdFromSlug` antes das operações do banco de dados, garantindo correspondência de chaves consistente.

5. **Protetores de matriz vazia** – Todas as funções de consulta em massa retornam imediatamente com mapas vazios quando são passadas matrizes vazias.

## Exemplos de uso

### Classificando itens por popularidade

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

### Alternar votação em um item

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Buscando comentários para uma página de item

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
