---
id: search-system
title: Система за търсене
sidebar_label: Система за търсене
sidebar_position: 26
---

# Система за търсене

Шаблонът прилага многопластова система за търсене и филтриране, която съчетава базирано на URL състояние, въвеждане на текст с отблъскване, филтри за категории и етикети и контроли за сортиране. Системата е проектирана за бързо възприемане на производителност с отстранени заявки и автоматично нулиране на страници.

## Преглед на архитектурата

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

## Експортиране на филтърен модул

Модулът за филтри осигурява чист експорт на варел:

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

## Дебоунжирано търсене

Куката `useDebounceSearch` на `hooks/use-debounced-search.ts` осигурява функционалност за търсене със забавяне:

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

Ключови поведения:
- **Забавяне по подразбиране**: 300ms debounce предотвратява прекомерните API извиквания по време на писане
- **Предотвратяване на дублиране**: сравнява с предишната стойност, за да пропусне излишните търсения
- **Състояние на зареждане**: `isSearching` е `true` , докато стойността за отскачане все още не се е установила ИЛИ докато се изпълнява обратното извикване за търсене
- **Функция за изчистване**: нулира вътрешното състояние за програмно изчистване

## Филтри за клиентски артикули

Куката `useClientItemFilters` на `hooks/use-client-item-filters.ts` управлява всички размери на филтъра:

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

### Автоматично нулиране на страницата

Когато филтрите се променят, страницата автоматично се нулира на 1, за да се избегне показването на празни страници с резултати:

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

### Откриване на активен филтър

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Контекст на филтъра

Филтриращата система използва контекст на React, за да споделя състоянието на филтъра между дълбоко вложени компоненти:

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

Компонентите имат достъп до споделеното състояние чрез куката `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Интегриране на API за търсене

Заявките за търсене преминават през API слоя към бекенда. Типичният модел:

1. Потребителят въвежда въведените данни за търсене
2. `useDebounceSearch` изчаква 300ms след последното натискане на клавиш
3. Отклонената стойност актуализира `params.search` във филтърната кука
4. React Query открива промяната на параметрите и задейства ново извличане
5. Резултатите се показват с индикатори за зареждане

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Пагинация

Филтърната система включва вградени помощници за пагиниране:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

Компонентът `Paginate` от филтърния модул изобразява контролите на страницата и се синхронизира с контекста на филтъра.

## Контроли за сортиране

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## URL-синхронизирано състояние

Куката `useFilterState` синхронизира стойностите на филтъра с параметрите на URL заявката, позволявайки споделяне на филтрирани изгледи:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

Помощната програма `filter-url-parser.tsx` обработва параметрите на филтъра за анализиране от URL адреса при първоначално зареждане на страницата.

## Залепваща заглавка на филтъра

Куката `useStickyHeader` управлява залепващото поведение на филтърната лента:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Когато потребителят превърти над прага, филтърната лента става лепкава с размазан фон и ефект на сянка.

## Активни филтърни чипове

Компонентът `ActiveFilters` показва текущо приложените филтри като чипове за отхвърляне:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Референтен файл

| Файл | Цел |
|------|---------|
| `components/filters/index.ts` | Износ на варел за филтърния модул |
| `components/filters/context/filter-context.tsx` | FilterProvider и useFilters hook |
| `components/filters/hooks/use-filter-state.ts` | URL-синхронизирано състояние на филтъра |
| `components/filters/hooks/use-sticky-header.ts` | Поведение на лепкава филтърна лента |
| `components/filters/components/categories/` | Потребителски интерфейс на филтъра за категории |
| `components/filters/components/tags/` | Потребителски интерфейс на филтъра за етикети |
| `components/filters/components/controls/` | Контроли за сортиране и оформление |
| `components/filters/components/active-filters/` | Активни филтърни чипове |
| `components/filters/components/pagination/` | Компонент за пагинация |
| `hooks/use-debounced-search.ts` | Отклонено търсене със състояние на зареждане |
| `hooks/use-debounced-value.ts` | Генерична помощна програма за стойност на отскачане |
| `hooks/use-client-item-filters.ts` | Управление на състоянието на филтъра от страна на клиента |
