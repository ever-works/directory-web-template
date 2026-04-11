---
id: item-categories
title: Categorie di articoli
sidebar_label: Categorie di articoli
sidebar_position: 24
---

# Categorie di articoli

Le categorie forniscono un modo gerarchico per organizzare gli elementi nella directory. Il modello include un sistema completo di gestione delle categorie con operazioni CRUD di amministrazione, una barra di navigazione delle categorie rivolta al pubblico e l'integrazione dei filtri.

## Panoramica dell'architettura

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

## Modello di dati di categoria

Le categorie sono rappresentate con la seguente interfaccia dal livello del contenuto:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

L'interfaccia di amministrazione utilizza un tipo esteso:

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

## Navigazione nelle categorie pubbliche

Il componente `ItemsCategories` in `components/items-categories.tsx` esegue il rendering di una barra di categoria scorrevole orizzontale con comportamento permanente opzionale:

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

### Caratteristiche principali

- **Gating flag funzionalità**: il componente controlla `useCategoriesEnabled()` e restituisce `null` se le categorie sono disabilitate
- **Overflow reattivo**: in modalità a riga singola, le categorie scorrono orizzontalmente con uno stile di barra di scorrimento nascosta
- **Espandi/comprimi**: un pulsante di attivazione/disattivazione consente di passare dallo scorrimento a riga singola al layout a più righe avvolto
- **Rilevamento dello stato attivo**: confronta il percorso corrente con l'URL della categoria per evidenziare il filtro attivo
- **Pulsante "Tutte le categorie"**: visualizzato sempre per primo, funge da filtro di ripristino con il conteggio totale
- **Intestazione fissa**: quando `enableSticky` è vero, la barra diventa fissa dopo aver superato i 250 px, aggiungendo uno sfondo sfocato

### Esempio di utilizzo

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Gestione delle categorie di amministrazione

### usaAdminCategories Hook

L'hook `hooks/use-admin-categories.ts` fornisce operazioni CRUD complete:

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

### Interroga la fabbrica di chiavi

Le categorie utilizzano una gerarchia di chiavi di query strutturata per un preciso invalidamento della cache:

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

### Hook a categoria singola

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

### Hook di sola mutazione

Per i componenti che necessitano solo di operazioni di scrittura senza la query di elenco:

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

## Opzioni elenco categorie

L'endpoint dell'elenco di amministrazione supporta il filtraggio e l'impaginazione:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Endpoint API

| Metodo | Punto finale | Scopo |
|--------|----------|---------|
| OTTIENI | `/api/admin/categories` | Elenca le categorie con impaginazione |
| OTTIENI | `/api/admin/categories/all` | Ottieni tutte le categorie senza impaginazione |
| OTTIENI | `/api/admin/categories/:id` | Ottieni una singola categoria |
| POST | `/api/admin/categories` | Crea una nuova categoria |
| METTERE | `/api/admin/categories/:id` | Aggiorna una categoria esistente |
| ELIMINA | `/api/admin/categories/:id` | Eliminazione temporanea di una categoria |
| ELIMINA | `/api/admin/categories/:id?hard=true` | Elimina definitivamente una categoria |

## Integrazione filtro

Le categorie si integrano al sistema di filtraggio attraverso il modulo `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

Il contesto del filtro tiene traccia della categoria selezionata e la applica automaticamente alle query sugli elementi.

## Flag di funzionalità

Le categorie possono essere abilitate o disabilitate globalmente tramite l'hook `useCategoriesEnabled` , che legge dal sistema di flag delle funzionalità:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Quando disabilitati, sia la barra di navigazione che i componenti del filtro restituiscono `null` .

## Riferimento al file

| File | Scopo |
|------|---------|
| `components/items-categories.tsx` | Barra di navigazione delle categorie pubbliche |
| `components/categories-grid.tsx` | Layout della griglia per la visualizzazione delle categorie |
| `components/admin/categories/` | Componenti CRUD di amministrazione |
| `components/filters/components/categories/` | Integrazione filtro |
| `hooks/use-admin-categories.ts` | Hook CRUD di amministrazione con React Query |
| `hooks/use-categories-enabled.ts` | Controllo flag funzionalità |
| `hooks/use-categories-exists.ts` | Verifica disponibilità dati |
| `app/api/admin/categories/` | Percorsi API backend |
