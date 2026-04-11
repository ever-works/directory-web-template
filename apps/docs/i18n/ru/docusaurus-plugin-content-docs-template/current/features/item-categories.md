---
id: item-categories
title: Категории товаров
sidebar_label: Категории товаров
sidebar_position: 24
---

# Категории предметов

Категории обеспечивают иерархический способ организации элементов в каталоге. Шаблон включает в себя полную систему управления категориями с административными операциями CRUD, общедоступную панель навигации по категориям и интеграцию фильтров.

## Обзор архитектуры

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

## Модель данных категории

Категории представлены следующим интерфейсом уровня контента:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

Интерфейс администратора использует расширенный тип:

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

## Навигация по общедоступным категориям

Компонент `ItemsCategories` в позиции `components/items-categories.tsx` отображает горизонтальную прокручиваемую панель категорий с дополнительным липким поведением:

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

### Ключевые особенности

- **Функциональный флаг**: компонент проверяет `useCategoriesEnabled()` и возвращает `null` , если категории отключены.
- **Адаптивное переполнение**: в однострочном режиме категории прокручиваются горизонтально со скрытой полосой прокрутки.
- **Развернуть/Свернуть**: кнопка переключения переключает между однострочной прокруткой и многострочным макетом.
- **Обнаружение активного состояния**: сравнивает текущий путь с URL-адресом категории, чтобы выделить активный фильтр.
- **Кнопка «Все категории»**: всегда отображается первой, действует как фильтр сброса общего количества.
- **Прикрепленный заголовок**: если `enableSticky` имеет значение true, полоса становится липкой после прокрутки более 250 пикселей, добавляя размытие фона.

### Пример использования

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Управление категориями администратора

### хук useAdminCategories

Хук `hooks/use-admin-categories.ts` обеспечивает полные операции CRUD:

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

### Запрос фабрики ключей

Категории используют структурированную иерархию ключей запроса для точного аннулирования кэша:

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

### Крючок одной категории

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

### Хук только для мутаций

Для компонентов, которым нужны только операции записи без запроса списка:

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

## Параметры списка категорий

Конечная точка списка администраторов поддерживает фильтрацию и нумерацию страниц:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Конечные точки API

| Метод | Конечная точка | Цель |
|--------|----------|---------|
| ПОЛУЧИТЬ | `/api/admin/categories` | Список категорий с нумерацией страниц |
| ПОЛУЧИТЬ | `/api/admin/categories/all` | Получить все категории без нумерации страниц |
| ПОЛУЧИТЬ | `/api/admin/categories/:id` | Получить одну категорию |
| ПОСТ | `/api/admin/categories` | Создать новую категорию |
| ПУТЬ | `/api/admin/categories/:id` | Обновить существующую категорию |
| УДАЛИТЬ | `/api/admin/categories/:id` | Мягкое удаление категории |
| УДАЛИТЬ | `/api/admin/categories/:id?hard=true` | Удаление категории навсегда |

## Интеграция фильтров

Категории интегрируются с системой фильтров через модуль `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

Контекст фильтра отслеживает выбранную категорию и автоматически применяет ее к запросам элементов.

## Флаг функции

Категории можно включать и отключать глобально с помощью хука `useCategoriesEnabled` , который считывается из системы флагов функций:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Если этот параметр отключен, и панель навигации, и компоненты фильтра возвращают значение `null` .

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `components/items-categories.tsx` | Панель навигации общедоступных категорий |
| `components/categories-grid.tsx` | Сетка для отображения категорий |
| `components/admin/categories/` | Компоненты администрирования CRUD |
| `components/filters/components/categories/` | Интеграция фильтров |
| `hooks/use-admin-categories.ts` | Перехватчик CRUD администратора с React Query |
| `hooks/use-categories-enabled.ts` | Проверка флага функции |
| `hooks/use-categories-exists.ts` | Проверка доступности данных |
| `app/api/admin/categories/` | Внутренние маршруты API |
