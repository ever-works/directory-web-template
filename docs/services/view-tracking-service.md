---
id: view-tracking-service
title: View Tracking Service
sidebar_label: View Tracking Service
sidebar_position: 38
---

# View Tracking Service

The view tracking system records item page views with daily per-viewer deduplication. It provides total counts, recent counts, daily breakdowns, and per-item aggregations for dashboards and the popularity scoring algorithm.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Item View Queries | `lib/db/queries/item-view.queries.ts` | Recording and querying views |
| Engagement Queries | `lib/db/queries/engagement.queries.ts` | Aggregated view metrics |
| Schema | `lib/db/schema.ts` | `item_views` table definition |

## Database Schema

### item_views

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` (UUID) | Primary key |
| `item_id` | `text` | Item slug being viewed |
| `viewer_id` | `text` | Identifier for the viewer (user ID or anonymous hash) |
| `viewed_date_utc` | `text` | Date string in `YYYY-MM-DD` format (UTC) |
| `viewed_at` | `timestamp` | Exact view timestamp with timezone |

### Constraints and Indexes

- **Unique daily view**: `item_views_unique_daily_idx` on `(item_id, viewer_id, viewed_date_utc)` prevents counting the same viewer twice on the same day
- **Item-date index**: `item_views_item_date_idx` on `(item_id, viewed_date_utc)` for efficient date-range queries

## Daily Deduplication

The core design principle is that each viewer can only generate one view per item per UTC day. This is enforced at the database level using `ON CONFLICT DO NOTHING`:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

The function returns `true` if a new view was recorded, or `false` if it was a duplicate for the same day.

## UTC Date Handling

All date calculations use UTC to avoid timezone-related off-by-one errors:

```ts
function getUtcDateString(daysAgo: number = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().split('T')[0];
}
```

This ensures consistent behavior regardless of server timezone.

## View Aggregation Queries

### Total Views

Count all views for a set of items across all time:

```ts
export async function getTotalViewsCount(
  itemSlugs: string[]
): Promise<number> {
  if (itemSlugs.length === 0) return 0;

  const [result] = await db
    .select({ count: count() })
    .from(itemViews)
    .where(inArray(itemViews.itemId, itemSlugs));

  return Number(result?.count ?? 0);
}
```

### Recent Views

Count views within the last N days:

```ts
export async function getRecentViewsCount(
  itemSlugs: string[],
  days: number = 7
): Promise<number> {
  if (itemSlugs.length === 0) return 0;

  const startDateStr = getUtcDateString(days);

  const [result] = await db
    .select({ count: count() })
    .from(itemViews)
    .where(
      and(
        inArray(itemViews.itemId, itemSlugs),
        gte(itemViews.viewedDateUtc, startDateStr)
      )
    );
  return Number(result?.count ?? 0);
}
```

### Daily View Breakdown

Returns a map of date strings to view counts, suitable for charting:

```ts
export async function getDailyViewsData(
  itemSlugs: string[],
  days: number = 7
): Promise<Map<string, number>> {
  if (itemSlugs.length === 0) return new Map();

  const startDateStr = getUtcDateString(days);

  const dailyViews = await db
    .select({
      date: itemViews.viewedDateUtc,
      count: count(),
    })
    .from(itemViews)
    .where(
      and(
        inArray(itemViews.itemId, itemSlugs),
        gte(itemViews.viewedDateUtc, startDateStr)
      )
    )
    .groupBy(itemViews.viewedDateUtc);

  return new Map(
    dailyViews.map((d) => [d.date, Number(d.count)])
  );
}
```

### Per-Item View Counts

For displaying view counts on listing pages:

```ts
export async function getViewsPerItem(
  itemSlugs: string[]
): Promise<Map<string, number>> {
  if (itemSlugs.length === 0) return new Map();

  const viewCounts = await db
    .select({
      itemId: itemViews.itemId,
      count: count(),
    })
    .from(itemViews)
    .where(inArray(itemViews.itemId, itemSlugs))
    .groupBy(itemViews.itemId);

  return new Map(
    viewCounts.map((v) => [v.itemId, Number(v.count)])
  );
}
```

## Engagement Integration

Views are included in the bulk engagement metrics query:

```ts
// lib/db/queries/engagement.queries.ts
export async function getEngagementMetricsPerItem(
  itemSlugs: string[]
): Promise<Map<string, ItemEngagementMetrics>> {
  const [viewsData, votesData, favoritesData, commentsData] =
    await Promise.all([
      db.select({ itemId: itemViews.itemId, count: count() })
        .from(itemViews)
        .where(inArray(itemViews.itemId, itemSlugs))
        .groupBy(itemViews.itemId),
      // ... votes, favorites, comments
    ]);
  // Combine into metrics map
}
```

## Popularity Score Impact

Views contribute to the popularity score with logarithmic scaling (weight 1000):

```ts
// lib/services/engagement.service.ts
// Views: 10 views = 1000 pts, 1000 views = 3000 pts, 1M views = 6000 pts
score += logScale(engagement.views, 1000);
```

## View Recording Flow

1. User visits an item detail page
2. Client or server identifies the viewer (authenticated user ID or anonymous hash)
3. Current UTC date is computed as `YYYY-MM-DD`
4. `recordItemView()` attempts an insert with `ON CONFLICT DO NOTHING`
5. If the viewer already viewed this item today, the insert is silently skipped
6. The function returns `true` for new views, `false` for duplicates

## Performance Considerations

- **Deduplication at database level** -- The unique index handles deduplication without application logic
- **Bulk queries** -- All aggregation functions accept arrays of item slugs to minimize round trips
- **UTC-only dates** -- Stored as text strings (`YYYY-MM-DD`) for simple date-range queries without timezone conversion
- **Empty array guard** -- Every query function short-circuits with empty results when given an empty slug array

## Admin Analytics Integration

The admin dashboard uses view counts via the `AdminStatsRepository`:

```ts
// lib/repositories/admin-stats.repository.ts
async getActivityStats(): Promise<ActivityStats> {
  const [totalVotesResult, totalCommentsResult, totalViews] =
    await Promise.all([
      db.select({ count: count() }).from(votes),
      db.select({ count: count() }).from(comments)
        .where(isNull(comments.deletedAt)),
      postHogApiService.isConfigured()
        ? postHogApiService.getTotalPageViews()
        : Promise.resolve(0),
    ]);
  // ...
}
```

## Related Documentation

- [Engagement Service](/docs/template/services/engagement-services) -- Popularity scoring
- [Vote Service](/docs/template/services/vote-service) -- Upvote/downvote system
- [PostHog Service](/docs/template/services/posthog-service) -- External analytics
