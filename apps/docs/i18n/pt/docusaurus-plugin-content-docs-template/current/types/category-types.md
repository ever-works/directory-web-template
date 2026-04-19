---
id: category-types
title: Definições de tipo de categoria
sidebar_label: Tipos de categoria
sidebar_position: 3
---

# Definições de tipo de categoria

**Fonte:** `lib/types/category.ts`

Categorias são usadas para organizar itens em grupos lógicos. O modelo usa um sistema baseado em arquivos onde as categorias são armazenadas como dados estruturados e referenciadas por itens.

## Interfaces

### `CategoryData`

A estrutura de dados da categoria principal com campos mínimos.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - Identificador exclusivo da categoria (normalmente um slug como `"developer-tools"`)
- `name` - Nome de exibição legível por humanos (por exemplo, `"Developer Tools"`)

### `CategoryWithCount`

Dados de categoria estendidos que incluem contagem de itens e estado ativo, usados em painéis de administração e listagens de categorias.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Número de itens atribuídos a esta categoria
- `isInactive` - Se a categoria existe na configuração, mas não possui itens atribuídos

### `CreateCategoryRequest`

Carga útil para criar uma nova categoria.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Carga útil para atualizar uma categoria existente. Estende `Partial<CreateCategoryRequest>` para que apenas os campos que estão sendo alterados precisem ser fornecidos, mas `id` é sempre obrigatório.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Resposta paginada para consultas de lista de categorias.

```typescript
interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `CategoryResponse`

Envelope de resposta para operações de categoria única.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Parâmetros de consulta para filtragem e paginação de listas de categorias.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - Quando `true`, inclui categorias que possuem zero itens
- `sortBy` - Classifique por nome ou ID da categoria
- A ordem de classificação padrão é crescente por nome

## Constantes

### `CATEGORY_VALIDATION`

Restrições de validação para campos de categoria:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Exemplos de uso

### Criando uma categoria

```typescript
import type { CreateCategoryRequest } from '@/lib/types/category';
import { CATEGORY_VALIDATION } from '@/lib/types/category';

function validateCategoryName(name: string): boolean {
  return (
    name.length >= CATEGORY_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= CATEGORY_VALIDATION.NAME_MAX_LENGTH
  );
}

const newCategory: CreateCategoryRequest = {
  id: 'developer-tools',
  name: 'Developer Tools',
};
```

### Listando categorias com opções

```typescript
import type { CategoryListOptions } from '@/lib/types/category';

const options: CategoryListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

### Exibindo categorias com contagens

```typescript
import type { CategoryWithCount } from '@/lib/types/category';

function renderCategoryList(categories: CategoryWithCount[]) {
  return categories
    .filter(cat => !cat.isInactive)
    .map(cat => ({
      label: `${cat.name} (${cat.count ?? 0})`,
      value: cat.id,
    }));
}
```

### Atualizando uma categoria

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Tipos Relacionados

- [`ItemData.category`](./item-types.md) faz referência a IDs de categoria (suporta `string | string[]`)
- [`TagData`](./category-types.md) segue um padrão semelhante para tags
- [`ItemListOptions.categories`](./item-types.md) aceita uma matriz de IDs de categoria para filtragem
