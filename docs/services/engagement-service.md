---
id: engagement-service
title: "Engagement Service Deep Dive"
sidebar_label: "Engagement Service"
sidebar_position: 42
---

# Engagement Service

## Overview

The Engagement Service provides a sophisticated popularity scoring and sorting system for items based on real user engagement metrics. It uses logarithmic scaling to handle platforms with millions of interactions gracefully, ensuring that items continue to differentiate meaningfully at any scale. The service enriches item data with engagement metrics from the database and computes composite popularity scores.

## Architecture

The Engagement Service operates as a pure computation layer on top of item data and engagement metrics. It fetches aggregated engagement data from the database via the engagement queries module, attaches metrics to items, and provides scoring/sorting functions that can be used by any listing or feed component.

```
Item Listing / Feed Component
        |
   engagement.service.ts   (scoring + sorting)
        |
   engagement.queries.ts   (aggregated metrics)
        |
   Database (views, votes, ratings, favorites, comments tables)
```

## API Reference

### Types

#### `ItemWithEngagement`

Extends `ItemData` with an optional `engagement` property containing aggregated metrics.

```typescript
interface ItemWithEngagement extends ItemData {
  engagement?: ItemEngagementMetrics;
}
```

Where `ItemEngagementMetrics` includes: `views`, `votes`, `avgRating`, `favorites`, `comments`.

### Functions

#### `calculatePopularityScore(item: ItemWithEngagement): number`

Computes a composite popularity score for an item using weighted logarithmic scaling across multiple engagement signals, plus recency decay.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `item` | `ItemWithEngagement` | An item with optional engagement metrics |

**Returns:** `number` -- A composite popularity score (higher = more popular).

**Scoring Breakdown:**

| Signal | Scale | Weight | Example: 1M interactions |
|--------|-------|--------|--------------------------|
| Featured | Fixed | +10,000 | 10,000 |
| Views | log10 | 1,000x | ~6,000 |
| Votes (net positive) | log10 | 1,200x | ~7,200 |
| Average Rating | Linear (0-5) | 500x | 0-2,500 |
| Favorites | log10 | 1,100x | ~6,600 |
| Comments | log10 | 1,000x | ~6,000 |
| Recency (< 30 days) | Linear decay | max 1,000 | 0-1,000 |
| Recency (30-90 days) | Linear decay | max 500 | 0-500 |
| Recency (90-180 days) | Linear decay | max 250 | 0-250 |

---

#### `sortByPopularity(a: ItemWithEngagement, b: ItemWithEngagement): number`

Comparator function for sorting items by descending popularity score. Falls back to alphabetical name comparison for equal scores.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `a` | `ItemWithEngagement` | First item |
| `b` | `ItemWithEngagement` | Second item |

**Returns:** `number` -- Negative if `a` is more popular, positive if `b` is more popular, 0 for equal.

---

#### `enrichItemsWithEngagement(items: ItemData[]): Promise<ItemWithEngagement[]>`

Fetches engagement metrics for a batch of items from the database and attaches them. Uses a single batch query for efficiency (no N+1 problem).

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `items` | `ItemData[]` | Array of items to enrich |

**Returns:** `Promise<ItemWithEngagement[]>` -- Items with `engagement` property populated.

---

#### `logScale(value: number, weight: number): number` (private)

Applies log10 scaling with a weight multiplier. Returns 0 for non-positive values. The formula is: `log10(value + 1) * weight`.

**Scale examples (weight=1000):**
- 1 => 0, 10 => 1,000, 100 => 2,000, 1,000 => 3,000, 1M => 6,000

## Implementation Details

- **Logarithmic scaling:** The core design choice. Linear scoring breaks down at scale because the difference between 1M and 1.1M views is not meaningful to users, but the difference between 10 and 100 views is. Log10 compresses high values while preserving separation at lower ranges.
- **Recency decay:** A three-tier time decay system gives progressively less weight to older items:
  - 0-30 days: up to 1,000 bonus points (linear decay)
  - 30-90 days: up to 500 bonus points
  - 90-180 days: up to 250 bonus points
  - 180+ days: no recency bonus
- **Featured boost:** Featured items receive a flat 10,000-point boost, which places them significantly above non-featured items but does not completely override high organic engagement.
- **Batch enrichment:** `enrichItemsWithEngagement` extracts all slugs upfront and performs a single batched database query, making it efficient for large item lists.
- **Date handling:** The recency calculation handles both `Date` objects and date strings for the `updatedAt` field.

## Database Interactions

| Operation | Query Function | Table(s) |
|-----------|---------------|----------|
| Get metrics per item | `getEngagementMetricsPerItem(slugs)` | Aggregates from `views`, `votes`, `ratings`, `favorites`, `comments` |

The `getEngagementMetricsPerItem` function returns a `Map<string, ItemEngagementMetrics>` keyed by item slug.

## Error Handling

- `enrichItemsWithEngagement` returns an empty array immediately if the input array is empty (short-circuit optimization).
- Items without matching engagement data in the database will have `engagement: undefined`, and the scoring function handles this gracefully by treating all metrics as zero.
- Database errors from the engagement queries module propagate up to the caller.

## Usage Examples

```typescript
import {
  enrichItemsWithEngagement,
  sortByPopularity,
  calculatePopularityScore,
} from '@/lib/services/engagement.service';

// Enrich items and sort by popularity
const items = await getItems(); // ItemData[]
const enriched = await enrichItemsWithEngagement(items);
const sorted = enriched.sort(sortByPopularity);

// Get popularity score for a single item
const score = calculatePopularityScore(enriched[0]);
console.log(`Item "${enriched[0].name}" score: ${score}`);

// Use as a sort comparator directly
items.sort(sortByPopularity);
```

## Configuration

This service has no environment variable dependencies. All scoring weights are defined as constants within the module and can be adjusted by modifying the source code.

**Tunable constants:**
- Featured boost: `10000`
- View weight: `1000`
- Vote weight: `1200`
- Favorite weight: `1100`
- Comment weight: `1000`
- Rating multiplier: `500`
- Recency decay periods: 30/90/180 days

## Related Services

- [View Tracking Service](./view-tracking-service.md) -- Records view events that feed into engagement metrics
- [Vote Service](./vote-service.md) -- Records votes contributing to engagement scoring
- [Comment Service](./comment-service.md) -- Comments count feeds into engagement scoring
- [Item Service](./item-service.md) -- Items are the primary entities being scored
