---
id: engagement-endpoints
title: "Engagement API Endpoints"
sidebar_label: "Engagement"
sidebar_position: 12
---

# Engagement API Endpoints

The Engagement API provides endpoints for retrieving engagement metrics (views, votes, ratings, favorites, comments) and computing popularity scores for items. These endpoints power the sorting, ranking, and analytics features of the template.

**Source files:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/items/engagement` | None | Fetch engagement metrics for multiple items |
| GET | `/api/items/popularity-scores` | None | Get items sorted by computed popularity score |

Both endpoints use `dynamic = 'force-dynamic'` to ensure fresh data on every request.

---

## GET `/api/items/engagement`

Fetches engagement metrics for multiple items identified by their slugs. Returns a map of slug to metrics.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `slugs` | string | **Yes** | -- | Comma-separated list of item slugs |

### Constraints

- The `slugs` parameter is **required**. Omitting it returns a 400 error.
- Maximum of **200 slugs** per request. Exceeding this limit returns a 400 error.

### How It Works

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Response Shape

#### 200 -- Metrics Retrieved

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Empty (no slugs provided after parsing)

```json
{
  "metrics": {}
}
```

#### 400 -- Missing Slugs

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Too Many Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Server Error

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Usage Example

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Access individual item metrics
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

A debug/analytics endpoint that returns items sorted by their computed popularity score. The scoring algorithm uses logarithmic scaling and considers multiple engagement signals plus recency.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | `20` | Number of items to return (max 100) |
| `locale` | string | No | `"en"` | Locale for fetching item data |

### Scoring Algorithm

The popularity score is computed as a sum of weighted components:

| Component | Weight | Formula |
|-----------|--------|---------|
| Featured boost | +10,000 | Flat bonus for featured items |
| Views | 1,000x | `log10(views + 1) * 1000` |
| Votes | 1,200x | `log10(max(votes, 0) + 1) * 1200` |
| Average Rating | 500x | `avgRating * 500` |
| Favorites | 1,100x | `log10(favorites + 1) * 1100` |
| Comments | 1,000x | `log10(comments + 1) * 1000` |
| Recency (under 30 days) | up to +1,000 | Linear decay over 30 days |
| Recency (30-90 days) | up to +500 | Linear decay over next 60 days |
| Recency (90-180 days) | up to +250 | Linear decay over next 90 days |

Items without engagement data receive a heuristic fallback score based on tag count, name length, icon presence, and promo code existence.

### Response Shape

#### 200 -- Scores Retrieved

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### Usage Example

```ts
// Fetch top 10 most popular items
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Score: ${item.score}`);
});
```

### Notes

- The scoring algorithm matches the production sorting logic in `sort-utils.ts`.
- Logarithmic scaling prevents items with extremely high view counts from dominating the ranking.
- The recency bonus ensures newly added items receive a temporary visibility boost.
- Items are sorted by score descending; ties are broken alphabetically by name.

### Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/items/engagement/route.ts` | Engagement metrics endpoint |
| `template/app/api/items/popularity-scores/route.ts` | Popularity scoring endpoint |
| `template/lib/db/queries/engagement.queries.ts` | Database queries for engagement data |
| `template/lib/content.ts` | `getCachedItems` for item data |
