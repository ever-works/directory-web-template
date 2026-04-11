---
id: item-categories
title: فئات العناصر
sidebar_label: فئات العناصر
sidebar_position: 24
---

#فئات العناصر

توفر الفئات طريقة هرمية لتنظيم العناصر في الدليل. يتضمن القالب نظامًا كاملاً لإدارة الفئات مع عمليات CRUD الإدارية، وشريط تنقل للفئة العامة، وتكامل التصفية.

## نظرة عامة على الهندسة المعمارية

```
components/
  items-categories.tsx              -- Public category navigation bar
  categories-grid.tsx               -- Grid layout for category cards
  admin/categories/                 -- Admin CRUD components
  filters/components/categories/    -- Filter integration components

hooks/
  use-admin-categories.ts           -- Admin CRUD hook (React Query)
  use-categories-enabled.ts         -- Feature flag check
  use-categories-exists.ts          -- Data availability check

app/api/admin/categories/           -- API routes for category management
```

## نموذج بيانات الفئة

يتم تمثيل الفئات بالواجهة التالية من طبقة المحتوى:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

تستخدم واجهة الإدارة نوعًا موسعًا:

```tsx
// lib/types/category.ts
interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryWithCount extends CategoryData {
  itemCount: number;
}
```

## التنقل في الفئة العامة

يعرض المكون 0 في 1 شريط فئة أفقيًا قابلاً للتمرير مع سلوك ثابت اختياري:

```tsx
// components/items-categories.tsx
export function ItemsCategories(props: {
  categories: Category[];
  basePath?: string;
  resetPath?: string;
  enableSticky?: boolean;
  maxVisibleTags?: number;
}) {
  const { categoriesEnabled } = useCategoriesEnabled();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const pathname = usePathname();

  if (!categoriesEnabled) return null;
  if (!props.categories?.length) return null;

  const MAX_VISIBLE = props.maxVisibleTags || 8;
  const hasMore = props.categories.length > MAX_VISIBLE;

  // Render logic...
}
```

### الميزات الرئيسية

- **بوابة علامة الميزة**: يتحقق المكون من 0 ويعيد 1 إذا تم تعطيل الفئات
- **تجاوز الاستجابة**: في وضع الصف الواحد، يتم تمرير الفئات أفقيًا باستخدام نمط شريط التمرير المخفي
- **توسيع/طي**: يقوم زر التبديل بالتبديل بين التمرير في صف واحد والتخطيط المغلف متعدد الصفوف
- **كشف الحالة النشطة**: يقارن اسم المسار الحالي بعنوان URL للفئة لتمييز عامل التصفية النشط
- **زر "جميع الفئات"**: يتم عرضه دائمًا أولاً، ويعمل كمرشح لإعادة التعيين مع العدد الإجمالي
- **الرأس الثابت**: عندما يكون `enableSticky` صحيحًا، يصبح الشريط ثابتًا بعد التمرير بعد 250 بكسل، مما يؤدي إلى إضافة خلفية ضبابية

### مثال الاستخدام

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## إدارة فئة المشرف

### خطاف useAdminCategories

يوفر الخطاف `hooks/use-admin-categories.ts` عمليات CRUD كاملة:

```tsx
// hooks/use-admin-categories.ts
export function useAdminCategories(options = {}) {
  const { params = {}, enabled = true } = options;

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.categoriesList(params),
    queryFn: () => fetchCategories(params),
    staleTime: 5 * 60 * 1000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return {
    categories: data?.categories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    refetch,
    refreshData,
  };
}
```

### مصنع مفاتيح الاستعلام

تستخدم الفئات تسلسلاً هرميًا منظمًا لمفتاح الاستعلام لإبطال ذاكرة التخزين المؤقت بشكل دقيق:

```tsx
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

### خطاف فئة واحدة

```tsx
export function useCategory({ id, enabled = true }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.category(id),
    queryFn: () => fetchCategory(id),
    enabled: enabled && !!id,
  });

  return { category: data || null, isLoading, error, refetch };
}
```

### خطاف الطفرة فقط

بالنسبة للمكونات التي تحتاج فقط إلى عمليات الكتابة بدون استعلام القائمة:

```tsx
export function useCategoryMutations() {
  return {
    createCategory: handleCreate,
    updateCategory: handleUpdate,
    deleteCategory: handleDelete,
    isSubmitting: anyMutationPending,
  };
}
```

## خيارات قائمة الفئات

تدعم نقطة نهاية قائمة المسؤولين التصفية وترقيم الصفحات:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## نقاط نهاية واجهة برمجة التطبيقات

| الطريقة | نقطة النهاية | الغرض |
|--------|---------|---------|
| احصل على | `/api/admin/categories` | قائمة الفئات مع ترقيم الصفحات |
| احصل على | `/api/admin/categories/all` | احصل على جميع الفئات بدون ترقيم الصفحات |
| احصل على | `/api/admin/categories/:id` | احصل على فئة واحدة |
| مشاركة | `/api/admin/categories` | إنشاء فئة جديدة |
| ضع | 4ـ | تحديث فئة موجودة |
| حذف | 5 ــ | قم بحذف فئة |
| حذف | 6ـ | حذف فئة نهائيًا |

## تكامل الفلتر

تتكامل الفئات مع نظام التصفية من خلال الوحدة 7:

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

يتتبع سياق عامل التصفية الفئة المحددة ويطبقها على استعلامات العناصر تلقائيًا.

## ميزة العلم

يمكن تمكين الفئات أو تعطيلها عالميًا عبر الخطاف 0، الذي يقرأ من نظام علامات الميزات:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

عند التعطيل، يعود كل من شريط التنقل ومكونات المرشح إلى `null` .

## مرجع الملف

| ملف | الغرض |
|------|---------|
| `components/items-categories.tsx` | شريط التنقل للفئة العامة |
| `components/categories-grid.tsx` | تخطيط الشبكة لعرض الفئة |
| `components/admin/categories/` | مكونات المشرف CRUD |
| 4ـ | تكامل الفلتر |
| 5 ــ | ربط المشرف CRUD مع React Query |
| 6ـ | ميزة التحقق من العلامة |
| `hooks/use-categories-exists.ts` | التحقق من توافر البيانات |
| 8ـ | مسارات واجهة برمجة التطبيقات الخلفية |
