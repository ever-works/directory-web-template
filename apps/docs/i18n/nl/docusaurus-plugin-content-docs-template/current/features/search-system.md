---
id: search-system
title: Zoeksysteem
sidebar_label: Zoeksysteem
sidebar_position: 26
---

# Zoeksysteem

De sjabloon implementeert een meerlaags zoek- en filtersysteem dat op URL's gebaseerde status, debounced tekstinvoer, categorie- en tagfilters en sorteeropties combineert. Het systeem is ontworpen voor snelle waargenomen prestaties bij het terugsturen van zoekopdrachten en het automatisch opnieuw instellen van pagina's.

## Architectuuroverzicht

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

## Filtermodule-exports

De filtermodule zorgt voor een schone vatexport:

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

## Gedebouncede zoekopdracht

De `useDebounceSearch` -haak bij `hooks/use-debounced-search.ts` biedt zoek-met-vertragingsfunctionaliteit:

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

Belangrijkste gedragingen:
- **Standaardvertraging**: 300 ms debounce voorkomt overmatige API-aanroepen tijdens het typen
- **Dubbele preventie**: vergelijkt met de vorige waarde om overbodige zoekopdrachten over te slaan
- **Laadstatus**: `isSearching` is `true` terwijl de gedebouncede waarde nog niet is afgehandeld OF terwijl de zoek-callback actief is
- **Wisfunctie**: reset de interne status voor programmatisch wissen

## Klantitemfilters

De haak `useClientItemFilters` bij `hooks/use-client-item-filters.ts` beheert alle filterafmetingen:

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

### Automatische paginareset

Wanneer filters veranderen, wordt de pagina automatisch teruggezet naar 1 om te voorkomen dat lege resultaatpagina's worden weergegeven:

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

### Actieve filterdetectie

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Filtercontext

Het filtersysteem gebruikt een React Context om de filterstatus te delen met diep geneste componenten:

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

Componenten hebben toegang tot de gedeelde status via de `useFilters` -haak:

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Zoek-API-integratie

Zoekopdrachten stromen via de API-laag naar de backend. Het typische patroon:

1. Gebruiker typt in de zoekinvoer
2. `useDebounceSearch` wacht 300 ms na de laatste toetsaanslag
3. De gedebouncede waarde wordt bijgewerkt met `params.search` in de filterhaak
4. React Query detecteert de wijziging van de parameters en activeert een nieuwe ophaalactie
5. Resultaten worden weergegeven met laadindicatoren

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Paginering

Het filtersysteem bevat ingebouwde pagineringshulpmiddelen:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

De component `Paginate` van de filtermodule geeft paginabesturingselementen weer en synchroniseert met de filtercontext.

## Sorteerbedieningen

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## URL-gesynchroniseerde status

De `useFilterState` hook synchroniseert filterwaarden met URL-queryparameters, waardoor deelbare gefilterde weergaven mogelijk worden:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

Het hulpprogramma `filter-url-parser.tsx` zorgt voor het parseren van filterparameters van de URL bij het eerste laden van de pagina.

## Kleverige filterkop

De `useStickyHeader` haak regelt het kleverige gedrag van de filterbalk:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Wanneer de gebruiker voorbij een drempel scrolt, wordt de filterbalk plakkerig met een wazige achtergrond en schaduweffect.

## Actieve filterchips

De component `ActiveFilters` geeft de momenteel toegepaste filters weer als verwerpbare chips:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `components/filters/index.ts` | Vatexport voor de filtermodule |
| `components/filters/context/filter-context.tsx` | FilterProvider en useFilters-hook |
| `components/filters/hooks/use-filter-state.ts` | URL-gesynchroniseerde filterstatus |
| `components/filters/hooks/use-sticky-header.ts` | Gedrag van vastzittende filterbalk |
| `components/filters/components/categories/` | Gebruikersinterface voor categoriefilter |
| `components/filters/components/tags/` | Gebruikersinterface voor tagfilter |
| `components/filters/components/controls/` | Sorteer- en lay-outbesturingselementen |
| `components/filters/components/active-filters/` | Actieve filterchips |
| `components/filters/components/pagination/` | Pagineringscomponent |
| `hooks/use-debounced-search.ts` | Zoekopdracht gedebounced met laadstatus |
| `hooks/use-debounced-value.ts` | Generiek hulpprogramma voor debounce-waarde |
| `hooks/use-client-item-filters.ts` | Beheer van filterstatus aan clientzijde |
