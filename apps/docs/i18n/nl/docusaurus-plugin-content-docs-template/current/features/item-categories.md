---
id: item-categories
title: Artikelcategorieën
sidebar_label: Artikelcategorieën
sidebar_position: 24
---

# Artikelcategorieën

Categorieën bieden een hiërarchische manier om items in de directory te ordenen. De sjabloon bevat een volledig categoriebeheersysteem met CRUD-beheerbewerkingen, een openbare categorienavigatiebalk en filterintegratie.

## Architectuuroverzicht

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

## Categoriegegevensmodel

Categorieën worden weergegeven met de volgende interface vanuit de inhoudslaag:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

De beheerdersinterface gebruikt een uitgebreid type:

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

## Navigatie openbare categorie

De component `ItemsCategories` bij `components/items-categories.tsx` geeft een horizontaal schuifbare categoriebalk weer met optioneel plakgedrag:

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

### Belangrijkste kenmerken

- **Feature flag gating**: de component controleert `useCategoriesEnabled()` en retourneert `null` als categorieën zijn uitgeschakeld
- **Responsieve overloop**: in de modus met één rij scrollen categorieën horizontaal met verborgen schuifbalkstijl
- **Uitbreiden/samenvouwen**: een schakelknop schakelt tussen scrollen in één rij en de indeling met meerdere rijen
- **Detectie van actieve status**: vergelijkt de huidige padnaam met de categorie-URL om het actieve filter te markeren
- **Knop 'Alle categorieën'**: wordt altijd als eerste weergegeven en fungeert als resetfilter voor het totale aantal
- **Sticky header**: wanneer `enableSticky` waar is, wordt de balk plakkerig na het scrollen voorbij 250px, waardoor een onscherpe achtergrond ontstaat

### Gebruiksvoorbeeld

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Beheerdercategoriebeheer

### gebruikAdminCategories Hook

De `hooks/use-admin-categories.ts` -haak biedt volledige CRUD-bewerkingen:

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

### Querysleutelfabriek

Categorieën gebruiken een gestructureerde querysleutelhiërarchie voor nauwkeurige cache-invalidatie:

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

### Enkele categorie haak

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

### Alleen mutatie-haak

Voor componenten die alleen schrijfbewerkingen nodig hebben zonder de lijstquery:

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

## Categorielijstopties

Het eindpunt van de beheerderslijst ondersteunt filteren en paginering:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## API-eindpunten

| Werkwijze | Eindpunt | Doel |
|--------|----------|---------|
| KRIJG | `/api/admin/categories` | Lijstcategorieën met paginering |
| KRIJG | `/api/admin/categories/all` | Krijg alle categorieën zonder paginering |
| KRIJG | `/api/admin/categories/:id` | Eén categorie verkrijgen |
| POST | `/api/admin/categories` | Maak een nieuwe categorie |
| ZET | `/api/admin/categories/:id` | Een bestaande categorie bijwerken |
| VERWIJDEREN | `/api/admin/categories/:id` | Een categorie zacht verwijderen |
| VERWIJDEREN | `/api/admin/categories/:id?hard=true` | Een categorie definitief verwijderen |

## Filterintegratie

Categorieën integreren met het filtersysteem via de `filters/` module:

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

De filtercontext volgt de geselecteerde categorie en past deze automatisch toe op itemquery's.

## Functievlag

Categorieën kunnen globaal worden in- of uitgeschakeld via de `useCategoriesEnabled` hook, die leest uit het feature flags-systeem:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Indien uitgeschakeld, retourneren zowel de navigatiebalk als de filtercomponenten `null` .

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `components/items-categories.tsx` | Navigatiebalk voor openbare categorieën |
| `components/categories-grid.tsx` | Rasterindeling voor categorieweergave |
| `components/admin/categories/` | Beheerder CRUD-componenten |
| `components/filters/components/categories/` | Filterintegratie |
| `hooks/use-admin-categories.ts` | Admin CRUD-hook met React Query |
| `hooks/use-categories-enabled.ts` | Functievlagcontrole |
| `hooks/use-categories-exists.ts` | Controle van de beschikbaarheid van gegevens |
| `app/api/admin/categories/` | Backend API-routes |
