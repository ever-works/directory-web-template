---
id: search-system
title: Suchsystem
sidebar_label: Suchsystem
sidebar_position: 26
---

# Suchsystem

Die Vorlage implementiert ein mehrschichtiges Such- und Filtersystem, das URL-basierten Status, entprellte Texteingabe, Kategorie- und Tag-Filter sowie Sortierkontrollen kombiniert. Das System ist für eine schnell wahrgenommene Leistung mit entprellten Abfragen und automatischen Seitenzurücksetzungen ausgelegt.

## Architekturübersicht

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

## Modulexporte filtern

Das Filtermodul sorgt für einen sauberen Barrel-Export:

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

## Suche entprellt

Der `useDebounceSearch` -Hook bei `hooks/use-debounced-search.ts` bietet eine Suchfunktion mit Verzögerung:

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

Wichtige Verhaltensweisen:
- **Standardverzögerung**: 300 ms Entprellung verhindert übermäßige API-Aufrufe während der Eingabe
- **Verhinderung von Duplikaten**: Vergleicht mit dem vorherigen Wert, um redundante Suchvorgänge zu überspringen
- **Ladestatus**: `isSearching` ist `true` , während der entprellte Wert noch nicht festgelegt ist ODER während der Suchrückruf ausgeführt wird
- **Löschfunktion**: Setzt den internen Status für das programmgesteuerte Löschen zurück

## Client-Elementfilter

Der `useClientItemFilters` -Hook bei `hooks/use-client-item-filters.ts` verwaltet alle Filterdimensionen:

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

### Automatisches Zurücksetzen der Seite

Wenn sich Filter ändern, wird die Seite automatisch auf 1 zurückgesetzt, um zu vermeiden, dass leere Ergebnisseiten angezeigt werden:

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

### Aktive Filtererkennung

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Kontext filtern

Das Filtersystem verwendet einen Reaktionskontext, um den Filterstatus über tief verschachtelte Komponenten hinweg zu teilen:

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

Komponenten greifen über den Hook `useFilters` auf den Shared-Status zu:

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Such-API-Integration

Suchanfragen fließen über die API-Ebene zum Backend. Das typische Muster:

1. Der Benutzer gibt die Sucheingabe ein
2. `useDebounceSearch` wartet 300ms nach dem letzten Tastendruck
3. Der entprellte Wert aktualisiert `params.search` im Filter-Hook
4. React Query erkennt die Parameteränderung und löst einen neuen Abruf aus
5. Die Ergebnisse werden mit Ladeindikatoren angezeigt

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Paginierung

Das Filtersystem umfasst integrierte Paginierungshilfen:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

Die `Paginate` -Komponente aus dem Filtermodul rendert Seitensteuerelemente und synchronisiert sich mit dem Filterkontext.

## Steuerelemente sortieren

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## URL-synchronisierter Status

Der `useFilterState` -Hook synchronisiert Filterwerte mit URL-Abfrageparametern und ermöglicht so gemeinsam nutzbare gefilterte Ansichten:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

Das Dienstprogramm `filter-url-parser.tsx` verwaltet das Parsen von Filterparametern aus der URL beim ersten Laden der Seite.

## Sticky-Filter-Header

Der Haken `useStickyHeader` verwaltet das Sticky-Verhalten der Filterleiste:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Wenn der Benutzer über einen Schwellenwert hinaus scrollt, bleibt die Filterleiste mit einem unscharfen Hintergrund und einem Schatteneffekt hängen.

## Aktive Filterchips

Die `ActiveFilters` -Komponente zeigt aktuell angewendete Filter als verwerfbare Chips an:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `components/filters/index.ts` | Fassexporte für das Filtermodul |
| `components/filters/context/filter-context.tsx` | FilterProvider und useFilters-Hook |
| `components/filters/hooks/use-filter-state.ts` | Status des URL-synchronisierten Filters |
| `components/filters/hooks/use-sticky-header.ts` | Sticky-Filterleistenverhalten |
| `components/filters/components/categories/` | Kategoriefilter-Benutzeroberfläche |
| `components/filters/components/tags/` | Tag-Filter-Benutzeroberfläche |
| `components/filters/components/controls/` | Sortier- und Layout-Steuerelemente |
| `components/filters/components/active-filters/` | Aktive Filterchips |
| `components/filters/components/pagination/` | Paginierungskomponente |
| `hooks/use-debounced-search.ts` | Entprellte Suche mit Ladestatus |
| `hooks/use-debounced-value.ts` | Allgemeines Entprellwert-Dienstprogramm |
| `hooks/use-client-item-filters.ts` | Clientseitige Filterstatusverwaltung |
