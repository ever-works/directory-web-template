---
id: items-engagement-endpoints
title: "Items Engagement API Reference"
sidebar_label: "Items Engagement"
sidebar_position: 54
---

# Items Engagement API Reference

## Overview

The Items Engagement endpoints provide access to engagement metrics and popularity scores for directory items. These include view counts, votes, ratings, favorites, and comments. The popularity scores endpoint additionally computes a weighted ranking that factors in engagement metrics, featured status, and content recency.

## Endpoints

### GET /api/items/engagement

Fetches engagement metrics for multiple items by their slugs in a single batch request.

**Request**

| Parameter | Type   | In    | Description |
|-----------|--------|-------|-------------|
| slugs     | string | query | Comma-separated list of item slugs (required, max 200) |

**Response**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Example**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Debug endpoint that returns items sorted by computed popularity score with a detailed breakdown of scoring factors. Useful for understanding how the sorting algorithm ranks items.

**Request**

| Parameter | Type   | In    | Description |
|-----------|--------|-------|-------------|
| limit     | number | query | Number of items to return (default: 20, max: 100) |
| locale    | string | query | Language code for items (default: "en") |

**Response**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Total computed score (rounded)
    scoreBreakdown: {
      featured: number;          // 10000 if featured, 0 otherwise
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decays over 180 days
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Example**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Authentication

Both endpoints are **public** -- no authentication is required. They are marked as `force-dynamic` to ensure fresh data on every request.

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing required `slugs` parameter or more than 200 slugs provided (engagement endpoint) |
| 500 | Internal server error -- database query failure |

## Rate Limiting

No explicit rate limiting. The engagement endpoint caps batch size at 200 slugs per request to prevent abuse. Both endpoints bypass Next.js caching via `export const dynamic = 'force-dynamic'`.

## Related Endpoints

- [Config Feature Endpoints](./config-feature-endpoints) -- Check if ratings/favorites/comments features are enabled
