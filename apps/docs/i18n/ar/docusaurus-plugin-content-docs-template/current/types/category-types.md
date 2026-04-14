---
id: category-types
title: تعريفات نوع الفئة
sidebar_label: أنواع الفئات
sidebar_position: 3
---

# تعريفات نوع الفئة

**المصدر:** `lib/types/category.ts`

تُستخدم الفئات لتنظيم العناصر في مجموعات منطقية. يستخدم القالب نظامًا قائمًا على الملفات حيث يتم تخزين الفئات كبيانات منظمة ويتم الرجوع إليها حسب العناصر.

## واجهات

### `CategoryData`

بنية بيانات الفئة الأساسية مع الحد الأدنى من الحقول.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - المعرف الفريد للفئة (عادةً ما يكون ثابتًا مثل `"developer-tools"`)
- `name` - اسم العرض الذي يمكن قراءته بواسطة الإنسان (على سبيل المثال، `"Developer Tools"`)

### `CategoryWithCount`

بيانات الفئة الموسعة التي تتضمن عدد العناصر والحالة النشطة، المستخدمة في لوحات معلومات المسؤول وقوائم الفئات.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - عدد العناصر المخصصة لهذه الفئة
- `isInactive` - ما إذا كانت الفئة موجودة في التكوين ولكن لا تحتوي على عناصر معينة

### `CreateCategoryRequest`

الحمولة لإنشاء فئة جديدة.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

الحمولة لتحديث فئة موجودة. يمتد `Partial<CreateCategoryRequest>` لذا يجب توفير الحقول التي يتم تغييرها فقط، ولكن `id` مطلوب دائمًا.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

استجابة مرقّمة لاستعلامات قائمة الفئات.

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

مغلف الاستجابة لعمليات فئة واحدة.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

معلمات الاستعلام لتصفية قوائم الفئات وترقيم صفحاتها.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - عندما `true`، يتضمن فئات لا تحتوي على أي عناصر
- `sortBy` - قم بالفرز حسب اسم الفئة أو المعرف
- ترتيب الفرز الافتراضي تصاعدي حسب الاسم

## الثوابت

### `CATEGORY_VALIDATION`

قيود التحقق من صحة حقول الفئة:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## أمثلة الاستخدام

### إنشاء فئة

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

### فئات القائمة مع الخيارات

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

### عرض الفئات مع الأعداد

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

### تحديث فئة

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## الأنواع ذات الصلة

- [`ItemData.category`](./item-types.md) يشير إلى معرفات الفئة (يدعم `string | string[]`)
- يتبع [`TagData`](./category-types.md) نمطًا مشابهًا للعلامات
- يقبل [`ItemListOptions.categories`](./item-types.md) مجموعة من معرفات الفئات للتصفية
