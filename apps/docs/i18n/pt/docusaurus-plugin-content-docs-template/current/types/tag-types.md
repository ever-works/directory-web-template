---
id: tag-types
title: Definições de tipo de tag
sidebar_label: Tipos de tags
sidebar_position: 20
---

# Definições de tipo de tag

**Fonte:** `lib/types/tag.ts`

As tags fornecem um sistema de etiquetagem simples para itens. Eles são gerenciados por meio da interface administrativa e armazenados no sistema de conteúdo baseado em arquivo.

## Interfaces

### `TagData`

A estrutura de dados da tag base.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Campo|Tipo|Descrição|
|-------|------|-------------|
|`id`|`string`|Identificador estável usado em arquivos YAML de item|
|`name`|`string`|Rótulo legível mostrado na IU, de 2 a 50 caracteres|
|`isActive`|`boolean`|Tags inativas ficam ocultas dos filtros públicos, mas são preservadas nos dados|

### `TagWithCount`

Dados de tags estendidos com estatísticas de uso.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Carga útil para criar uma nova tag.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Carga útil para atualizar uma tag. O `id` não pode ser alterado.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Parâmetros de consulta para listagem de tags.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Tipos de resposta

### `TagListResponse`

Resposta da lista de tags paginada.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

Resultado da operação de tag única.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Regras de validação

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Campo|Regra|
|-------|------|
|`name`|2-50 caracteres|
|`id`|Deve ser exclusivo em todas as tags|

## Tags no sistema de conteúdo

As tags são referenciadas por ID nos arquivos YAML do item:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

O repositório de tags lê as definições de tags do repositório de conteúdo e as fornece à UI administrativa e aos componentes de filtro.

## Integração de filtros

As tags integram-se ao sistema de filtro do lado do cliente por meio destes componentes:

- `components/filters/components/tags/` -- IU do filtro de tags
- `components/filters/hooks/use-tag-visibility.ts` - controla quais tags aparecem
- `components/filters/utils/tag-utils.ts` -- funções auxiliares para filtragem de tags

## Exemplo de uso

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## Tipos Relacionados

- [Tipos de coleção](./collection-types.md) - coleções como um modelo de agrupamento alternativo
- [Tipos de item](./item-types.md) – itens que fazem referência a tags
- [Tipos de permissão](./permission-types.md) -- `tags:read`, `tags:create`, etc.
