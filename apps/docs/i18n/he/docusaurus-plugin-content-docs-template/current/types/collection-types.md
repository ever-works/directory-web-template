---
id: collection-types
title: הגדרות סוג אוסף
sidebar_label: סוגי אוסף
sidebar_position: 15
---

# הגדרות סוג אוסף

**מקור:** `types/collection.ts`

אוספים הם קבוצות שנאספו של פריטים מאורגנות לפי נושא. הם מאפשרים למנהלי מערכת ליצור רשימות שנבחרו באופן ידני כגון "בחירות מובילות", "חדש השבוע" או "הטוב ביותר לארגונים".

## ממשקים

### `Collection`

מבנה הנתונים העיקרי של האיסוף.

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`id`|`string`|מזהה ייחודי, 3-50 תווים|
|`slug`|`string`|גרסה בטוחה בכתובת האתר של השם|
|`name`|`string`|שם תצוגה, 2-100 תווים|
|`description`|`string`|תיאור טקסט פשוט, מקסימום 500 תווים|
|`icon_url`|`string?`|כתובת URL לסמל או לתמונת שער|
|`item_count`|`number`|ספירה מחושבת של פריטים שהוקצו|
|`items`|`string[]?`|מזהי פריט; מאוכלס רק כאשר מתבקש|
|`isActive`|`boolean`|שולט בנראות הציבור|

### `CreateCollectionRequest`

מטען ליצירת אוסף חדש.

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

מטען לעדכון אוסף קיים. כל השדות מלבד `id` הם אופציונליים.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

מטען להקצאת פריטים לאוסף.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

פרמטרי שאילתה עבור אוספי רישום.

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## סוגי תגובות

### `CollectionsResponse`

הוחזר בעת רישום אוספים מרובים.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

הוחזר בעת שליפת אוסף בודד עם הפריטים שלו.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## כללי אימות

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|שדה|כלל|
|-------|------|
|`id`|3-50 תווים, חייבים להיות ייחודיים|
|`name`|2-100 תווים|
|`description`|מקסימום 500 תווים|

## דוגמה לשימוש

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## סוגים קשורים

- [Item Types](./item-types.md) -- פריטים השייכים לאוספים
- [Tag Types](./tag-types.md) -- תגים כמודל ארגוני חלופי
