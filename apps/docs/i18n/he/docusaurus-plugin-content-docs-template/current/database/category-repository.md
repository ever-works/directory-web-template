---
id: category-repository
title: מאגר קטגוריות
sidebar_label: מאגר קטגוריות
sidebar_position: 21
---

# מאגר קטגוריות

ה-`CategoryRepository` מנהל את מחזור החיים של קטגוריות פריטים. קטגוריות מאוחסנות כנתוני YAML במאגר התוכן המגובה על ידי Git ומספקות את הטקסונומיה הארגונית העיקרית לפריטים.

**קובץ מקור:** `template/lib/repositories/category.repository.ts`

---

## Architecture Overview

```
Admin Category UI
        |
  API Route / Server Action
        |
  CategoryRepository
        |
  CategoryGitService
        |
  GitHub Repository (categories.yml)
```

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## הגדרת כיתה

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### תלות

|ייבוא|מטרה|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|סוגי בסיס וקטגוריות מועשרות|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|DTOs של מוטציות|
|`CategoryListOptions`|אפשרויות סינון, מיון ועימוד|
|`CATEGORY_VALIDATION`|קבועי אילוץ אימות|
|`createCategoryGitService`|מפעל לשירות האחסון Git|
|`coreConfig`|תצורה מרכזית|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## שיטות שאילתה

### `findAll(options?): Promise<CategoryWithCount[]>`

מחזירה את כל הקטגוריות עם מיון אופציונלי.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**התנהגות:**
- כל הקטגוריות מטופלות כפעילות (השדה `isActive` הוסר)
- אפשרות `includeInactive` מקובלת עבור תאימות לאחור אך אין לה אפקט סינון
- חל מיון בשיטת הפרטי `sortCategories`

**אפשרויות מיון:**

|`sortBy`|`sortOrder`|התנהגות|
|----------|-------------|----------|
|`'name'` (ברירת מחדל)|`'asc'` (ברירת מחדל)|אלפביתי א'-ת'|
|`'name'`|`'desc'`|אלפביתי Z-A|

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated subset of categories.

```ts
async findAllPaginated(options?: CategoryListOptions): Promise<{
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`. Applies all filters and sorting from `findAll` before slicing.

---

### `findById(id): Promise<CategoryData | null>`

מאחזר קטגוריה בודדת לפי המזהה הייחודי שלה.

```ts
async findById(id: string): Promise<CategoryData | null>
```

---

### `findBySlug(slug): Promise<CategoryData | null>`

Retrieves a category by slug. Currently delegates to `findById` since the category ID serves as the slug.

```ts
async findBySlug(slug: string): Promise<CategoryData | null>
```

---

## שיטות מוטציה

### `create(data): Promise<CategoryData>`

יוצר קטגוריה חדשה לאחר אימות ובדיקת שמות כפולים.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**שלבי עיבוד:**

1. מאמת קלט באמצעות `validateCategoryData`
2. בודק שמות כפולים באמצעות `checkDuplicateName`
3. יוצר דרך `gitService.createCategory`

**כללי אימות:**
- `name` חייב להיות בין `CATEGORY_VALIDATION.NAME_MIN_LENGTH` ו-`NAME_MAX_LENGTH` תווים
- `id` חייב להיות בין 3 ל-50 תווים
- `id` חייב להתאים ל-@@TOK001@@@ (אותיות קטנות, מספרים, מקפים בלבד)

---

### `update(data): Promise<CategoryData>`

Updates an existing category. The `data` object must include the `id` field.

```ts
async update(data: UpdateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates update data (ID required, name constraints if provided)
2. If name is changing, checks for duplicate names excluding the current category
3. Updates through `gitService.updateCategory`

---

### `delete(id): Promise<void>`

מבצע מחיקה קשה של קטגוריה ממאגר Git.

```ts
async delete(id: string): Promise<void>
```

נציגים אל `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

מסדר מחדש קטגוריות על סמך מערך המזהים המסופק.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**שלבי עיבוד:**

1. קורא את כל הקטגוריות הנוכחיות
2. מסדר אותם מחדש כך שיתאימו לרצף הזיהוי שסופק
3. מוסיף את כל הקטגוריות שאינן נכללות ברשימת הסדר מחדש
4. כותב את הרשימה המשובצת בחזרה דרך `gitService.writeCategories`

---

## Private Helper Methods

### `validateCategoryData(data: CreateCategoryRequest): void`

Validates creation data:
- Name length within `CATEGORY_VALIDATION` bounds
- ID between 3 and 50 characters
- ID matches lowercase alphanumeric with hyphens pattern

### `validateUpdateData(data: UpdateCategoryRequest): void`

Validates update data:
- ID is required
- Name constraints enforced if name is provided

### `checkDuplicateName(name, excludeId?): Promise<void>`

Performs a case-insensitive duplicate check across all existing categories. Throws `Error('Category with name "..." already exists')` if a duplicate is found. Optionally excludes a specific category ID (for updates).

### `sortCategories(categories, options): CategoryData[]`

Sorts categories by the specified field and order. Currently supports sorting by `name` only.

---

## Singleton Export

```ts
export const categoryRepository = new CategoryRepository();
```

---

## Usage Example

```ts
import { categoryRepository } from '@/lib/repositories/category.repository';

// List all categories sorted alphabetically
const categories = await categoryRepository.findAll({
  sortBy: 'name',
  sortOrder: 'asc',
});

// Create a new category
const newCat = await categoryRepository.create({
  id: 'developer-tools',
  name: 'Developer Tools',
  description: 'Tools for software developers',
});

// Paginated listing
const page = await categoryRepository.findAllPaginated({
  page: 1,
  limit: 20,
});

// Reorder categories
await categoryRepository.reorder([
  'developer-tools',
  'productivity',
  'design',
]);
```

---

## קבצים קשורים

|קובץ|מערכת יחסים|
|------|-------------|
|`lib/services/category-git.service.ts`|קצה אחורי של אחסון Git|
|`lib/types/category.ts`|הגדרות סוג וקבועי אימות|
|`lib/config/config-service.ts`|תצורה עבור כתובת אתר ואסימונים של מאגר|
|`lib/repositories/item.repository.ts`|קטגוריות התייחסות לפריטים|
