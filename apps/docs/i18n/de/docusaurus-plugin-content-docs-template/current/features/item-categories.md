---
id: item-categories
title: Artikelkategorien
sidebar_label: Artikelkategorien
sidebar_position: 24
---

# Artikelkategorien

Kategorien bieten eine hierarchische Möglichkeit, Elemente im Verzeichnis zu organisieren. Die Vorlage umfasst ein vollständiges Kategorieverwaltungssystem mit Administrator-CRUD-Vorgängen, einer öffentlich zugänglichen Kategoriennavigationsleiste und Filterintegration.

## Architekturübersicht

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

## Kategoriedatenmodell

Kategorien werden mit der folgenden Schnittstelle aus der Inhaltsebene dargestellt:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

Die Admin-Schnittstelle verwendet einen erweiterten Typ:

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

## Öffentliche Kategorienavigation

Die `ItemsCategories` -Komponente bei `components/items-categories.tsx` rendert eine horizontale scrollbare Kategorieleiste mit optionalem Sticky-Verhalten:

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

### Hauptmerkmale

- **Feature Flag Gating**: Die Komponente prüft `useCategoriesEnabled()` und gibt `null` zurück, wenn Kategorien deaktiviert sind
- **Responsiver Überlauf**: Im Einzelzeilenmodus scrollen Kategorien horizontal mit versteckter Bildlaufleiste
- **Erweitern/Reduzieren**: Eine Umschalttaste schaltet zwischen einzeiligem Scrollen und umbrochenem mehrzeiligem Layout um
- **Erkennung des aktiven Status**: vergleicht den aktuellen Pfadnamen mit der Kategorie-URL, um den aktiven Filter hervorzuheben
- **Schaltfläche „Alle Kategorien“**: wird immer zuerst gerendert, fungiert als Rücksetzfilter mit der Gesamtzahl
- **Sticky-Header**: Wenn `enableSticky` wahr ist, wird die Leiste nach dem Scrollen über 250 Pixel klebrig und fügt einen unscharfen Hintergrund hinzu

### Anwendungsbeispiel

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Admin-Kategorieverwaltung

### useAdminCategories-Hook

Der `hooks/use-admin-categories.ts` -Hook bietet vollständige CRUD-Operationen:

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

### Schlüsselfabrik abfragen

Kategorien verwenden eine strukturierte Abfrageschlüsselhierarchie für eine präzise Cache-Ungültigmachung:

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

### Einzelkategorie-Hook

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

### Mutation-Only-Hook

Für Komponenten, die nur Schreiboperationen ohne die Listenabfrage benötigen:

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

## Optionen für die Kategorieliste

Der Admin-Listenendpunkt unterstützt Filterung und Paginierung:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## API-Endpunkte

| Methode | Endpunkt | Zweck |
|--------|----------|---------|
| GET | `/api/admin/categories` | Kategorien mit Paginierung auflisten |
| GET | `/api/admin/categories/all` | Alle Kategorien ohne Paginierung abrufen |
| GET | `/api/admin/categories/:id` | Holen Sie sich eine einzelne Kategorie |
| POST | `/api/admin/categories` | Erstellen Sie eine neue Kategorie |
| PUT | `/api/admin/categories/:id` | Eine vorhandene Kategorie aktualisieren |
| LÖSCHEN | `/api/admin/categories/:id` | Eine Kategorie vorläufig löschen |
| LÖSCHEN | `/api/admin/categories/:id?hard=true` | Eine Kategorie dauerhaft löschen |

## Filterintegration

Kategorien werden über das Modul `filters/` in das Filtersystem integriert:

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

Der Filterkontext verfolgt die ausgewählte Kategorie und wendet sie automatisch auf Artikelabfragen an.

## Feature-Flag

Kategorien können global über den `useCategoriesEnabled` -Hook aktiviert oder deaktiviert werden, der aus dem Feature-Flags-System liest:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Bei Deaktivierung geben sowohl die Navigationsleiste als auch die Filterkomponenten `null` zurück.

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `components/items-categories.tsx` | Navigationsleiste für öffentliche Kategorien |
| `components/categories-grid.tsx` | Rasterlayout für die Kategorieanzeige |
| `components/admin/categories/` | Admin CRUD-Komponenten |
| `components/filters/components/categories/` | Filterintegration |
| `hooks/use-admin-categories.ts` | Admin CRUD-Hook mit React Query |
| `hooks/use-categories-enabled.ts` | Feature-Flag-Prüfung |
| `hooks/use-categories-exists.ts` | Datenverfügbarkeitsprüfung |
| `app/api/admin/categories/` | Backend-API-Routen |
