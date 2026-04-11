---
id: search-system
title: نظام البحث
sidebar_label: نظام البحث
sidebar_position: 26
---

# نظام البحث

ينفذ القالب نظام بحث وتصفية متعدد الطبقات يجمع بين الحالة المستندة إلى عنوان URL وإدخال النص المرتد ومرشحات الفئات والعلامات وعناصر التحكم في الفرز. تم تصميم النظام لتحقيق الأداء السريع من خلال الاستعلامات المرتدة وإعادة تعيين الصفحات تلقائيًا.

## نظرة عامة على الهندسة المعمارية

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

## صادرات وحدة التصفية

توفر وحدة المرشحات تصديرًا نظيفًا للبرميل:

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

## بحث محذوف

يوفر الخطاف 0 عند 1 1 وظيفة البحث مع التأخير:

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

السلوكيات الرئيسية:
- **التأخير الافتراضي**: يؤدي الارتداد بمقدار 300 مللي ثانية إلى منع استدعاءات واجهة برمجة التطبيقات المفرطة أثناء الكتابة
- **منع التكرارات**: تتم مقارنتها بالقيمة السابقة لتخطي عمليات البحث المتكررة
- **حالة التحميل**: `isSearching` هي `true` بينما لم يتم تسوية القيمة المرتدة بعد أو أثناء تشغيل رد اتصال البحث
- **وظيفة المسح**: إعادة تعيين الحالة الداخلية للمسح البرمجي

## مرشحات عنصر العميل

يقوم الخطاف 2 في 3 بإدارة جميع أبعاد المرشح:

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

### إعادة ضبط الصفحة تلقائيًا

عند تغيير المرشحات، تتم إعادة تعيين الصفحة تلقائيًا إلى 1 لتجنب عرض صفحات النتائج الفارغة:

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

### الكشف عن عامل التصفية النشط

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## سياق التصفية

يستخدم نظام التصفية سياق React لمشاركة حالة التصفية عبر المكونات المتداخلة بعمق:

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

تصل المكونات إلى الحالة المشتركة عبر الخطاف `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## تكامل واجهة برمجة تطبيقات البحث

تتدفق استعلامات البحث عبر طبقة API إلى الواجهة الخلفية. النمط النموذجي:

1. أنواع المستخدمين في مدخلات البحث
2. ينتظر 300 مللي ثانية بعد آخر ضغطة على المفتاح
3. يتم تحديث القيمة المرتدة `params.search` في خطاف المرشح
4. يكتشف React Query تغير المعلمات ويطلق عملية جلب جديدة
5. يتم عرض النتائج مع مؤشرات التحميل

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## ترقيم الصفحات

يتضمن نظام التصفية مساعدين مضمنين لترقيم الصفحات:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

يعرض المكون `Paginate` من وحدة التصفية عناصر التحكم في الصفحة ويتزامن مع سياق التصفية.

## ضوابط الفرز

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## حالة مزامنة عنوان URL

يقوم الخطاف 0 بمزامنة قيم التصفية مع معلمات استعلام URL، مما يتيح طرق العرض المصفاة القابلة للمشاركة:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

تقوم الأداة المساعدة 0 بمعالجة تحليل معلمات المرشح من عنوان URL عند التحميل الأولي للصفحة.

## رأس الفلتر اللاصق

يقوم الخطاف 1 بإدارة السلوك اللاصق لشريط المرشح:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

عندما يقوم المستخدم بالتمرير إلى ما بعد العتبة، يصبح شريط التصفية ثابتًا مع خلفية ضبابية وتأثير ظل.

## شرائح التصفية النشطة

يعرض المكون `ActiveFilters` المرشحات المطبقة حاليًا كشرائح قابلة للرفض:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## مرجع الملف

| ملف | الغرض |
|------|---------|
| `components/filters/index.ts` | صادرات البرميل لوحدة التصفية |
| `components/filters/context/filter-context.tsx` | خطاف FilterProvider وuseFilters |
| `components/filters/hooks/use-filter-state.ts` | حالة التصفية المتزامنة مع عنوان URL |
| `components/filters/hooks/use-sticky-header.ts` | سلوك شريط التصفية الثابت |
| 4ـ | واجهة مستخدم مرشح الفئة |
| 5 ــ | واجهة مستخدم مرشح العلامات |
| 6ـ | ضوابط الفرز والتخطيط |
| `components/filters/components/active-filters/` | رقائق التصفية النشطة |
| 8ـ | مكون ترقيم الصفحات |
| `hooks/use-debounced-search.ts` | بحث محظور مع حالة التحميل |
| `hooks/use-debounced-value.ts` | فائدة عامة لقيمة الارتداد |
| `hooks/use-client-item-filters.ts` | إدارة حالة التصفية من جانب العميل |
