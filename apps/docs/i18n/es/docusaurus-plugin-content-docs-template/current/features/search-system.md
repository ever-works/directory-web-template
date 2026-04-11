---
id: search-system
title: Sistema de búsqueda
sidebar_label: Sistema de búsqueda
sidebar_position: 26
---

# Sistema de búsqueda

La plantilla implementa un sistema de búsqueda y filtrado de múltiples capas que combina estado basado en URL, entrada de texto antirrebote, filtros de categorías y etiquetas, y controles de clasificación. El sistema está diseñado para un rendimiento percibido rápidamente con consultas rechazadas y restablecimientos automáticos de página.

## Descripción general de la arquitectura

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

## Exportaciones de módulos de filtro

El módulo de filtros proporciona una exportación de barril limpia:

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

## Búsqueda rechazada

El gancho `useDebounceSearch` en `hooks/use-debounced-search.ts` proporciona la funcionalidad de búsqueda con retraso:

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

Comportamientos clave:
- **Retraso predeterminado**: el rebote de 300 ms evita llamadas API excesivas durante la escritura
- **Prevención de duplicados**: se compara con el valor anterior para omitir búsquedas redundantes
- **Estado de carga**: `isSearching` es `true` mientras el valor antirrebote aún no se ha establecido O mientras se ejecuta la devolución de llamada de búsqueda
- **Función de borrado**: restablece el estado interno para el borrado programático

## Filtros de elementos del cliente

El gancho `useClientItemFilters` en `hooks/use-client-item-filters.ts` gestiona todas las dimensiones del filtro:

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

### Restablecimiento automático de página

Cuando los filtros cambian, la página se restablece automáticamente a 1 para evitar mostrar páginas de resultados vacías:

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

### Detección de filtro activo

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Filtrar contexto

El sistema de filtrado utiliza un contexto de React para compartir el estado del filtro entre componentes profundamente anidados:

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

Los componentes acceden al estado compartido a través del gancho `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Integración de la API de búsqueda

Las consultas de búsqueda fluyen a través de la capa API hasta el backend. El patrón típico:

1. El usuario escribe en la entrada de búsqueda.
2. `useDebounceSearch` espera 300 ms después de la última pulsación de tecla
3. El valor antirrebote se actualiza `params.search` en el gancho del filtro.
4. React Query detecta el cambio de parámetros y activa una nueva búsqueda
5. Los resultados se muestran con indicadores de carga.

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Paginación

El sistema de filtrado incluye ayudas de paginación integradas:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

El componente `Paginate` del módulo de filtro representa controles de página y se sincroniza con el contexto del filtro.

## Ordenar controles

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## Estado sincronizado con URL

El gancho `useFilterState` sincroniza los valores de filtro con los parámetros de consulta de URL, lo que permite vistas filtradas que se pueden compartir:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

La utilidad `filter-url-parser.tsx` maneja el análisis de los parámetros de filtro de la URL en la carga inicial de la página.

## Encabezado de filtro adhesivo

El gancho `useStickyHeader` gestiona el comportamiento pegajoso de la barra de filtro:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Cuando el usuario supera un umbral, la barra de filtro se vuelve pegajosa con un fondo borroso y un efecto de sombra.

## Chips de filtro activo

El componente `ActiveFilters` muestra los filtros aplicados actualmente como chips descartables:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Referencia de archivo

| Archivo | Propósito |
|------|---------|
| `components/filters/index.ts` | Exportaciones de barriles para el módulo de filtrado |
| `components/filters/context/filter-context.tsx` | Proveedor de filtros y gancho de uso de filtros |
| `components/filters/hooks/use-filter-state.ts` | Estado del filtro sincronizado con URL |
| `components/filters/hooks/use-sticky-header.ts` | Comportamiento de la barra de filtro adhesivo |
| `components/filters/components/categories/` | UI de filtro de categoría |
| `components/filters/components/tags/` | Interfaz de usuario de filtro de etiquetas |
| `components/filters/components/controls/` | Controles de clasificación y diseño |
| `components/filters/components/active-filters/` | Chips de filtro activo |
| `components/filters/components/pagination/` | Componente de paginación |
| `hooks/use-debounced-search.ts` | Búsqueda rechazada con estado de carga |
| `hooks/use-debounced-value.ts` | Utilidad genérica del valor de rebote |
| `hooks/use-client-item-filters.ts` | Gestión del estado del filtro del lado del cliente |
