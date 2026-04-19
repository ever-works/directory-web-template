---
id: item-types
title: Definições de tipo de item
sidebar_label: Tipos de itens
sidebar_position: 1
---

# Definições de tipo de item

**Fonte:** `lib/types/item.ts`

Os itens são as principais entidades de conteúdo do modelo. Este módulo define as estruturas de dados para criação, leitura, atualização e listagem de itens, juntamente com constantes de validação e tipos de gerenciamento de status.

## Interfaces

### `ItemLocationData`

Dados de localização para itens que podem ser geocodificados. Armazenado em YAML e indexado em `item_location_index` para consultas geográficas rápidas.

```typescript
import type { MapProvider } from './location';

interface ItemLocationData {
  address?: string;       // Full address string for geocoding
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;      // Pre-geocoded latitude
  longitude?: number;     // Pre-geocoded longitude
  service_area?: string;  // e.g., "Nationwide", "New York Metro"
  is_remote?: boolean;    // Whether this item operates remotely
  geocoded_by?: MapProvider; // Which geocoding provider was used
}
```

### `ItemData`

A estrutura de dados do item principal retornada pelas operações de leitura.

```typescript
interface ItemData {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  featured?: boolean;
  icon_url?: string;
  updated_at: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  deleted_at?: string;        // ISO timestamp for soft delete
  action?: 'visit-website' | 'start-survey' | 'buy';
  showSurveys?: boolean;      // Whether to show surveys section
  publisher?: string;         // Publisher name for display
  location?: ItemLocationData;
}
```

**Detalhes principais:**
- `category` suporta uma única string e uma matriz para itens de múltiplas categorias
- `status` usa um fluxo de aprovação de quatro estados: rascunho, pendente, aprovado, rejeitado
- `deleted_at` permite exclusão reversível sem remover dados
- `action` define o tipo de botão CTA na página de detalhes do item

### `CreateItemRequest`

Carga útil de entrada para criar um novo item (endpoint POST).

```typescript
interface CreateItemRequest {
  id: string;
  name: string;
  slug: string;
  description: string;
  source_url: string;
  category: string | string[];
  tags: string[];
  collections?: string[];
  brand?: string;
  featured?: boolean;
  icon_url?: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  submitted_by?: string;
  location?: ItemLocationData;
}
```

### `UpdateItemRequest`

Carga útil de entrada para atualizar um item existente. Estende `Partial<CreateItemRequest>` para que todos os campos, exceto `id`, sejam opcionais.

```typescript
interface UpdateItemRequest extends Partial<CreateItemRequest> {
  id: string;
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  deleted_at?: string; // For soft delete operations
}
```

### `ItemListOptions`

Parâmetros de consulta para filtragem e paginação de listas de itens.

```typescript
interface ItemListOptions {
  status?: 'draft' | 'pending' | 'approved' | 'rejected';
  categories?: string[];     // Multi-category filtering
  tags?: string[];           // Multi-tag filtering
  page?: number;
  limit?: number;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;  // Include soft-deleted items (default: false)
  submittedBy?: string;      // Filter by submitting user
  search?: string;           // Search by name or description
  city?: string;             // Filter by city
  country?: string;          // Filter by country
  includeRemote?: boolean;   // Include remote items in location queries
}
```

### `ItemListResponse`

Resposta paginada para consultas de lista de itens.

```typescript
interface ItemListResponse {
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `ItemResponse`

Envelope de resposta para operações de item único.

```typescript
interface ItemResponse {
  success: boolean;
  item?: ItemData;
  error?: string;
  message?: string;
}
```

### `ReviewRequest`

Carga útil para aprovar ou rejeitar um item durante o processo de revisão.

```typescript
interface ReviewRequest {
  status: 'approved' | 'rejected';
  review_notes?: string;
}
```

## Aliases de tipo

### `SortField`

Campos válidos para classificação de listas de itens:

```typescript
type SortField = 'name' | 'updated_at' | 'status' | 'submitted_at';
```

### `SortOrder`

Direção de classificação:

```typescript
type SortOrder = 'asc' | 'desc';
```

### `ItemStatus`

Um tipo de união derivado de `ITEM_STATUSES`:

```typescript
type ItemStatus = (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];
// Resolves to: 'draft' | 'pending' | 'approved' | 'rejected'
```

## Constantes

### `ITEM_VALIDATION`

Restrições de validação para campos de item:

```typescript
const ITEM_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 500,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
} as const;
```

### `ITEM_STATUSES`

Valores de status canônicos para o fluxo de trabalho de aprovação de item:

```typescript
const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
```

### `ITEM_STATUS_LABELS`

Rótulos legíveis por humanos para cada status:

```typescript
const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;
```

### `ITEM_STATUS_COLORS`

Mapeamentos de cores da IU para cada status:

```typescript
const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Exemplos de uso

### Criando um item

```typescript
import type { CreateItemRequest } from '@/lib/types/item';
import { ITEM_VALIDATION } from '@/lib/types/item';

function validateItemName(name: string): boolean {
  return (
    name.length >= ITEM_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= ITEM_VALIDATION.NAME_MAX_LENGTH
  );
}

const newItem: CreateItemRequest = {
  id: 'unique-id-123',
  name: 'My Tool',
  slug: 'my-tool',
  description: 'A description of my tool that is at least 10 characters.',
  source_url: 'https://example.com',
  category: ['productivity', 'developer-tools'],
  tags: ['open-source', 'free'],
  status: 'pending',
};
```

### Filtrando itens

```typescript
import type { ItemListOptions } from '@/lib/types/item';

const options: ItemListOptions = {
  status: 'approved',
  categories: ['productivity'],
  tags: ['open-source'],
  page: 1,
  limit: 20,
  sortBy: 'updated_at',
  sortOrder: 'desc',
  includeRemote: true,
};
```

### Renderizando emblemas de status

```typescript
import { ITEM_STATUS_LABELS, ITEM_STATUS_COLORS } from '@/lib/types/item';
import type { ItemStatus } from '@/lib/types/item';

function getStatusBadge(status: ItemStatus) {
  return {
    label: ITEM_STATUS_LABELS[status],
    color: ITEM_STATUS_COLORS[status],
  };
}

// getStatusBadge('pending')
// => { label: 'Pending Review', color: 'yellow' }
```

## Tipos Relacionados

- [`ItemLocationData`](./location-types.md) faz referência a `MapProvider` do módulo de localização
- [`ClientSubmissionData`](./item-types.md) em `client-item.ts` estende `ItemData` com métricas de engajamento
- [`CategoryData`](./category-types.md) define os valores de categoria referenciados em `ItemData.category`
- [`TagData`](./category-types.md) define os valores da tag referenciados em `ItemData.tags`
