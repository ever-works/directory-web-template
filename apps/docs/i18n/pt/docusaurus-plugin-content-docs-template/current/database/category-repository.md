---
id: category-repository
title: Repositório de Categoria
sidebar_label: Repositório de Categoria
sidebar_position: 21
---

# Repositório de Categoria

O `CategoryRepository` gerencia o ciclo de vida das categorias de itens. As categorias são armazenadas como dados YAML no repositório de conteúdo apoiado pelo Git e fornecem a taxonomia organizacional primária para itens.

**Arquivo fonte:** `template/lib/repositories/category.repository.ts`

---

## Architecture Overview

```
Admin Category UI
        |
  API Route / Server Action
        |
  CategoryRepository
        |
  CategoryGitService
        |
  GitHub Repository (categories.yml)
```

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## Definição de classe

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Dependências

|Importar|Objetivo|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Tipos de categoria base e enriquecida|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|DTOs de mutação|
|`CategoryListOptions`|Opções de filtragem, classificação e paginação|
|`CATEGORY_VALIDATION`|Constantes de restrição de validação|
|`createCategoryGitService`|Fábrica para o serviço de armazenamento Git|
|`coreConfig`|Configuração centralizada|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Métodos de consulta

### `findAll(options?): Promise<CategoryWithCount[]>`

Retorna todas as categorias com classificação opcional.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Comportamento:**
- Todas as categorias são tratadas como ativas (o campo `isActive` foi removido)
- A opção `includeInactive` é aceita para compatibilidade com versões anteriores, mas não tem efeito de filtragem
- Aplica classificação por meio do método privado `sortCategories`

**Opções de classificação:**

|`sortBy`|`sortOrder`|Comportamento|
|----------|-------------|----------|
|`'name'` (padrão)|`'asc'` (padrão)|Alfabético de A a Z|
|`'name'`|`'desc'`|Alfabético Z-A|

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated subset of categories.

```ts
async findAllPaginated(options?: CategoryListOptions): Promise<{
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`. Applies all filters and sorting from `findAll` before slicing.

---

### `findById(id): Promise<CategoryData | null>`

Recupera uma única categoria pelo seu ID exclusivo.

```ts
async findById(id: string): Promise<CategoryData | null>
```

---

### `findBySlug(slug): Promise<CategoryData | null>`

Retrieves a category by slug. Currently delegates to `findById` since the category ID serves as the slug.

```ts
async findBySlug(slug: string): Promise<CategoryData | null>
```

---

## Métodos de mutação

### `create(data): Promise<CategoryData>`

Cria uma nova categoria após validação e verificação de nomes duplicados.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Etapas de processamento:**

1. Valida a entrada via `validateCategoryData`
2. Verifica se há nomes duplicados via `checkDuplicateName`
3. Cria através de `gitService.createCategory`

**Regras de validação:**
- `name` deve estar entre `CATEGORY_VALIDATION.NAME_MIN_LENGTH` e `NAME_MAX_LENGTH` caracteres
- `id` deve ter entre 3 e 50 caracteres
- `id` deve corresponder a `/^[a-z0-9-]+$/` (somente letras minúsculas, números e hífens)

---

### `update(data): Promise<CategoryData>`

Updates an existing category. The `data` object must include the `id` field.

```ts
async update(data: UpdateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates update data (ID required, name constraints if provided)
2. If name is changing, checks for duplicate names excluding the current category
3. Updates through `gitService.updateCategory`

---

### `delete(id): Promise<void>`

Executa uma exclusão irreversível de uma categoria do repositório Git.

```ts
async delete(id: string): Promise<void>
```

Delegados para `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Reordena categorias com base na matriz de IDs fornecida.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Etapas de processamento:**

1. Lê todas as categorias atuais
2. Reordena-os para corresponder à sequência de ID fornecida
3. Acrescenta quaisquer categorias não incluídas na lista de reordenamento
4. Grava a lista reordenada de volta via `gitService.writeCategories`

---

## Private Helper Methods

### `validateCategoryData(data: CreateCategoryRequest): void`

Validates creation data:
- Name length within `CATEGORY_VALIDATION` bounds
- ID between 3 and 50 characters
- ID matches lowercase alphanumeric with hyphens pattern

### `validateUpdateData(data: UpdateCategoryRequest): void`

Validates update data:
- ID is required
- Name constraints enforced if name is provided

### `checkDuplicateName(name, excludeId?): Promise<void>`

Performs a case-insensitive duplicate check across all existing categories. Throws `Error('Category with name "..." already exists')` if a duplicate is found. Optionally excludes a specific category ID (for updates).

### `sortCategories(categories, options): CategoryData[]`

Sorts categories by the specified field and order. Currently supports sorting by `name` only.

---

## Exportação Singleton

```ts
export const categoryRepository = new CategoryRepository();
```

---

## Usage Example

```ts
import { categoryRepository } from '@/lib/repositories/category.repository';

// List all categories sorted alphabetically
const categories = await categoryRepository.findAll({
  sortBy: 'name',
  sortOrder: 'asc',
});

// Create a new category
const newCat = await categoryRepository.create({
  id: 'developer-tools',
  name: 'Developer Tools',
  description: 'Tools for software developers',
});

// Paginated listing
const page = await categoryRepository.findAllPaginated({
  page: 1,
  limit: 20,
});

// Reorder categories
await categoryRepository.reorder([
  'developer-tools',
  'productivity',
  'design',
]);
```

---

## Arquivos relacionados

|Arquivo|Relacionamento|
|------|-------------|
|`lib/services/category-git.service.ts`|Back-end de armazenamento Git|
|`lib/types/category.ts`|Definições de tipo e constantes de validação|
|`lib/config/config-service.ts`|Configuração para URL e tokens do repositório|
|`lib/repositories/item.repository.ts`|Categorias de referência de itens|
