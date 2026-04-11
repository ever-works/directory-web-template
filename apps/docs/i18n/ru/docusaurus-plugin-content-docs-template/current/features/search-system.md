---
id: search-system
title: Поисковая система
sidebar_label: Поисковая система
sidebar_position: 26
---

# Поисковая система

Шаблон реализует многоуровневую систему поиска и фильтрации, которая сочетает в себе состояние на основе URL-адреса, устранение дребезга ввода текста, фильтры категорий и тегов, а также элементы управления сортировкой. Система спроектирована так, чтобы обеспечивать быструю воспринимаемую производительность, благодаря устранению отказов в запросах и автоматическому сбросу страниц.

## Обзор архитектуры

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

## Экспорт модуля фильтра

Модуль фильтров обеспечивает чистый экспорт стволов:

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

## Исправлен поиск

Перехватчик `useDebounceSearch` в `hooks/use-debounced-search.ts` обеспечивает функцию поиска с задержкой:

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

Ключевые модели поведения:
- **Задержка по умолчанию**: 300 мс предотвращает чрезмерные вызовы API во время набора текста.
- **Предотвращение дублирования**: сравнивается с предыдущим значением, чтобы пропустить повторяющиеся поиски.
- **Состояние загрузки**: `isSearching` равно `true` , пока значение устранения дребезга еще не установилось ИЛИ пока выполняется обратный вызов поиска.
- **Функция очистки**: сбрасывает внутреннее состояние для программного сброса.

## Фильтры элементов клиента

Крючок `useClientItemFilters` в `hooks/use-client-item-filters.ts` управляет всеми измерениями фильтра:

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

### Автоматический сброс страницы

При изменении фильтров страница автоматически сбрасывается на 1, чтобы не показывать пустые страницы результатов:

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

### Обнаружение активного фильтра

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Контекст фильтра

Система фильтров использует контекст React для совместного использования состояния фильтра между глубоко вложенными компонентами:

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

Компоненты получают доступ к общему состоянию через хук `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Интеграция API поиска

Поисковые запросы проходят через уровень API на серверную часть. Типичный образец:

1. Пользователь вводит данные в поле поиска.
2. `useDebounceSearch` ждет 300 мс после последнего нажатия клавиши.
3. Значение устранения дребезга обновляется `params.search` в фильтре.
4. React Query обнаруживает изменение параметров и запускает новую выборку.
5. Результаты отображаются с индикаторами загрузки.

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Пагинация

Система фильтров включает в себя встроенные помощники по нумерации страниц:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

Компонент `Paginate` из модуля фильтра отображает элементы управления страницы и синхронизируется с контекстом фильтра.

## Элементы управления сортировкой

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## Состояние URL-синхронизации

Перехватчик `useFilterState` синхронизирует значения фильтра с параметрами URL-запроса, обеспечивая возможность совместного использования отфильтрованных представлений:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

Утилита `filter-url-parser.tsx` обрабатывает параметры фильтра из URL-адреса при начальной загрузке страницы.

## Прикрепленный заголовок фильтра

Хук `useStickyHeader` управляет липким поведением панели фильтров:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Когда пользователь прокручивает пороговое значение, панель фильтров становится липкой с размытым фоном и эффектом тени.

## Чипы активных фильтров

Компонент `ActiveFilters` отображает примененные в данный момент фильтры в виде отклоняемых фишек:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `components/filters/index.ts` | Экспорт стволов для модуля фильтра |
| `components/filters/context/filter-context.tsx` | FilterProvider и крючок useFilters |
| `components/filters/hooks/use-filter-state.ts` | Состояние фильтра с синхронизацией по URL |
| `components/filters/hooks/use-sticky-header.ts` | Поведение липкой панели фильтров |
| `components/filters/components/categories/` | Пользовательский интерфейс фильтра категорий |
| `components/filters/components/tags/` | Интерфейс фильтра тегов |
| `components/filters/components/controls/` | Элементы управления сортировкой и расположением |
| `components/filters/components/active-filters/` | Активные фильтрующие чипы |
| `components/filters/components/pagination/` | Компонент нумерации страниц |
| `hooks/use-debounced-search.ts` | Исправлен поиск с состоянием загрузки |
| `hooks/use-debounced-value.ts` | Универсальная утилита для устранения дребезга |
| `hooks/use-client-item-filters.ts` | Управление состоянием фильтра на стороне клиента |
