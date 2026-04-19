---
id: engagement-queries-deep-dive
title: Tiefer Einblick in Engagement-Anfragen
sidebar_label: Tiefer Einblick in Engagement-Anfragen
sidebar_position: 64
---

# Tiefer Einblick in Engagement-Anfragen

Umfassende Referenz für alle Datenbankabfragefunktionen im Zusammenhang mit Interaktionen, einschließlich Stimmen, Kommentaren, Favoriten, Ansichten, Bewertungen und aggregierten Beliebtheitsmetriken.

## Übersicht

Die Interaktionsabfrageebene ist in drei spezialisierte Module unterteilt:

- **`engagement.queries.ts`** – Massenaggregation von Engagement-Metriken zur Beliebtheitsbewertung (Aufrufe, Stimmen, Favoriten, Kommentare, Bewertungen)
- **`vote.queries.ts`** – Abstimmungs-CRUD-Operationen, Netto-Score-Berechnungen und abstimmungsbasierte Artikelsortierung
- **`comment.queries.ts`** – Kommentieren Sie CRUD-Vorgänge mit Benutzerdetails, vorläufigem Löschen und Bewertungsmanagement

## Quelldateien

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

Ruft die Anzahl der Favoriten pro Element ab.

```typescript
async function getFavoritesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-------------|------------|----------|----------------------|
|`itemSlugs`|`string[]`|Ja|Array von Item-Slugs|

**Rückgaben:** `Promise<Map<string, number>>` – Karte des Artikel-Slugs zur Anzahl der Favoriten

**Hinweis:** Fragt die Tabelle `favorites` mit `itemSlug` (nicht `itemId`) ab, was die Namenskonvention des Schemas für diese Tabelle widerspiegelt.

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

## Funktionsreferenz: vote.queries.ts

### `createVote`

Erstellt eine neue Abstimmung. Normalisiert die Artikel-ID über `getItemIdFromSlug` vor dem Einfügen.

```typescript
async function createVote(vote: InsertVote)
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-----------|--------------|----------|----------------------------|
|`vote`|`InsertVote`|Ja|Abstimmungsdaten mit Item-Slug|

**Rückgabe:** Der erstellte Abstimmungsdatensatz (über `RETURNING`)

**SQL-Muster:**

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

Löscht eine Abstimmung nach ID dauerhaft.

```typescript
async function deleteVote(voteId: string)
```

**SQL-Muster:**

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

Ruft den Netto-Stimmenwert für ein einzelnes Element ab (Upvotes minus Downvotes).

```typescript
async function getVoteCountForItem(itemSlug: string): Promise<number>
```

**Ergebnisse:** Netto-Stimmenwert (positiv = mehr positive Stimmen, negativ = mehr negative Stimmen, 0 = gleiche oder keine Stimmen)

**SQL-Muster:**

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

## Funktionsreferenz: comment.queries.ts

### `createComment`

Erstellt einen neuen Kommentar. Normalisiert den `itemId` über `getItemIdFromSlug`.

```typescript
async function createComment(data: NewComment)
```

**Rückgabe:** Der erstellte Kommentardatensatz

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

Ruft einen Kommentar nach ID ab (ohne Benutzerdetails).

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

Aktualisiert den Kommentarinhalt und/oder die Bewertung. Legt sowohl `updatedAt` als auch `editedAt` fest, um den Bearbeitungsverlauf zu verfolgen.

```typescript
async function updateComment(
  id: string,
  data: { content?: string; rating?: number }
)
```

**SQL-Muster:**

```sql
UPDATE comments
SET content = ?, rating = ?, updated_at = NOW(), edited_at = NOW()
WHERE id = ?
RETURNING *;
```

**Designhinweis:** `editedAt` ist von `updatedAt` getrennt, um Benutzeränderungen von Systemaktualisierungen zu unterscheiden. Die Benutzeroberfläche kann „bearbeitete“ Indikatoren basierend auf `editedAt` anzeigen.

---

### `updateCommentRating`

Updates only the rating on a comment.

```typescript
async function updateCommentRating(id: string, rating: number)
```

---

### `deleteComment`

Soft löscht einen Kommentar durch Setzen von `deletedAt`.

```typescript
async function deleteComment(id: string)
```

**SQL-Muster:**

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

## Leistungshinweise

1. **Parallele Abfrageausführung** – `getEngagementMetricsPerItem` führt alle vier Metrikabfragen gleichzeitig über `Promise.all` aus und reduziert so die Gesamtlatenz auf die langsamste Einzelabfrage.

2. **Netto-Stimmenbewertung** – Verwendet `CASE WHEN`-Ausdrücke in SQL für die Upvote-/Downvote-Berechnung, wodurch separate Abfragen für jeden Abstimmungstyp vermieden werden.

3. **Filterung für vorläufiges Löschen** – Alle Kommentarabfragen filtern konsequent `deleted_at IS NULL`, um vorläufig gelöschte Kommentare auszuschließen.

4. **Slug-Normalisierung** – Sowohl `vote.queries.ts` als auch `comment.queries.ts` normalisieren Element-Slugs über `getItemIdFromSlug` vor Datenbankoperationen und stellen so eine konsistente Schlüsselübereinstimmung sicher.

5. **Schutzvorrichtungen für leere Arrays** – Alle Massenabfragefunktionen kehren sofort mit leeren Maps zurück, wenn leere Arrays übergeben werden.

## Anwendungsbeispiele

### Artikel nach Beliebtheit sortieren

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

### Abstimmung für einen Artikel umschalten

```typescript
import { getVoteByUserIdAndItemId, createVote, deleteVote } from '@/lib/db/queries';

const existingVotes = await getVoteByUserIdAndItemId(userId, 'clockify');

if (existingVotes.length > 0) {
  await deleteVote(existingVotes[0].id);
} else {
  await createVote({ userId, itemId: 'clockify', voteType: 'upvote' });
}
```

### Kommentare für eine Artikelseite abrufen

```typescript
import { getCommentsByItemId } from '@/lib/db/queries';

const comments = await getCommentsByItemId('toggl');
// Each comment includes user.name and user.image for display
```
