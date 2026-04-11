---
id: item-categories
title: Categorias de itens
sidebar_label: Categorias de itens
sidebar_position: 24
---

# Categorias de itens

As categorias fornecem uma maneira hierárquica de organizar itens no diretório. O modelo inclui um sistema completo de gerenciamento de categorias com operações CRUD administrativas, uma barra de navegação de categorias voltada ao público e integração de filtragem.

## Visão geral da arquitetura

```
components/
  items-categories.tsx              -- Public category navigation bar
  categories-grid.tsx               -- Grid layout for category cards
  admin/categories/                 -- Admin CRUD components
  filters/components/categories/    -- Filter integration components

hooks/
  use-admin-categories.ts           -- Admin CRUD hook (React Query)
  use-categories-enabled.ts         -- Feature flag check
  use-categories-exists.ts          -- Data availability check

app/api/admin/categories/           -- API routes for category management
```

## Modelo de dados de categoria

As categorias são representadas com a seguinte interface da camada de conteúdo:

```tsx
interface Category {
  id: string;
  name: string;
  icon_url?: string;
  count?: number;
}
```

A interface administrativa usa um tipo estendido:

```tsx
// lib/types/category.ts
interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryWithCount extends CategoryData {
  itemCount: number;
}
```

## Navegação por categoria pública

O componente `ItemsCategories` em `components/items-categories.tsx` renderiza uma barra de categoria horizontal rolável com comportamento fixo opcional:

```tsx
// components/items-categories.tsx
export function ItemsCategories(props: {
  categories: Category[];
  basePath?: string;
  resetPath?: string;
  enableSticky?: boolean;
  maxVisibleTags?: number;
}) {
  const { categoriesEnabled } = useCategoriesEnabled();
  const [showAllCategories, setShowAllCategories] = useState(false);
  const pathname = usePathname();

  if (!categoriesEnabled) return null;
  if (!props.categories?.length) return null;

  const MAX_VISIBLE = props.maxVisibleTags || 8;
  const hasMore = props.categories.length > MAX_VISIBLE;

  // Render logic...
}
```

### Principais recursos

- **Feature flag gating**: o componente verifica `useCategoriesEnabled()` e retorna `null` se as categorias estiverem desativadas
- **Excesso responsivo**: no modo de linha única, as categorias rolam horizontalmente com estilo de barra de rolagem oculta
- **Expandir/recolher**: um botão de alternância alterna entre rolagem de linha única e layout de várias linhas agrupadas
- **Detecção de estado ativo**: compara o nome do caminho atual com o URL da categoria para destacar o filtro ativo
- **Botão "Todas as categorias"**: sempre renderizado primeiro, atua como um filtro de redefinição com a contagem total
- **Cabeçalho fixo**: quando `enableSticky` é verdadeiro, a barra fica fixa depois de passar de 250px, adicionando um fundo desfocado

### Exemplo de uso

```tsx
<ItemsCategories
  categories={categories}
  basePath="/categories"
  resetPath="/"
  enableSticky={true}
  maxVisibleTags={10}
/>
```

## Gerenciamento de categoria administrativa

### gancho useAdminCategories

O gancho `hooks/use-admin-categories.ts` fornece operações CRUD completas:

```tsx
// hooks/use-admin-categories.ts
export function useAdminCategories(options = {}) {
  const { params = {}, enabled = true } = options;

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEYS.categoriesList(params),
    queryFn: () => fetchCategories(params),
    staleTime: 5 * 60 * 1000,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Category created successfully');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });

  return {
    categories: data?.categories || [],
    total: data?.total || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 1,
    isLoading,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    createCategory: handleCreateCategory,
    updateCategory: handleUpdateCategory,
    deleteCategory: handleDeleteCategory,
    refetch,
    refreshData,
  };
}
```

### Consultar fábrica de chaves

As categorias usam uma hierarquia de chaves de consulta estruturada para invalidação precisa do cache:

```tsx
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

### Gancho de categoria única

```tsx
export function useCategory({ id, enabled = true }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.category(id),
    queryFn: () => fetchCategory(id),
    enabled: enabled && !!id,
  });

  return { category: data || null, isLoading, error, refetch };
}
```

### Gancho Somente Mutação

Para componentes que precisam apenas de operações de gravação sem a consulta de lista:

```tsx
export function useCategoryMutations() {
  return {
    createCategory: handleCreate,
    updateCategory: handleUpdate,
    deleteCategory: handleDelete,
    isSubmitting: anyMutationPending,
  };
}
```

## Opções de lista de categorias

O endpoint da lista de administradores suporta filtragem e paginação:

```tsx
interface CategoryListOptions {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## Terminais de API

| Método | Ponto final | Finalidade |
|--------|----------|--------|
| OBTER | `/api/admin/categories` | Listar categorias com paginação |
| OBTER | `/api/admin/categories/all` | Obtenha todas as categorias sem paginação |
| OBTER | `/api/admin/categories/:id` | Obtenha uma única categoria |
| POSTAR | `/api/admin/categories` | Crie uma nova categoria |
| COLOCAR | `/api/admin/categories/:id` | Atualizar uma categoria existente |
| EXCLUIR | `/api/admin/categories/:id` | Excluir uma categoria de forma reversível |
| EXCLUIR | `/api/admin/categories/:id?hard=true` | Excluir permanentemente uma categoria |

## Integração de filtros

As categorias integram-se ao sistema de filtros através do módulo `filters/` :

```tsx
// components/filters/index.ts
export { Categories } from './components/categories/categories-section';
export { CategoriesList, CategoryItem } from './components/categories';
```

O contexto do filtro rastreia a categoria selecionada e a aplica automaticamente às consultas de itens.

## Sinalizador de recurso

As categorias podem ser ativadas ou desativadas globalmente através do gancho `useCategoriesEnabled` , que lê o sistema de sinalizadores de recursos:

```tsx
const { categoriesEnabled } = useCategoriesEnabled();
```

Quando desabilitados, tanto a barra de navegação quanto os componentes de filtro retornam `null` .

## Referência de arquivo

| Arquivo | Finalidade |
|------|---------|
| `components/items-categories.tsx` | Barra de navegação de categoria pública |
| `components/categories-grid.tsx` | Layout de grade para exibição de categoria |
| `components/admin/categories/` | Componentes administrativos CRUD |
| `components/filters/components/categories/` | Integração de filtros |
| `hooks/use-admin-categories.ts` | Gancho Admin CRUD com React Query |
| `hooks/use-categories-enabled.ts` | Verificação do sinalizador de recurso |
| `hooks/use-categories-exists.ts` | Verificação da disponibilidade de dados |
| `app/api/admin/categories/` | Rotas de API de back-end |
