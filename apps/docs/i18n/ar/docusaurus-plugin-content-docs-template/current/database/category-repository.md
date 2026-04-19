---
id: category-repository
title: مستودع الفئة
sidebar_label: مستودع الفئة
sidebar_position: 21
---

# مستودع الفئة

يدير `CategoryRepository` دورة حياة فئات العناصر. يتم تخزين الفئات كبيانات YAML في مستودع المحتوى المدعوم من Git وتوفر التصنيف التنظيمي الأساسي للعناصر.

**الملف المصدر:** `template/lib/repositories/category.repository.ts`

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

## تعريف الفئة

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### التبعيات

|استيراد|الغرض|
|--------|---------|
|`CategoryData`، `CategoryWithCount`|أنواع الفئات الأساسية والمثرية|
|`CreateCategoryRequest`، `UpdateCategoryRequest`|طفرة DTOs|
|`CategoryListOptions`|خيارات التصفية والفرز وترقيم الصفحات|
|`CATEGORY_VALIDATION`|ثوابت قيد التحقق|
|`createCategoryGitService`|مصنع لخدمة تخزين Git|
|`coreConfig`|التكوين المركزي|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## طرق الاستعلام

### `findAll(options?): Promise<CategoryWithCount[]>`

إرجاع كافة الفئات مع الفرز الاختياري.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**السلوك:**
- يتم التعامل مع جميع الفئات على أنها نشطة (تمت إزالة الحقل `isActive`)
- `includeInactive` يتم قبول خيار `includeInactive` للتوافق مع الإصدارات السابقة ولكن ليس له أي تأثير تصفية
- يتم تطبيق الفرز عبر الطريقة الخاصة `sortCategories`

**خيارات الفرز:**

|`sortBy`|`sortOrder`|السلوك|
|----------|-------------|----------|
|`'name'` (افتراضي)|`'asc'` (افتراضي)|أبجديًا من الألف إلى الياء|
|`'name'`|`'desc'`|أبجديًا Z-A|

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

استرداد فئة واحدة بواسطة معرفها الفريد.

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

## طرق الطفرة

### `create(data): Promise<CategoryData>`

ينشئ فئة جديدة بعد التحقق من الصحة والتحقق من الأسماء المكررة.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**خطوات المعالجة:**

1. التحقق من صحة الإدخال عبر `validateCategoryData`
2. التحقق من الأسماء المكررة عبر `checkDuplicateName`
3. يتم الإنشاء من خلال `gitService.createCategory`

**قواعد التحقق:**
- `name` يجب أن يكون بين `CATEGORY_VALIDATION.NAME_MIN_LENGTH` و`NAME_MAX_LENGTH` أحرف
- `id` يجب أن يتراوح عدد أحرفه بين 3 و50 حرفًا
- `id` يجب أن يتطابق مع `/^[a-z0-9-]+$/` (أحرف صغيرة، أرقام، واصلات فقط)

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

إجراء حذف نهائي لفئة من مستودع Git.

```ts
async delete(id: string): Promise<void>
```

المندوبون إلى `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

يعيد ترتيب الفئات بناءً على مجموعة المعرفات المتوفرة.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**خطوات المعالجة:**

1. يقرأ جميع الفئات الحالية
2. يعيد ترتيبها لتتناسب مع تسلسل المعرف المقدم
3. يقوم بإلحاق أية فئات غير مدرجة في قائمة إعادة الترتيب
4. يكتب القائمة المعاد ترتيبها مرة أخرى عبر `gitService.writeCategories`

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

## تصدير سينجلتون

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

## الملفات ذات الصلة

|ملف|العلاقة|
|------|-------------|
|`lib/services/category-git.service.ts`|جيت التخزين الخلفية|
|`lib/types/category.ts`|تعريفات النوع وثوابت التحقق من الصحة|
|`lib/config/config-service.ts`|تكوين عنوان URL للمستودع والرموز المميزة|
|`lib/repositories/item.repository.ts`|الفئات المرجعية للعناصر|
