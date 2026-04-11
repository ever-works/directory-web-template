---
id: search-system
title: 搜寻系统
sidebar_label: 搜寻系统
sidebar_position: 26
---

# 搜索系统

该模板实现了一个多层搜索和过滤系统，该系统结合了基于 URL 的状态、去抖文本输入、类别和标签过滤器以及排序控件。该系统旨在通过去抖动查询和自动页面重置来实现快速感知性能。

## 架构概述

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

## 过滤器模块导出

过滤器模块提供干净的桶导出：

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

## 去抖搜索

1处的0挂钩提供延迟搜索功能：

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

关键行为：
- **默认延迟**：300ms 去抖可防止打字期间过多的 API 调用
- **重复预防**：与之前的值进行比较以跳过冗余搜索
- **加载状态**：当去抖值尚未稳定或当搜索回调运行时，0为1
- **清除功能**：重置内部状态以进行编程清除

## 客户端项目过滤器

3处的2挂钩可管理所有过滤器尺寸：

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

### 自动页面重置

当过滤器更改时，页面会自动重置为 1 以避免显示空结果页面：

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

### 有源滤波器检测

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## 过滤上下文

过滤器系统使用 React Context 在深度嵌套的组件之间共享过滤器状态：

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

组件通过 0 钩子访问共享状态：

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## 搜索 API 集成

搜索查询通过 API 层流向后端。典型模式：

1. 用户在搜索输入中输入内容
2. 0 在最后一次击键后等待 300ms
3. 去抖值更新过滤器挂钩中的1
4. React Query 检测到参数变化并触发新的 fetch
5. 结果以加载指示器显示

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## 分页

过滤系统包括内置的分页助手：

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

过滤器模块中的0组件呈现页面控件并与过滤器上下文同步。

## 排序控件

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## URL 同步状态

0 挂钩将过滤器值与 URL 查询参数同步，从而实现可共享的过滤视图：

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

0 实用程序在初始页面加载时处理从 URL 解析过滤器参数。

## 粘性过滤器标头

1 钩子管理过滤器栏的粘性行为：

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

当用户滚动超过阈值时，过滤器栏会变得粘稠，并带有模糊背景和阴影效果。

## 有源滤波器芯片

0 组件将当前应用的过滤器显示为可忽略的碎片：

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## 文件参考

|文件|目的|
|------|---------|
| 0 |桶状出口用于过滤模块|
| 1 | FilterProvider 和 useFilters 挂钩 |
| 2 | URL 同步过滤器状态 |
| 3 |粘性过滤栏行为 |
| 4 |类别过滤器 UI |
| 5 |标签过滤器 UI |
| 6 |排序和布局控件|
| 7 |有源滤波器芯片|
| 8 |分页组件|
| 9 |具有加载状态的去抖搜索 |
| 10 |通用去抖值实用程序 |
| 11 |客户端过滤器状态管理 |
