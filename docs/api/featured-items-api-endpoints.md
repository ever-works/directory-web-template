---
id: featured-items-api-endpoints
title: Featured Items API Endpoints
sidebar_label: Featured Items API
sidebar_position: 63
---

# Featured Items API Endpoints

The Featured Items API provides a public endpoint for retrieving featured items displayed on the website. Featured items are managed through the admin panel and stored in the database with support for ordering, activation, and expiration dates.

**Source:** `template/app/api/featured-items/route.ts`

---

## Get Featured Items

Returns a list of active featured items for public display. Automatically filters out inactive and (optionally) expired items.

| Property | Value |
|----------|-------|
| **Method** | `GET` |
| **Path** | `/api/featured-items` |
| **Auth** | None (public) |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | `integer` | No | `6` | Maximum number of featured items to return (1-50) |
| `includeExpired` | `boolean` | No | `false` | Whether to include items past their `featured_until` date |

### Response

**Status 200** -- Featured items retrieved successfully.

```json
{
  "success": true,
  "data": [
    {
      "id": "featured_123abc",
      "itemSlug": "awesome-productivity-tool",
      "itemName": "Awesome Productivity Tool",
      "itemDescription": "Boost your productivity with this amazing tool",
      "itemIconUrl": "https://example.com/icons/tool.png",
      "itemImageUrl": "https://example.com/featured/tool-banner.jpg",
      "featuredOrder": 10,
      "isActive": true,
      "featuredAt": "2024-01-20T10:30:00.000Z",
      "featuredUntil": "2024-02-20T10:30:00.000Z",
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "count": 1
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `data` | `array` | Array of featured item objects |
| `count` | `number` | Number of featured items returned |
| `data[].id` | `string` | Featured item record ID |
| `data[].itemSlug` | `string` | Item slug identifier |
| `data[].itemName` | `string` | Item display name |
| `data[].itemDescription` | `string \| null` | Featured item description |
| `data[].itemIconUrl` | `string \| null` | Item icon URL |
| `data[].itemImageUrl` | `string \| null` | Featured banner image URL |
| `data[].featuredOrder` | `number` | Display order (higher = more prominent) |
| `data[].isActive` | `boolean` | Whether the item is currently featured |
| `data[].featuredAt` | `string` (ISO 8601) | When the item was featured |
| `data[].featuredUntil` | `string \| null` (ISO 8601) | Expiration date (`null` = no expiration) |
| `data[].createdAt` | `string` (ISO 8601) | Record creation timestamp |
| `data[].updatedAt` | `string \| null` (ISO 8601) | Last update timestamp |

### Sorting

Items are sorted by:
1. `featuredOrder` descending (highest order first)
2. `featuredAt` descending (most recently featured first)

### Filtering Logic

The endpoint applies these filters:

1. **Active only:** Only items with `isActive = true` are returned.
2. **Expiration check** (when `includeExpired` is `false`):
   - Items with `featuredUntil = null` are always included (no expiration).
   - Items with `featuredUntil >= current date` are included (not yet expired).
   - Items with `featuredUntil < current date` are excluded.

### Error Response

**Status 500**

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### curl Examples

```bash
# Get default featured items (top 6, exclude expired)
curl -s http://localhost:3000/api/featured-items

# Get top 3 featured items
curl -s "http://localhost:3000/api/featured-items?limit=3"

# Include expired featured items
curl -s "http://localhost:3000/api/featured-items?includeExpired=true"

# Combine parameters
curl -s "http://localhost:3000/api/featured-items?limit=10&includeExpired=true"
```

### TypeScript Usage

```typescript
interface FeaturedItem {
  id: string;
  itemSlug: string;
  itemName: string;
  itemDescription: string | null;
  itemIconUrl: string | null;
  itemImageUrl: string | null;
  featuredOrder: number;
  isActive: boolean;
  featuredAt: string;
  featuredUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface FeaturedItemsResponse {
  success: boolean;
  data: FeaturedItem[];
  count: number;
}

async function getFeaturedItems(
  limit: number = 6,
  includeExpired: boolean = false
): Promise<FeaturedItemsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    ...(includeExpired && { includeExpired: 'true' }),
  });
  const res = await fetch(`/api/featured-items?${params}`);
  return res.json();
}

// Usage
const { data: featuredItems, count } = await getFeaturedItems(6);
featuredItems.forEach(item => {
  console.log(`${item.itemName} (order: ${item.featuredOrder})`);
  if (item.featuredUntil) {
    console.log(`  Expires: ${item.featuredUntil}`);
  }
});
```

### Implementation Notes

- Database availability is checked at the start via `checkDatabaseAvailability()`.
- The `limit` parameter is parsed from the query string with a default of `6`. Input beyond 50 is not clamped (validated client-side).
- Errors are only logged in development mode to avoid noise in production logs.
- Featured items are managed through the admin panel endpoints (see [Admin Endpoints](/docs/template/api/admin-endpoints)).
- The `featuredUntil` field supports both permanent featuring (`null`) and time-limited featuring.
