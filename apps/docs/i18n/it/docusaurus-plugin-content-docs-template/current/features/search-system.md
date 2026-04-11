---
id: search-system
title: Sistema di ricerca
sidebar_label: Sistema di ricerca
sidebar_position: 26
---

# Sistema di ricerca

Il modello implementa un sistema di ricerca e filtro a più livelli che combina stato basato su URL, input di testo antirimbalzo, filtri di categoria e tag e controlli di ordinamento. Il sistema è progettato per prestazioni percepite rapidamente con query rimbalzate e reimpostazioni automatiche delle pagine.

## Panoramica dell'architettura

```
components/filters/
  index.ts                              -- Barrel exports
  types.ts                              -- Filter type definitions
  constants.ts                          -- Default values and configuration
  context/filter-context.tsx            -- FilterProvider and useFilters hook
  hooks/
    use-filter-state.ts                 -- URL-synced filter state
    use-sticky-header.ts                -- Sticky filter bar behavior
    use-tag-visibility.ts               -- Tag expand/collapse logic
  components/
    categories/                         -- Category filter components
    tags/                               -- Tag filter components
    controls/filter-controls.tsx        -- Sort and layout controls
    active-filters/active-filters.tsx   -- Active filter chips
    pagination/paginate.tsx             -- Pagination component
  utils/
    text-utils.ts                       -- Text formatting utilities
    style-utils.ts                      -- Dynamic style generation

hooks/
  use-debounced-search.ts              -- Debounced search hook
  use-debounced-value.ts               -- Generic debounce value hook
  use-client-item-filters.ts           -- Client-side filter state
  use-client-items.ts                  -- Item data fetching with filters

components/filters/filter-url-parser.tsx -- URL parameter parsing
```

## Filtra le esportazioni del modulo

Il modulo filtri fornisce un'esportazione pulita del barile:

```tsx
// components/filters/index.ts
export * from './types';
export * from './constants';
export { FilterProvider, FilterContext, useFilters } from './context/filter-context';
export { useFilterState } from './hooks/use-filter-state';
export { useStickyHeader } from './hooks/use-sticky-header';
export { useTagVisibility } from './hooks/use-tag-visibility';
export { Categories } from './components/categories/categories-section';
export { Tags } from './components/tags/tags-section';
export { Paginate } from './components/pagination/paginate';
export { FilterControls } from './components/controls/filter-controls';
export { ActiveFilters } from './components/active-filters/active-filters';
export { CategoriesList, CategoryItem } from './components/categories';
export { TagsList, TagItem } from './components/tags';
export { SortControl } from './components/controls';
```

## Ricerca rimbalzata

L'aggancio `useDebounceSearch` a `hooks/use-debounced-search.ts` fornisce la funzionalità di ricerca con ritardo:

```tsx
// hooks/use-debounced-search.ts
interface UseDebounceSearchProps {
  searchValue: string;
  delay?: number;
  onSearch: (value: string) => void | Promise<void>;
}

export function useDebounceSearch({
  searchValue,
  delay = 300,
  onSearch,
}: UseDebounceSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedValue = useDebounceValue(searchValue, delay);
  const previousValue = useRef<string>('');

  useEffect(() => {
    if (debouncedValue === previousValue.current) return;
    previousValue.current = debouncedValue;

    if (debouncedValue.trim() === '') {
      setIsSearching(false);
      onSearch('');
      return;
    }

    setIsSearching(true);
    onSearch(debouncedValue).finally(() => setIsSearching(false));
  }, [debouncedValue]);

  return { debouncedValue, isSearching, clearSearch };
}
```

Comportamenti chiave:
- **Ritardo predefinito**: il rimbalzo di 300 ms impedisce un numero eccessivo di chiamate API durante la digitazione
- **Prevenzione duplicati**: confronta con il valore precedente per saltare le ricerche ridondanti
- **Stato di caricamento**: `isSearching` è `true` mentre il valore antirimbalzo non si è ancora stabilizzato OPPURE mentre la richiamata di ricerca è in esecuzione
- **Funzione Cancella**: ripristina lo stato interno per la cancellazione programmatica

## Filtri articoli cliente

Il gancio `useClientItemFilters` su `hooks/use-client-item-filters.ts` gestisce tutte le dimensioni del filtro:

```tsx
// hooks/use-client-item-filters.ts
export function useClientItemFilters(options = {}) {
  const {
    defaultStatus = 'all',
    defaultSearch = '',
    defaultPage = 1,
    defaultLimit = 10,
    defaultSortBy = 'updated_at',
    defaultSortOrder = 'desc',
    searchDebounceMs = 300,
  } = options;

  const [status, setStatusState] = useState(defaultStatus);
  const [search, setSearchState] = useState(defaultSearch);
  const [page, setPageState] = useState(defaultPage);
  const [sortBy, setSortByState] = useState(defaultSortBy);
  const [sortOrder, setSortOrderState] = useState(defaultSortOrder);

  const debouncedSearch = useDebounceValue(search, searchDebounceMs);

  // Combined params object for API calls
  const params = useMemo(() => ({
    page, limit, status,
    search: debouncedSearch || undefined,
    sortBy, sortOrder,
  }), [page, limit, status, debouncedSearch, sortBy, sortOrder]);

  return {
    status, search, debouncedSearch, page, limit, sortBy, sortOrder,
    params,
    setStatus, setSearch, setPage, setLimit,
    setSortBy, setSortOrder, toggleSortOrder,
    resetFilters, goToPage, nextPage, prevPage,
    isSearching, hasActiveFilters,
  };
}
```

### Ripristino automatico della pagina

Quando i filtri cambiano, la pagina viene automaticamente reimpostata su 1 per evitare di mostrare pagine di risultati vuote:

```tsx
const setStatus = useCallback((newStatus) => {
  setStatusState(newStatus);
  setPageState(1); // Reset to page 1
}, []);

const setSortBy = useCallback((newSortBy) => {
  setSortByState(newSortBy);
  setPageState(1); // Reset to page 1
}, []);
```

### Rilevamento filtro attivo

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Contesto del filtro

Il sistema di filtro utilizza un contesto React per condividere lo stato del filtro tra componenti profondamente nidificati:

```tsx
// Usage pattern
<FilterProvider>
  <Categories />
  <Tags />
  <FilterControls />
  <ActiveFilters />
  <ItemGrid />
  <Paginate />
</FilterProvider>
```

I componenti accedono allo stato condiviso tramite l'hook `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Integrazione API di ricerca

Le query di ricerca passano attraverso il livello API fino al backend. Lo schema tipico:

1. L'utente digita l'input di ricerca
2. `useDebounceSearch` attende 300 ms dopo l'ultima pressione di un tasto
3. Il valore antirimbalzo aggiorna `params.search` nel hook del filtro
4. React Query rileva la modifica dei parametri e attiva un nuovo recupero
5. I risultati vengono visualizzati con indicatori di caricamento

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Impaginazione

Il sistema di filtro include aiutanti di impaginazione integrati:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

Il componente `Paginate` del modulo filtro esegue il rendering dei controlli della pagina e si sincronizza con il contesto del filtro.

## Ordina i controlli

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## Stato di sincronizzazione dell'URL

L'hook `useFilterState` sincronizza i valori del filtro con i parametri di query dell'URL, consentendo visualizzazioni filtrate condivisibili:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

L'utilità `filter-url-parser.tsx` gestisce l'analisi dei parametri del filtro dall'URL al caricamento iniziale della pagina.

## Intestazione filtro fissa

Il gancio `useStickyHeader` gestisce il comportamento persistente della barra filtro:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Quando l'utente supera una soglia, la barra del filtro diventa fissa con uno sfondo sfocato e un effetto ombra.

## Chip filtro attivi

Il componente `ActiveFilters` mostra i filtri attualmente applicati come chip eliminabili:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Riferimento al file

| File | Scopo |
|------|---------|
| `components/filters/index.ts` | Esportazioni di barili per il modulo filtro |
| `components/filters/context/filter-context.tsx` | FilterProvider e useFilters hook |
| `components/filters/hooks/use-filter-state.ts` | Stato del filtro sincronizzato con URL |
| `components/filters/hooks/use-sticky-header.ts` | Comportamento della barra filtro fissa |
| `components/filters/components/categories/` | Interfaccia utente del filtro categoria |
| `components/filters/components/tags/` | Interfaccia utente del filtro tag |
| `components/filters/components/controls/` | Controlli di ordinamento e layout |
| `components/filters/components/active-filters/` | Chip filtro attivo |
| `components/filters/components/pagination/` | Componente impaginazione |
| `hooks/use-debounced-search.ts` | Ricerca rimbalzata con stato di caricamento |
| `hooks/use-debounced-value.ts` | Utilità generica per il valore di antirimbalzo |
| `hooks/use-client-item-filters.ts` | Gestione dello stato del filtro lato client |
