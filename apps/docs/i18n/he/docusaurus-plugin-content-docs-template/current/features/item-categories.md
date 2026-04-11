---
id: item-categories
title: קטגוריות פריטים
sidebar_label: קטגוריות פריטים
sidebar_position: 24
---

# קטגוריות פריטים

קטגוריות מספקות דרך היררכית לארגן פריטים בספרייה. התבנית כוללת מערכת ניהול קטגוריות מלאה עם פעולות CRUD אדמין, סרגל ניווט לקטגוריות הפונה לציבור ושילוב סינון.

## סקירה כללית של אדריכלות

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

## מודל נתוני קטגוריה

קטגוריות מיוצגות באמצעות הממשק הבא משכבת התוכן:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

ממשק הניהול משתמש בסוג מורחב:

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

## ניווט בקטגוריה ציבורית

הרכיב `ItemsCategories` ב- `components/items-categories.tsx` מציג סרגל קטגוריות אופקי שניתן לגלול עם התנהגות דביקה אופציונלית:

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

### תכונות עיקריות

- **שער דגל תכונה**: הרכיב בודק `useCategoriesEnabled()` ומחזיר `null` אם הקטגוריות מושבתות
- **הצפה רספונסיבית**: במצב של שורה אחת, קטגוריות גוללות אופקית עם סגנון פס גלילה נסתר
- **הרחב/כווץ**: לחצן החלפת מצב עובר בין גלילה בשורה אחת לפריסה מרובת שורות עטופה
- **זיהוי מצב פעיל**: משווה את שם הנתיב הנוכחי עם כתובת האתר של הקטגוריה כדי להדגיש את המסנן הפעיל
- **לחצן "כל הקטגוריות"**: מוצג תמיד ראשון, פועל כמסנן איפוס עם הספירה הכוללת
- **כותרת דביקה**: כאשר `enableSticky` נכון, הסרגל הופך לדביק לאחר גלילה מעבר ל-250 פיקסלים, הוספת רקע מטושטש

### דוגמה לשימוש

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## ניהול קטגוריות אדמין

### useAdminCategories Hook

הוו `hooks/use-admin-categories.ts` מספק פעולות CRUD מלאות:

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

### מפעל מפתח שאילתות

קטגוריות משתמשות בהיררכיית מפתח שאילתה מובנית לאי תוקף מדויק של מטמון:

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

### וו קטגוריה יחידה

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

### הוק המוטציה בלבד

עבור רכיבים שצריכים רק פעולות כתיבה ללא שאילתת הרשימה:

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

## אפשרויות רשימת קטגוריות

נקודת הקצה של רשימת המנהלים תומכת בסינון ובעימוד:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## נקודות קצה של ממשק API

| שיטה | נקודת קצה | מטרה |
|--------|--------|--------|
| קבל | `/api/admin/categories` | רשימת קטגוריות עם עימוד |
| קבל | `/api/admin/categories/all` | קבל את כל הקטגוריות ללא עימוד |
| קבל | `/api/admin/categories/:id` | קבל קטגוריה בודדת |
| פוסט | `/api/admin/categories` | צור קטגוריה חדשה |
| PUT | `/api/admin/categories/:id` | עדכן קטגוריה קיימת |
| מחק | `/api/admin/categories/:id` | רך למחוק קטגוריה |
| מחק | `/api/admin/categories/:id?hard=true` | מחק קטגוריה לצמיתות |

## שילוב מסננים

קטגוריות משתלבות עם מערכת הסינון באמצעות מודול `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

הקשר המסנן עוקב אחר הקטגוריה שנבחרה ומחיל אותה על שאילתות פריט באופן אוטומטי.

## דגל תכונה

ניתן להפעיל או להשבית קטגוריות באופן גלובלי באמצעות ה- `useCategoriesEnabled` הוק, שקורא ממערכת דגלי התכונות:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

כאשר מושבת, הן סרגל הניווט והן רכיבי המסנן מחזירים `null` .

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `components/items-categories.tsx` | סרגל ניווט בקטגוריות ציבוריות |
| `components/categories-grid.tsx` | פריסת רשת לתצוגת קטגוריות |
| `components/admin/categories/` | Admin רכיבי CRUD |
| `components/filters/components/categories/` | שילוב מסנן |
| `hooks/use-admin-categories.ts` | Admin CRUD הוק עם React Query |
| `hooks/use-categories-enabled.ts` | בדיקת דגל תכונה |
| `hooks/use-categories-exists.ts` | בדיקת זמינות נתונים |
| `app/api/admin/categories/` | מסלולי ממשק API |
