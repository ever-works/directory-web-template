---
id: item-categories
title: Categorías de artículos
sidebar_label: Categorías de artículos
sidebar_position: 24
---

# Categorías de artículos

Las categorías proporcionan una forma jerárquica de organizar elementos en el directorio. La plantilla incluye un sistema completo de gestión de categorías con operaciones CRUD de administración, una barra de navegación de categorías orientada al público e integración de filtrado.

## Descripción general de la arquitectura

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

## Modelo de datos de categoría

Las categorías se representan con la siguiente interfaz desde la capa de contenido:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

La interfaz de administración utiliza un tipo extendido:

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

## Navegación por categorías públicas

El componente `ItemsCategories` en `components/items-categories.tsx` representa una barra de categorías desplazable horizontal con comportamiento adhesivo opcional:

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

### Características clave

- **Bloqueo de indicadores de características**: el componente verifica `useCategoriesEnabled()` y devuelve `null` si las categorías están deshabilitadas
- **Desbordamiento responsivo**: en modo de una sola fila, las categorías se desplazan horizontalmente con un estilo de barra de desplazamiento oculto
- **Expandir/contraer**: un botón de alternancia cambia entre desplazamiento de una sola fila y diseño ajustado de varias filas
- **Detección de estado activo**: compara el nombre de la ruta actual con la URL de la categoría para resaltar el filtro activo
- **Botón "Todas las categorías"**: siempre se representa primero, actúa como un filtro de reinicio con el recuento total
- **Encabezado fijo**: cuando `enableSticky` es verdadero, la barra se vuelve fija después de desplazarse más allá de 250 px, lo que agrega un fondo borroso.

### Ejemplo de uso

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Gestión de categorías de administrador

### useAdminCategories Hook

El gancho `hooks/use-admin-categories.ts` proporciona operaciones CRUD completas:

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

### Consultar fábrica de claves

Las categorías utilizan una jerarquía de claves de consulta estructurada para una invalidación precisa de la caché:

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

### Gancho de categoría única

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

### Gancho de solo mutación

Para componentes que solo necesitan operaciones de escritura sin la consulta de lista:

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

## Opciones de lista de categorías

El punto final de la lista de administradores admite filtrado y paginación:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Puntos finales API

| Método | Punto final | Propósito |
|--------|----------|---------|
| OBTENER | `/api/admin/categories` | Listar categorías con paginación |
| OBTENER | `/api/admin/categories/all` | Obtener todas las categorías sin paginación |
| OBTENER | `/api/admin/categories/:id` | Obtener una sola categoría |
| PUBLICAR | `/api/admin/categories` | Crear una nueva categoría |
| PONER | `/api/admin/categories/:id` | Actualizar una categoría existente |
| BORRAR | `/api/admin/categories/:id` | Eliminación temporal de una categoría |
| BORRAR | `/api/admin/categories/:id?hard=true` | Eliminar permanentemente una categoría |

## Integración de filtros

Las categorías se integran con el sistema de filtrado a través del módulo `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

El contexto del filtro rastrea la categoría seleccionada y la aplica a las consultas de elementos automáticamente.

## Bandera de función

Las categorías se pueden habilitar o deshabilitar globalmente a través del enlace `useCategoriesEnabled` , que lee desde el sistema de indicadores de características:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Cuando está deshabilitado, tanto la barra de navegación como los componentes del filtro devuelven `null` .

## Referencia de archivo

| Archivo | Propósito |
|------|---------|
| `components/items-categories.tsx` | Barra de navegación de categorías públicas |
| `components/categories-grid.tsx` | Diseño de cuadrícula para visualización de categorías |
| `components/admin/categories/` | Componentes CRUD de administración |
| `components/filters/components/categories/` | Integración de filtros |
| `hooks/use-admin-categories.ts` | Gancho CRUD de administrador con consulta React |
| `hooks/use-categories-enabled.ts` | Verificación de bandera de característica |
| `hooks/use-categories-exists.ts` | Verificación de disponibilidad de datos |
| `app/api/admin/categories/` | Rutas API de backend |
