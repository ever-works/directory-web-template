---
id: search-system
title: מערכת חיפוש
sidebar_label: מערכת חיפוש
sidebar_position: 26
---

# מערכת חיפוש

התבנית מיישמת מערכת חיפוש וסינון רב-שכבתית המשלבת מצב מבוסס כתובות אתרים, קלט טקסט מנותק, מסנני קטגוריות ותגים ובקרות מיון. המערכת נועדה לביצועים נתפסים מהירים עם שאילתות מבוטלות ואיפוסים אוטומטיים של עמודים.

## סקירה כללית של אדריכלות

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

## ייצוא מודול סינון

מודול המסננים מספק ייצוא חבית נקי:

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

## חיפוש לא חוזר

הוו `useDebounceSearch` ב- `hooks/use-debounced-search.ts` מספק פונקציונליות של חיפוש עם השהייה:

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

התנהגויות מפתח:
- **עיכוב ברירת מחדל**: ניתוק של 300ms מונע קריאות מוגזמות של API במהלך ההקלדה
- **מניעת כפילויות**: משווה לערך הקודם כדי לדלג על חיפושים מיותרים
- **מצב טעינה**: `isSearching` הוא `true` כאשר הערך שהוצא עדיין לא התייצב או בזמן שההתקשרות חזרה בחיפוש פועלת
- **פונקציית נקה**: מאפס מצב פנימי לניקוי פרוגרמטי

## מסנני פריטי לקוח

הוו `useClientItemFilters` ב- `hooks/use-client-item-filters.ts` מנהל את כל ממדי המסנן:

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

### איפוס דף אוטומטי

כאשר מסננים משתנים, הדף מאופס אוטומטית ל-1 כדי להימנע מהצגת דפי תוצאות ריקים:

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

### זיהוי מסנן פעיל

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## הקשר מסנן

מערכת הסינון משתמשת ב-React Context כדי לשתף מצב סינון בין רכיבים מקוננים עמוקים:

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

רכיבים ניגשים למצב המשותף באמצעות הוו `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## שילוב חיפוש API

שאילתות חיפוש זורמות דרך שכבת ה-API אל הקצה האחורי. הדפוס האופייני:

1. המשתמש מקליד את קלט החיפוש
2. `useDebounceSearch` ממתין 300 שניות לאחר ההקשה האחרונה
3. הערך שהוצא מתעדכן `params.search` בקרס המסנן
4. React Query מזהה את השינוי בפרמטרים ומפעילה אחזור חדש
5. התוצאות מוצגות עם מחווני טעינה

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## עימוד

מערכת הסינון כוללת עוזרי עימוד מובנים:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

הרכיב `Paginate` ממודול הסינון מעבד פקדי עמוד ומסתנכרן עם הקשר המסנן.

## בקרות מיון

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## מצב מסונכרן כתובת URL

ה- `useFilterState` מסנכרן ערכי מסנן עם פרמטרי שאילתת כתובת URL, ומאפשר תצוגות מסוננות שניתן לשתף:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

כלי השירות `filter-url-parser.tsx` מטפל בניתוח פרמטרי מסנן מכתובת האתר בעת טעינת העמוד הראשונית.

## כותרת מסנן דביקה

הוו `useStickyHeader` מנהל את ההתנהגות הדביקה של סרגל הסינון:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

כאשר המשתמש גולל מעבר לסף, סרגל הסינון הופך דביק עם אפקט רקע וצל מטשטש.

## שבבי סינון פעילים

הרכיב `ActiveFilters` מציג את המסננים המוחלים כעת כשבבים הניתנים לביטול:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `components/filters/index.ts` | יצוא חבית עבור מודול הסינון |
| `components/filters/context/filter-context.tsx` | FilterProvider ו-UseFilters Hook |
| `components/filters/hooks/use-filter-state.ts` | מצב מסנן מסונכרן כתובת URL |
| `components/filters/hooks/use-sticky-header.ts` | התנהגות סרגל סינון דביק |
| `components/filters/components/categories/` | ממשק משתמש מסנן קטגוריות |
| `components/filters/components/tags/` | ממשק משתמש מסנן תגים |
| `components/filters/components/controls/` | פקדי מיון ופריסה |
| `components/filters/components/active-filters/` | שבבי סינון פעילים |
| `components/filters/components/pagination/` | רכיב עימוד |
| `hooks/use-debounced-search.ts` | חיפוש לא חוזר עם מצב טעינה |
| `hooks/use-debounced-value.ts` | כלי עזר גנרי ל-Debounce value |
| `hooks/use-client-item-filters.ts` | ניהול מצב מסנן בצד הלקוח |
