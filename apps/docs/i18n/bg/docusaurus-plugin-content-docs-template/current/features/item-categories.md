---
id: item-categories
title: Категории артикули
sidebar_label: Категории артикули
sidebar_position: 24
---

# Категории артикули

Категориите осигуряват йерархичен начин за организиране на елементи в директорията. Шаблонът включва пълна система за управление на категории с администраторски CRUD операции, публична лента за навигация на категории и интегриране на филтриране.

## Преглед на архитектурата

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

## Модел на данни за категория

Категориите са представени със следния интерфейс от слоя съдържание:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

Административният интерфейс използва разширен тип:

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

## Навигация в публична категория

Компонентът `ItemsCategories` на `components/items-categories.tsx` изобразява хоризонтална превъртаща се лента с категории с незадължително лепкаво поведение:

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

### Основни характеристики

- **Feature flag gating**: компонентът проверява `useCategoriesEnabled()` и връща `null` , ако категориите са деактивирани
- **Адаптивно преливане**: в режим на един ред категориите се превъртат хоризонтално със скрит стил на лентата за превъртане
- **Разгъване/свиване**: бутон за превключване между едноредово превъртане и обвито многоредово оформление
- **Откриване на активно състояние**: сравнява текущия път с URL адреса на категорията, за да подчертае активния филтър
- **Бутон "Всички категории"**: винаги се изобразява първи, действа като филтър за нулиране с общия брой
- **Лепкава заглавка**: когато `enableSticky` е вярно, лентата става лепкава след превъртане след 250px, добавяйки замъглен фон

### Пример за използване

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Административно управление на категории

### useAdminCategories Hook

Куката `hooks/use-admin-categories.ts` осигурява пълни CRUD операции:

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

### Query Key Factory

Категориите използват структурирана йерархия на ключове за заявки за прецизно обезсилване на кеша:

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

### Кука за една категория

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

### Кука само за мутация

За компоненти, които се нуждаят само от операции за запис без заявката за списък:

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

## Опции за списък с категории

Крайната точка на администраторския списък поддържа филтриране и пагиниране:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## API крайни точки

| Метод | Крайна точка | Цел |
|--------|----------|---------|
| ВЗЕМЕТЕ | `/api/admin/categories` | Избройте категориите със страници |
| ВЗЕМЕТЕ | `/api/admin/categories/all` | Вземете всички категории без пагинация |
| ВЗЕМЕТЕ | `/api/admin/categories/:id` | Вземете една категория |
| ПУБЛИКАЦИЯ | `/api/admin/categories` | Създайте нова категория |
| ПОСТАВЕТЕ | `/api/admin/categories/:id` | Актуализиране на съществуваща категория |
| ИЗТРИВАНЕ | `/api/admin/categories/:id` | Плавно изтриване на категория |
| ИЗТРИВАНЕ | `/api/admin/categories/:id?hard=true` | Изтриване за постоянно на категория |

## Интегриране на филтър

Категориите се интегрират с филтърната система чрез модула `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

Контекстът на филтъра проследява избраната категория и автоматично я прилага към заявки за артикули.

## Флаг за функция

Категориите могат да бъдат активирани или деактивирани глобално чрез куката `useCategoriesEnabled` , която чете от системата за флагове на функции:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Когато е деактивирано, навигационната лента и филтърните компоненти връщат `null` .

## Референтен файл

| Файл | Цел |
|------|---------|
| `components/items-categories.tsx` | Навигационна лента за публична категория |
| `components/categories-grid.tsx` | Оформление на мрежата за показване на категория |
| `components/admin/categories/` | Административни CRUD компоненти |
| `components/filters/components/categories/` | Интегриране на филтри |
| `hooks/use-admin-categories.ts` | Администраторска кука за CRUD с React Query |
| `hooks/use-categories-enabled.ts` | Проверка на флаг на функция |
| `hooks/use-categories-exists.ts` | Проверка на наличността на данни |
| `app/api/admin/categories/` | Backend API маршрути |
