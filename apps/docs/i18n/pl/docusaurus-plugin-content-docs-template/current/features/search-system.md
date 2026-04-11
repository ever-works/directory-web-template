---
id: search-system
title: System wyszukiwania
sidebar_label: System wyszukiwania
sidebar_position: 26
---

# System wyszukiwania

Szablon implementuje wielowarstwowy system wyszukiwania i filtrowania, który łączy stan oparty na adresie URL, odrzucone wprowadzanie tekstu, filtry kategorii i tagów oraz kontrolki sortowania. System został zaprojektowany z myślą o szybkiej postrzeganej wydajności dzięki odrzuconym zapytaniom i automatycznemu resetowaniu strony.

## Przegląd architektury

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

## Eksport modułu filtra

Moduł filtrów zapewnia czysty eksport beczek:

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

## Odrzucone wyszukiwanie

Zaczep `useDebounceSearch` w `hooks/use-debounced-search.ts` zapewnia funkcję wyszukiwania z opóźnieniem:

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

Kluczowe zachowania:
- **Domyślne opóźnienie**: Odbicie trwające 300 ms zapobiega nadmiernym wywołaniom API podczas pisania
- **Zapobieganie duplikatom**: porównuje z poprzednią wartością, aby pominąć zbędne wyszukiwania
- **Stan ładowania**: `isSearching` wynosi `true` , gdy odrzucona wartość nie została jeszcze ustalona LUB gdy uruchomione jest wywołanie zwrotne wyszukiwania
- **Funkcja kasowania**: resetuje stan wewnętrzny w celu kasowania programowego

## Filtry elementów klienta

Hak `useClientItemFilters` w `hooks/use-client-item-filters.ts` zarządza wszystkimi wymiarami filtra:

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

### Automatyczne resetowanie strony

Po zmianie filtrów strona jest automatycznie resetowana do wartości 1, aby uniknąć wyświetlania pustych stron wyników:

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

### Wykrywanie aktywnego filtra

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Kontekst filtra

System filtrów wykorzystuje kontekst reakcji do udostępniania stanu filtra głęboko zagnieżdżonym komponentom:

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

Komponenty uzyskują dostęp do stanu współdzielonego poprzez hak `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Integracja API wyszukiwania

Zapytania wyszukiwania przepływają przez warstwę API do backendu. Typowy wzór:

1. Użytkownik wpisuje dane wejściowe wyszukiwania
2. `useDebounceSearch` czeka 300 ms po ostatnim naciśnięciu klawisza
3. Odrzucona wartość aktualizuje `params.search` w zaczepie filtra
4. React Query wykrywa zmianę parametrów i uruchamia nowe pobieranie
5. Wyniki są wyświetlane ze wskaźnikami ładowania

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Paginacja

System filtrów zawiera wbudowane pomoce paginacji:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

Komponent `Paginate` z modułu filtra renderuje elementy sterujące strony i synchronizuje się z kontekstem filtra.

## Sterowanie sortowaniem

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## Stan synchronizacji z adresem URL

Hak `useFilterState` synchronizuje wartości filtrów z parametrami zapytania URL, umożliwiając udostępnianie filtrowanych widoków:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

Narzędzie `filter-url-parser.tsx` obsługuje parsowanie parametrów filtra z adresu URL przy pierwszym ładowaniu strony.

## Przyklejony nagłówek filtra

Hak `useStickyHeader` zarządza lepkim zachowaniem paska filtra:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Gdy użytkownik przewinie poza próg, pasek filtra staje się lepki, a tło i efekt cienia są rozmyte.

## Aktywne żetony filtrów

Komponent `ActiveFilters` wyświetla aktualnie stosowane filtry jako elementy, które można odrzucić:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `components/filters/index.ts` | Eksport beczek dla modułu filtra |
| `components/filters/context/filter-context.tsx` | FilterProvider i hak useFilters |
| `components/filters/hooks/use-filter-state.ts` | Stan filtra zsynchronizowanego z adresem URL |
| `components/filters/hooks/use-sticky-header.ts` | Zachowanie lepkiego paska filtra |
| `components/filters/components/categories/` | Interfejs filtra kategorii |
| `components/filters/components/tags/` | Interfejs filtra tagów |
| `components/filters/components/controls/` | Sterowanie sortowaniem i układem |
| `components/filters/components/active-filters/` | Aktywne chipy filtrów |
| `components/filters/components/pagination/` | Składnik paginacji |
| `hooks/use-debounced-search.ts` | Odrzucone wyszukiwanie ze stanem ładowania |
| `hooks/use-debounced-value.ts` | Ogólne narzędzie wartości odbicia |
| `hooks/use-client-item-filters.ts` | Zarządzanie stanem filtra po stronie klienta |
