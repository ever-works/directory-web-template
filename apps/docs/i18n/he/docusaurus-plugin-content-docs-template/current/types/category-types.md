---
id: category-types
title: הגדרות סוג קטגוריה
sidebar_label: סוגי קטגוריות
sidebar_position: 3
---

# הגדרות סוג קטגוריה

**מקור:** `lib/types/category.ts`

קטגוריות משמשות לארגון פריטים לקבוצות לוגיות. התבנית משתמשת במערכת מבוססת קבצים שבה קטגוריות מאוחסנות כנתונים מובנים ומתייחסים לפי פריטים.

## ממשקים

### `CategoryData`

מבנה הנתונים של קטגוריית הליבה עם שדות מינימליים.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - מזהה ייחודי עבור הקטגוריה (בדרך כלל שבלול כמו `"developer-tools"`)
- `name` - שם תצוגה הניתן לקריאה על ידי אדם (לדוגמה, `"Developer Tools"`)

### `CategoryWithCount`

נתוני קטגוריות מורחבים הכוללים ספירת פריטים ומצב פעיל, בשימוש במרכזי המחוונים של מנהל מערכת וברשימות קטגוריות.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - מספר הפריטים שהוקצו לקטגוריה זו
- `isInactive` - האם הקטגוריה קיימת בתצורה אך אין לה פריטים מוקצים

### `CreateCategoryRequest`

מטען ליצירת קטגוריה חדשה.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

מטען לעדכון קטגוריה קיימת. מרחיב את `Partial<CreateCategoryRequest>` כך שצריך לספק רק את השדות המשתנים, אך תמיד נדרשת `id`.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

תגובה מדורגת עבור שאילתות רשימת קטגוריות.

```typescript
interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `CategoryResponse`

מעטפת תגובה לפעולות בקטגוריה אחת.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

פרמטרי שאילתה לסינון ועימוף רשימות קטגוריות.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - כאשר `true`, כולל קטגוריות שיש להן אפס פריטים
- `sortBy` - מיין לפי שם קטגוריה או מזהה
- סדר המיון המוגדר כברירת מחדל עולה לפי השם

## קבועים

### `CATEGORY_VALIDATION`

אילוצי אימות עבור שדות קטגוריה:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## דוגמאות לשימוש

### יצירת קטגוריה

```typescript
import type { CreateCategoryRequest } from '@/lib/types/category';
import { CATEGORY_VALIDATION } from '@/lib/types/category';

function validateCategoryName(name: string): boolean {
  return (
    name.length >= CATEGORY_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= CATEGORY_VALIDATION.NAME_MAX_LENGTH
  );
}

const newCategory: CreateCategoryRequest = {
  id: 'developer-tools',
  name: 'Developer Tools',
};
```

### רישום קטגוריות עם אפשרויות

```typescript
import type { CategoryListOptions } from '@/lib/types/category';

const options: CategoryListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

### הצגת קטגוריות עם ספירות

```typescript
import type { CategoryWithCount } from '@/lib/types/category';

function renderCategoryList(categories: CategoryWithCount[]) {
  return categories
    .filter(cat => !cat.isInactive)
    .map(cat => ({
      label: `${cat.name} (${cat.count ?? 0})`,
      value: cat.id,
    }));
}
```

### עדכון קטגוריה

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## סוגים קשורים

- [`ItemData.category`](./item-types.md) מפנה למזהי קטגוריות (תומך ב-@@TOK001@@@)
- [`TagData`](./category-types.md) עוקב אחר דפוס דומה עבור תגים
- [`ItemListOptions.categories`](./item-types.md) מקבל מערך של מזהי קטגוריות לסינון
