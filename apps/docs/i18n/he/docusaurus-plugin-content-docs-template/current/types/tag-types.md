---
id: tag-types
title: הגדרות סוג תג
sidebar_label: סוגי תגים
sidebar_position: 20
---

# הגדרות סוג תג

**מקור:** `lib/types/tag.ts`

תגים מספקים מערכת תיוג שטוחה לפריטים. הם מנוהלים דרך ממשק הניהול ומאוחסנים במערכת התוכן מבוססת הקבצים.

## ממשקים

### `TagData`

מבנה הנתונים של תג הבסיס.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|שדה|הקלד|תיאור|
|-------|------|-------------|
|`id`|`string`|מזהה יציב בשימוש בקובצי YAML של פריט|
|`name`|`string`|תווית קריא לאדם מוצגת בממשק המשתמש, 2-50 תווים|
|`isActive`|`boolean`|תגים לא פעילים מוסתרים ממסננים ציבוריים אך נשמרים בנתונים|

### `TagWithCount`

נתוני תגים מורחבים עם סטטיסטיקת שימוש.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

מטען ליצירת תג חדש.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

מטען לעדכון תג. לא ניתן לשנות את ה-`id`.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

פרמטרי שאילתה עבור תגי רישום.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## סוגי תגובות

### `TagListResponse`

תגובת רשימת תגים מדויבת.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

תוצאת פעולת תג בודדת.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## כללי אימות

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|שדה|כלל|
|-------|------|
|`name`|2-50 תווים|
|`id`|חייב להיות ייחודי בכל התגים|

## תגיות במערכת התוכן

הפניה לתגים מתבצעת לפי מזהה בקובצי YAML של פריט:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

מאגר התגים קורא הגדרות תגים ממאגר התוכן ומספק אותן לממשק המשתמש של הניהול ולרכיבי הסינון.

## שילוב מסנן

תגים משתלבים עם מערכת הסינון בצד הלקוח באמצעות רכיבים אלה:

- `components/filters/components/tags/` -- ממשק משתמש מסנן תגים
- `components/filters/hooks/use-tag-visibility.ts` -- שולט אילו תגים יופיעו
- `components/filters/utils/tag-utils.ts` -- פונקציות מסייעות לסינון תגים

## דוגמה לשימוש

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## סוגים קשורים

- [סוגי אוסף](./collection-types.md) -- אוספים כמודל קיבוץ חלופי
- [סוגי פריטים](./item-types.md) -- פריטים המתייחסים לתגים
- [סוגי הרשאות](./permission-types.md) -- `tags:read`, `tags:create` וכו'.
