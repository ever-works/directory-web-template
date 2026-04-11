---
id: item-categories
title: Kategorie przedmiotów
sidebar_label: Kategorie przedmiotów
sidebar_position: 24
---

# Kategorie przedmiotów

Kategorie zapewniają hierarchiczny sposób organizowania elementów w katalogu. Szablon zawiera pełny system zarządzania kategoriami z administracyjnymi operacjami CRUD, widocznym publicznie paskiem nawigacji kategorii i integracją filtrowania.

## Przegląd architektury

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

## Model danych kategorii

Kategorie są reprezentowane za pomocą następującego interfejsu z warstwy treści:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

Interfejs administratora wykorzystuje typ rozszerzony:

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

## Nawigacja w kategorii publicznej

Komponent `ItemsCategories` w `components/items-categories.tsx` renderuje przewijany w poziomie pasek kategorii z opcjonalnym zachowaniem lepkości:

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

### Kluczowe funkcje

- **Gating flag funkcji**: komponent sprawdza `useCategoriesEnabled()` i zwraca `null` , jeśli kategorie są wyłączone
- **Responsywne przepełnienie**: w trybie jednowierszowym kategorie przewijają się w poziomie z ukrytym stylem paska przewijania
- **Rozwiń/zwiń**: przycisk przełączający przełącza między przewijaniem w jednym wierszu a zawiniętym układem wielu wierszy
- **Wykrywanie stanu aktywnego**: porównuje bieżącą ścieżkę z adresem URL kategorii, aby podświetlić aktywny filtr
- **Przycisk „Wszystkie kategorie”**: zawsze renderowany jako pierwszy, działa jak filtr resetujący z całkowitą liczbą
- **Przyklejony nagłówek**: gdy `enableSticky` jest prawdą, pasek staje się lepki po przewinięciu powyżej 250 pikseli, dodając rozmyte tło

### Przykład użycia

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Zarządzanie kategorią administracyjną

### hak useAdminCategories

Hak `hooks/use-admin-categories.ts` zapewnia pełne operacje CRUD:

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

### Zapytanie o fabrykę kluczy

Kategorie korzystają ze strukturalnej hierarchii kluczy zapytań w celu precyzyjnego unieważniania pamięci podręcznej:

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

### Hak pojedynczej kategorii

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

### Hak przeznaczony wyłącznie do mutacji

W przypadku komponentów, które wymagają jedynie operacji zapisu bez zapytania listowego:

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

## Opcje listy kategorii

Punkt końcowy listy administratorów obsługuje filtrowanie i paginację:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Punkty końcowe interfejsu API

| Metoda | Punkt końcowy | Cel |
|--------|----------|--------|
| OTRZYMAJ | `/api/admin/categories` | Lista kategorii z paginacją |
| OTRZYMAJ | `/api/admin/categories/all` | Pobierz wszystkie kategorie bez paginacji |
| OTRZYMAJ | `/api/admin/categories/:id` | Uzyskaj jedną kategorię |
| POST | `/api/admin/categories` | Utwórz nową kategorię |
| POSTAW | `/api/admin/categories/:id` | Zaktualizuj istniejącą kategorię |
| USUŃ | `/api/admin/categories/:id` | Miękkie usuwanie kategorii |
| USUŃ | `/api/admin/categories/:id?hard=true` | Trwale usuń kategorię |

## Integracja filtra

Kategorie integrują się z systemem filtrów poprzez moduł `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

Kontekst filtra śledzi wybraną kategorię i automatycznie stosuje ją do zapytań o pozycje.

## Flaga funkcji

Kategorie można włączać i wyłączać globalnie za pomocą haka `useCategoriesEnabled` , który odczytuje z systemu flag funkcji:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Po wyłączeniu zarówno pasek nawigacyjny, jak i komponenty filtra zwracają wartość `null` .

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `components/items-categories.tsx` | Pasek nawigacyjny kategorii publicznej |
| `components/categories-grid.tsx` | Układ siatki do wyświetlania kategorii |
| `components/admin/categories/` | Administrator komponentów CRUD |
| `components/filters/components/categories/` | Integracja filtra |
| `hooks/use-admin-categories.ts` | Hak administracyjny CRUD z zapytaniem React |
| `hooks/use-categories-enabled.ts` | Kontrola flagi funkcji |
| `hooks/use-categories-exists.ts` | Kontrola dostępności danych |
| `app/api/admin/categories/` | Trasy API zaplecza |
