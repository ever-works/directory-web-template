---
id: item-types
title: הגדרות של סוג פריט
sidebar_label: סוגי פריטים
sidebar_position: 1
---

# הגדרות של סוג פריט

**מקור:** `lib/types/item.ts`

פריטים הם ישויות תוכן הליבה בתבנית. מודול זה מגדיר את מבני הנתונים ליצירה, קריאה, עדכון ורישום של פריטים, יחד עם קבועי אימות וסוגי ניהול מצבים.

## ממשקים

### `ItemLocationData`

נתוני מיקום של פריטים שניתנים לקידוד גיאוגרפי. מאוחסן ב-YAML ומוסף באינדקס `item_location_index` עבור שאילתות גיאוגרפיות מהירות.

```typescript
import type { MapProvider } from './location';

interface ItemLocationData {
  address?: string;       // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;      // Pre-geocoded latitude
  longitude?: number;     // Pre-geocoded longitude
  service_area?: string;  // e.g., "Nationwide", "New York Metro"
  is_remote?: boolean;    // Whether this item operates remotely
  geocoded_by?: MapProvider; // Which geocoding provider was used
}
```

### `ItemData`

מבנה נתוני הפריט הראשי שהוחזר על ידי פעולות קריאה.

```typescript
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;        // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy';
  showSurveys?: boolean;      // Whether to show surveys section
  publisher?: string;         // Publisher name for display
  location?: ItemLocationData;
}
```

**פרטים עיקריים:**
- `category` תומך גם במחרוזת בודדת וגם במערך עבור פריטים מרובי קטגוריות
- `status` משתמש בזרימת אישור של ארבעה מדינות: טיוטה, בהמתנה, אושרה, נדחתה
- `deleted_at` מאפשר מחיקה רכה מבלי להסיר נתונים
- `action` מגדיר את סוג לחצן ה-CTA בדף פרטי הפריט

### `CreateItemRequest`

מטען קלט ליצירת פריט חדש (נקודת קצה POST).

```typescript
interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}
```

### `UpdateItemRequest`

מטען קלט עבור עדכון פריט קיים. מרחיב את `Partial<CreateItemRequest>` כך שכל השדות מלבד `id` הם אופציונליים.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

פרמטרי שאילתה לסינון ועימום רשימות פריטים.

```typescript
interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[];     // Multi-category filtering
  tags?: string[];           // Multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;  // Include soft-deleted items (default: false)
  submittedBy?: string;      // Filter by submitting user
  search?: string;           // Search by name or description
  city?: string;             // Filter by city
  country?: string;          // Filter by country
  includeRemote?: boolean;   // Include remote items in location queries
}
```

### `ItemListResponse`

תגובה מדורגת עבור שאילתות רשימת פריטים.

```typescript
interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `ItemResponse`

מעטפת תגובה לפעולות של פריט בודד.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

מטען עבור אישור או דחייה של פריט במהלך תהליך הבדיקה.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## הקלד כינויים

### `SortField`

שדות חוקיים למיון רשימות פריטים:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

כיוון מיון:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

סוג איחוד שנגזר מ-`ITEM_STATUSES`:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## קבועים

### `ITEM_VALIDATION`

אילוצי אימות עבור שדות פריט:

```typescript
const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;
```

### `ITEM_STATUSES`

ערכי סטטוס קנוניים עבור זרימת העבודה של אישור הפריט:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

תוויות קריאות לאדם עבור כל סטטוס:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

מיפוי צבע של ממשק משתמש עבור כל סטטוס:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## דוגמאות לשימוש

### יצירת פריט

```typescript
import type { CreateItemRequest } from '@/lib/types/item';
import { ITEM_VALIDATION } from '@/lib/types/item';

function validateItemName(name: string): boolean {
  return (
    name.length >= ITEM_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= ITEM_VALIDATION.NAME_MAX_LENGTH
  );
}

const newItem: CreateItemRequest = {
  id: 'unique-id-123',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A description of my tool that is at least 10 characters.',
  source_url: 'https://example.com',
  category: ['productivity', 'developer-tools'],
  tags: ['open-source', 'free'],
  status: 'pending',
};
```

### סינון פריטים

```typescript
import type { ItemListOptions } from '@/lib/types/item';

const options: ItemListOptions = {
  status: 'approved',
  categories: ['productivity'],
  tags: ['open-source'],
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeRemote: true,
};
```

### עיבוד תגי סטטוס

```typescript
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/types/item';
import type { ItemStatus } from '@/lib/types/item';

function getStatusBadge(status: ItemStatus) {
  return {
    label: ITEM_STATUS_LABELS[status],
    color: ITEM_STATUS_COLORS[status],
  };
}

// getStatusBadge('pending')
// => { label: 'Pending Review', color: 'yellow' }
```

## סוגים קשורים

- [`ItemLocationData`](./location-types.md) הפניות `MapProvider` ממודול המיקום
- [`ClientSubmissionData`](./item-types.md) ב-`client-item.ts` מרחיב את `ItemData` עם מדדי מעורבות
- [`CategoryData`](./category-types.md) מגדיר את ערכי הקטגוריה שאליהם מתייחסים ב-`ItemData.category`
- [`TagData`](./category-types.md) מגדיר את ערכי התג שאליהם מתייחסים ב-`ItemData.tags`
