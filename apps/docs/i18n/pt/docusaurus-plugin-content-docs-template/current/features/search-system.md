---
id: search-system
title: Sistema de pesquisa
sidebar_label: Sistema de pesquisa
sidebar_position: 26
---

# Sistema de pesquisa

O modelo implementa um sistema de pesquisa e filtragem em várias camadas que combina estado baseado em URL, entrada de texto rejeitada, filtros de categoria e tag e controles de classificação. O sistema foi projetado para desempenho percebido rapidamente com consultas rejeitadas e redefinições automáticas de página.

## Visão geral da arquitetura

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

## Exportações de módulo de filtro

O módulo de filtros fornece uma exportação limpa:

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

## Pesquisa rejeitada

O gancho `useDebounceSearch` em `hooks/use-debounced-search.ts` fornece funcionalidade de busca com atraso:

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

Comportamentos principais:
- **Atraso padrão**: o debounce de 300 ms evita chamadas excessivas de API durante a digitação
- **Prevenção duplicada**: compara com o valor anterior para ignorar pesquisas redundantes
- **Estado de carregamento**: `isSearching` é `true` enquanto o valor debounce ainda não foi definido OU enquanto o retorno de chamada de pesquisa está em execução
- **Função de limpeza**: redefine o estado interno para limpeza programática

## Filtros de itens do cliente

O gancho `useClientItemFilters` em `hooks/use-client-item-filters.ts` gerencia todas as dimensões do filtro:

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

### Redefinição automática de página

Quando os filtros são alterados, a página é automaticamente redefinida para 1 para evitar a exibição de páginas de resultados vazias:

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

### Detecção de filtro ativo

```tsx
const hasActiveFilters = useMemo(() => {
  return status !== 'all' || debouncedSearch.trim() !== '';
}, [status, debouncedSearch]);
```

## Filtro de contexto

O sistema de filtro usa um Contexto React para compartilhar o estado do filtro entre componentes profundamente aninhados:

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

Os componentes acessam o estado compartilhado através do gancho `useFilters` :

```tsx
const { selectedCategory, selectedTags, searchQuery, sort } = useFilters();
```

## Integração da API de pesquisa

As consultas de pesquisa fluem através da camada API até o back-end. O padrão típico:

1. Tipos de usuário na entrada de pesquisa
2. `useDebounceSearch` espera 300 ms após o último pressionamento de tecla
3. O valor debounce atualiza `params.search` no gancho do filtro
4. React Query detecta a mudança de parâmetros e aciona uma nova busca
5. Os resultados são exibidos com indicadores de carregamento

```tsx
// Example: hooking filters to React Query
const { params } = useClientItemFilters();

const { data, isLoading } = useQuery({
  queryKey: ['items', params],
  queryFn: () => fetchItems(params),
});
```

## Paginação

O sistema de filtro inclui auxiliares de paginação integrados:

```tsx
const {
  page,
  goToPage,
  nextPage,
  prevPage,
} = useClientItemFilters();
```

O componente `Paginate` do módulo de filtro renderiza controles de página e sincroniza com o contexto do filtro.

## Controles de classificação

```tsx
const { sortBy, sortOrder, setSortBy, toggleSortOrder } = useClientItemFilters();

// Available sort fields
type SortBy = 'updated_at' | 'created_at' | 'name' | 'views' | 'votes';
type SortOrder = 'asc' | 'desc';
```

## Estado sincronizado com URL

O gancho `useFilterState` sincroniza valores de filtro com parâmetros de consulta de URL, permitindo visualizações filtradas compartilháveis:

```tsx
export { useFilterState } from './hooks/use-filter-state';
```

O utilitário `filter-url-parser.tsx` lida com a análise dos parâmetros de filtro da URL no carregamento inicial da página.

## Cabeçalho do filtro fixo

O gancho `useStickyHeader` gerencia o comportamento pegajoso da barra de filtro:

```tsx
export { useStickyHeader } from './hooks/use-sticky-header';
```

Quando o usuário ultrapassa um limite, a barra de filtro fica fixa com um fundo desfocado e efeito de sombra.

## Chips de filtro ativo

O componente `ActiveFilters` exibe os filtros atualmente aplicados como chips descartáveis:

```tsx
<ActiveFilters />
// Renders: [Category: Design] [Tag: React] [Search: "dashboard"] [x Clear All]
```

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `components/filters/index.ts` | Exportações de barril para o módulo de filtro |
| `components/filters/context/filter-context.tsx` | FilterProvider e gancho useFilters |
| `components/filters/hooks/use-filter-state.ts` | Estado do filtro sincronizado com URL |
| `components/filters/hooks/use-sticky-header.ts` | Comportamento da barra de filtro pegajosa |
| `components/filters/components/categories/` | UI de filtro de categoria |
| `components/filters/components/tags/` | IU do filtro de tags |
| `components/filters/components/controls/` | Controles de classificação e layout |
| `components/filters/components/active-filters/` | Chips de filtro ativo |
| `components/filters/components/pagination/` | Componente de paginação |
| `hooks/use-debounced-search.ts` | Pesquisa rejeitada com estado de carregamento |
| `hooks/use-debounced-value.ts` | Utilitário genérico de valor de rejeição |
| `hooks/use-client-item-filters.ts` | Gerenciamento de estado de filtro do lado do cliente |
