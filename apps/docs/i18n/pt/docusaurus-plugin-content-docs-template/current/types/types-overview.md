---
id: types-overview
title: Visão geral do sistema de tipos
sidebar_label: Visão geral
sidebar_position: 0
---

# Visão geral do sistema de tipos

O modelo usa um sistema de tipo TypeScript abrangente localizado em `lib/types/`. Essas definições de tipo servem como fonte única de verdade para estruturas de dados usadas em rotas de API, serviços, repositórios e componentes de UI.

## Digite arquivos

O diretório `lib/types/` contém os seguintes módulos:

|Arquivo|Descrição|
|------|-------------|
|`item.ts`|Dados de itens, solicitações CRUD, opções de lista, constantes de validação e definições de status|
|`user.ts`|Dados do usuário administrador, tipos de autenticação, esquemas de validação Zod e funções auxiliares|
|`profile.ts`|Estrutura pública do perfil do usuário, incluindo links sociais, habilidades, portfólio e envios|
|`category.ts`|Dados de categoria, solicitações CRUD, opções de lista e constantes de validação|
|`comment.ts`|Tipos de comentários inferidos do esquema do banco de dados, incluindo comentários enriquecidos pelo usuário|
|`vote.ts`|Esquema de votação (Zod), tipos de resposta, tipos de erro e estado de votação do lado do cliente|
|`survey.ts`|Tipos de pesquisas e respostas a pesquisas, opções de filtro e enums de status/tipo|
|`location.ts`|Configurações de localização, tipos de consulta geográfica, tipos de provedores de mapas e dados de coordenadas|
|`sponsor-ad.ts`|Tipos de anúncios do patrocinador, incluindo solicitações, respostas, estatísticas e dados do painel|
|`client.ts`|Tipos de perfil de cliente para o portal voltado para o cliente, incluindo painel e estatísticas|
|`client-item.ts`|Tipos de envio de itens do lado do cliente com métricas de engajamento e filtros de status|
|`role.ts`|Tipos de função e permissão para o sistema RBAC|
|`tag.ts`|Dados de tags, solicitações CRUD, opções de lista e constantes de validação|
|`twenty-crm-config.types.ts`|Vinte tipos de configuração de integração de CRM e testes de conexão|
|`twenty-crm-entities.types.ts`|Vinte tipos de entidade CRM para registros de Pessoa e Empresa|
|`twenty-crm-errors.types.ts`|Tipos de erros estruturados, códigos de erro e proteções de tipo para erros de CRM|
|`twenty-crm-sync.types.ts`|Operações de upsert, entradas de cache e tipos relacionados à sincronização|

## Padrões de Arquitetura

### Padrão CRUD consistente

A maioria dos tipos de entidade segue um padrão consistente de interfaces:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Constantes de validação

Cada módulo de entidade exporta um objeto de constantes de validação usando `as const` para segurança de tipo:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Essas constantes são usadas na validação do lado do servidor e na validação de formulário do lado do cliente, garantindo regras consistentes em toda a pilha.

### Respostas sindicais discriminadas

Os tipos de resposta da API usam uniões discriminadas para tratamento de erros com segurança de tipo:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Este padrão é usado por `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` e outros.

### Integração do esquema Zod

Vários módulos usam Zod para validação de tempo de execução junto com tipos TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Isso é usado em `vote.ts` (para o esquema de votação) e `user.ts` (para validação do usuário).

### Tipos estendidos com relacionamentos

Os tipos que incluem dados relacionados usam a palavra-chave `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Convenções de importação

Os tipos são importados usando a palavra-chave `type` para importações somente de tipo:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Isso garante que os tipos sejam apagados em tempo de compilação e não afetem o tamanho do pacote.

## Configuração versus tipos de tempo de execução

O módulo location demonstra um padrão usado para configuração:

- **Tipos de configuração** use `snake_case` para corresponder aos arquivos de configuração YAML
- **Tipos de tempo de execução** usam `camelCase` para uso idiomático do TypeScript
- Uma função de mapeamento converte entre os dois formatos

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Enums e rótulos de status

Os valores de status são definidos como objetos const com rótulos e mapeamentos de cores correspondentes:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Tipos inferidos por banco de dados

Alguns tipos são inferidos diretamente do esquema Drizzle ORM:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Essa abordagem garante que os tipos permaneçam sincronizados com as migrações de banco de dados automaticamente.

## Documentação Relacionada

- [Tipos de item](./item-types.md) - Estruturas de dados de itens principais
- [Tipos de usuário](./user-types.md) - Autenticação de usuário e tipos de perfil
- [Tipos de categoria](./category-types.md) - Tipos de gerenciamento de categoria
- [Tipos de comentários](./comment-types.md) - Tipos de comentários e revisões
- [Tipos de voto](./vote-types.md) - Tipos de sistema de votação
- [Tipos de pesquisa](./survey-types.md) – Tipos de pesquisa e resposta
- [Tipos de localização](./location-types.md) - Geolocalização e tipos de mapas
- [Tipos de anúncios de patrocinador](./sponsor-ad-types.md) - Tipos de patrocínio e publicidade
- [Tipos de CRM](./crm-types.md) – Vinte tipos de integração de CRM
