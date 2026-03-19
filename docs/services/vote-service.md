---
id: vote-service
title: Vote Service
sidebar_label: Vote Service
sidebar_position: 37
---

# Vote Service

The voting system enables authenticated users to upvote or downvote items. It calculates net scores (upvotes minus downvotes), enforces one-vote-per-user-per-item via a unique database constraint, and integrates with the engagement and popularity scoring systems.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Vote Queries | `lib/db/queries/vote.queries.ts` | Database CRUD for votes |
| Engagement Queries | `lib/db/queries/engagement.queries.ts` | Aggregated vote metrics |
| Engagement Service | `lib/services/engagement.service.ts` | Popularity scoring algorithm |
| Dashboard Queries | `lib/db/queries/dashboard.queries.ts` | Vote counts for dashboards |
| Schema | `lib/db/schema.ts` | Vote table and types |

## Database Schema

### votes

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` (UUID) | Primary key |
| `userid` | `text` | FK to `client_profiles.id` (cascade delete) |
| `item_id` | `text` | Item slug |
| `vote_type` | `text` | `upvote` or `downvote` (default: `upvote`) |
| `created_at` | `timestamp` | When the vote was cast |
| `updated_at` | `timestamp` | Last modification |

### Constraints and Indexes

- **Unique constraint**: `unique_user_item_vote_idx` on `(userid, item_id)` ensures one vote per user per item
- **Item index**: `item_votes_idx` on `item_id` for fast per-item lookups
- **Created-at index**: `votes_created_at_idx` for time-based queries

### Vote Types

```ts
export const VoteType = {
  UPVOTE: 'upvote',
  DOWNVOTE: 'downvote',
} as const;

export type VoteTypeValues =
  (typeof VoteType)[keyof typeof VoteType];
```

## Vote Queries

### Creating a Vote

```ts
export async function createVote(vote: InsertVote) {
  const normalizedVote = {
    ...vote,
    itemId: getItemIdFromSlug(vote.itemId),
  };
  const [createdVote] = await db
    .insert(votes)
    .values(normalizedVote)
    .returning();
  return createdVote;
}
```

The `itemId` is normalized through `getItemIdFromSlug` for consistent slug formatting.

### Looking Up a User's Vote

```ts
export async function getVoteByUserIdAndItemId(
  userId: string,
  itemSlug: string
) {
  const itemId = getItemIdFromSlug(itemSlug);
  return db
    .select()
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.itemId, itemId)))
    .limit(1);
}
```

Returns an empty array if the user has not voted on the item.

### Deleting a Vote

```ts
export async function deleteVote(voteId: string) {
  return db.delete(votes).where(eq(votes.id, voteId));
}
```

Votes are hard-deleted (not soft-deleted) since toggling a vote off should remove it entirely.

### Net Score for a Single Item

The net score is calculated as upvotes minus downvotes using a SQL `CASE` expression:

```ts
export async function getVoteCountForItem(
  itemSlug: string
): Promise<number> {
  const itemId = getItemIdFromSlug(itemSlug);
  const [result] = await db
    .select({
      netScore: sql<number>`
        SUM(CASE
          WHEN vote_type = 'upvote' THEN 1
          WHEN vote_type = 'downvote' THEN -1
          ELSE 0
        END)
      `.as('netScore'),
    })
    .from(votes)
    .where(eq(votes.itemId, itemId));
  return Number(result?.netScore ?? 0);
}
```

### Bulk Net Scores

For listing pages, get scores for multiple items in one query:

```ts
export async function getVotesPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>> {
  if (itemSlugs.length === 0) return new Map();

  const voteCounts = await db
    .select({
      itemId: votes.itemId,
      netScore: sql<number>`
        SUM(CASE
          WHEN vote_type = 'upvote' THEN 1
          WHEN vote_type = 'downvote' THEN -1
          ELSE 0
        END)
      `.as('netScore'),
    })
    .from(votes)
    .where(inArray(votes.itemId, itemSlugs))
    .groupBy(votes.itemId);

  return new Map(
    voteCounts.map((v) => [v.itemId, Number(v.netScore ?? 0)])
  );
}
```

### Items Sorted by Total Votes

```ts
export async function getItemsSortedByVotes(
  limit: number = 10,
  offset: number = 0
) {
  return db
    .select({
      itemId: votes.itemId,
      voteCount: sql<number>`count(${votes.id})`.as('vote_count'),
    })
    .from(votes)
    .groupBy(votes.itemId)
    .orderBy(sql`vote_count DESC`)
    .limit(limit)
    .offset(offset);
}
```

## Popularity Scoring

Votes are a key factor in the popularity scoring algorithm in `lib/services/engagement.service.ts`:

```ts
export function calculatePopularityScore(
  item: ItemWithEngagement
): number {
  let score = 0;

  if (item.featured) score += 10000;

  const engagement = item.engagement;
  if (engagement) {
    // Votes use logarithmic scaling with weight 1200
    // Only positive net votes contribute
    score += logScale(Math.max(engagement.votes, 0), 1200);
    // ... views, favorites, comments, rating also contribute
  }

  // Recency bonus decays over 180 days
  // ...
  return score;
}
```

The logarithmic scaling function ensures the score differentiates well even at high volumes:

```ts
function logScale(value: number, weight: number = 1000): number {
  if (value <= 0) return 0;
  return Math.log10(value + 1) * weight;
}
```

At 10 net votes the contribution is 1,200 points, at 1,000 votes it is 3,600, and at 1,000,000 votes it is 7,200.

## Vote Toggle Flow

1. User clicks the upvote or downvote button
2. API checks `getVoteByUserIdAndItemId()` for existing vote
3. **No existing vote** -- `createVote()` inserts a new record
4. **Same vote type exists** -- `deleteVote()` removes it (toggle off)
5. **Different vote type exists** -- `deleteVote()` then `createVote()` with the new type
6. The unique constraint `(userid, item_id)` prevents duplicate votes at the database level

## Dashboard Integration

### Total Votes Received

```ts
export async function getVotesReceivedCount(
  itemSlugs: string[]
): Promise<number>
```

### Weekly Vote Trends

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

## Engagement Metrics

The `getEngagementMetricsPerItem` function fetches all engagement data (views, votes, favorites, comments) in parallel for efficiency:

```ts
export async function getEngagementMetricsPerItem(
  itemSlugs: string[]
): Promise<Map<string, ItemEngagementMetrics>> {
  const [viewsData, votesData, favoritesData, commentsData] =
    await Promise.all([
      // Views query
      // Net votes query (same SUM/CASE pattern)
      // Favorites query
      // Comments + avg rating query
    ]);
  // Combine into Map
}
```

## Related Documentation

- [Voting & Comments Feature](/template/features/voting-comments) -- UI components
- [Engagement Service](/template/services/engagement-services) -- Full engagement metrics
- [Comment Service](/template/services/comment-service) -- Comment system
