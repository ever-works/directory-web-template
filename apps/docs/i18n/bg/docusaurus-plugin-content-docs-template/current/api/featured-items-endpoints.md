---
id: featured-items-endpoints
title: "Крайни точки на API за представени елементи"
sidebar_label: "Представени артикули"
sidebar_position: 18
---

# Крайни точки на API за представени елементи

API за избрани елементи предоставя публична крайна точка за извличане на елементи, които са били маркирани за видно показване на уебсайта. Представените артикули поддържат поръчка, дати на изтичане и активни/неактивни състояния.

**Изходен файл:** `template/app/api/featured-items/route.ts`

## Крайна точка Резюме

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|ВЗЕМЕТЕ|`/api/featured-items`|Няма|Вземете активни представени елементи за публично показване|

---

## GET `/api/featured-items`

Returns a list of active featured items for public display. Automatically filters out inactive items and optionally excludes expired items based on their `featuredUntil` date. Items are sorted by featured order (descending) and featured date (descending) for optimal presentation.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 6 | Maximum items to return (1-50) |
| `includeExpired` | boolean | No | `false` | Whether to include items past their `featuredUntil` date |

### Database Requirement

The endpoint checks database availability before processing. If the database is not configured, the `checkDatabaseAvailability()` check returns an appropriate error response.

### How It Works

The query builds conditions dynamically based on parameters:

```ts
// Always filter for active items
const conditions = [eq(featuredItems.isActive, true)];

// Optionally exclude expired items
if (!includeExpired) {
  const currentDate = new Date();
  const expirationCondition = or(
    isNull(featuredItems.featuredUntil),
    gte(featuredItems.featuredUntil, currentDate)
  );
  conditions.push(expirationCondition);
}

const featuredItemsList = await db
  .select()
  .from(featuredItems)
  .where(and(...conditions))
  .orderBy(
    desc(featuredItems.featuredOrder),
    desc(featuredItems.featuredAt)
  )
  .limit(limit);
```

### Sorting Logic

Items are sorted by two fields in descending order:

1. **`featuredOrder`** -- Higher values appear first (admin-controlled priority)
2. **`featuredAt`** -- More recently featured items appear first (tiebreaker)

### Response Shape

#### 200 -- Featured Items Retrieved

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
    },
    {
      "id": "featured_456def",
      "itemSlug": "great-design-app",
      "itemName": "Great Design App",
      "itemDescription": "Create stunning designs effortlessly",
      "itemIconUrl": "https://example.com/icons/design.png",
      "itemImageUrl": "https://example.com/featured/design-banner.jpg",
      "featuredOrder": 8,
      "isActive": true,
      "featuredAt": "2024-01-19T15:20:00.000Z",
      "featuredUntil": null,
      "createdAt": "2024-01-19T15:20:00.000Z",
      "updatedAt": "2024-01-19T15:20:00.000Z"
    }
  ],
  "count": 2
}
```

#### 200 -- No Featured Items

```json
{
  "success": true,
  "data": [],
  "count": 0
}
```

#### 500 -- Server Error

```json
{
  "success": false,
  "error": "Failed to fetch featured items"
}
```

### Data Model

Each featured item record contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique featured item record ID |
| `itemSlug` | string | Slug of the featured item |
| `itemName` | string | Display name |
| `itemDescription` | string (nullable) | Description for featured display |
| `itemIconUrl` | string (nullable) | Item icon URL |
| `itemImageUrl` | string (nullable) | Featured banner image URL |
| `featuredOrder` | integer | Display priority (higher = more prominent) |
| `isActive` | boolean | Whether currently featured |
| `featuredAt` | datetime | When the item was featured |
| `featuredUntil` | datetime (nullable) | Expiration date (null means no expiration) |
| `createdAt` | datetime | Record creation timestamp |
| `updatedAt` | datetime (nullable) | Last update timestamp |

### Expiration Behavior

- Items with `featuredUntil: null` never expire and are always included.
- Items with a `featuredUntil` date in the past are excluded by default.
- Setting `includeExpired=true` bypasses expiration filtering (useful for admin views).

### Usage Example

```ts
// Fetch top 3 featured items for homepage hero section
const res = await fetch('/api/featured-items?limit=3');
const { data, count } = await res.json();

if (count > 0) {
  data.forEach(item => {
    console.log(`Featured: ${item.itemName} (order: ${item.featuredOrder})`);
  });
}
```

### Notes

- Errors are only logged in development mode (`NODE_ENV === 'development'`).
- This is a **public endpoint** -- no authentication is required.
- Featured items are managed by admins through the admin panel (see Admin Endpoints).

---

## Свързани изходни файлове

|Файл|Цел|
|------|---------|
|`template/app/api/featured-items/route.ts`|Крайна точка на публично представени елементи|
|`template/lib/db/schema.ts`|`featuredItems` дефиниция на таблица|
|`template/lib/utils/database-check.ts`|Проверка на наличността на база данни|
