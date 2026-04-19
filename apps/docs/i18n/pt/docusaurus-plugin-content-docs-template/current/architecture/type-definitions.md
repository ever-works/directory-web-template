---
id: type-definitions
title: Visão geral do sistema de tipos
sidebar_label: Definições de tipo
sidebar_position: 41
---

# Visão geral do sistema de tipos

O modelo centraliza suas definições de tipo TypeScript em `template/lib/types/`. Este diretório contém interfaces, aliases de tipo, esquemas de validação Zod e DTOs de solicitação/resposta usados ​​em repositórios, serviços e rotas de API.

**Diretório de origem:** `template/lib/types/`

---

## Directory Listing

| File | Purpose |
|------|---------|
| `item.ts` | Item data model, create/update/review requests, list options, status types |
| `user.ts` | Authentication user data, create/update requests, Zod validation schemas, list options |
| `role.ts` | Role data model, create/update requests, list options, role-with-count type |
| `tag.ts` | Tag data model, create/update requests, paginated list response |
| `category.ts` | Category data model with count, create/update requests, validation constants, list options |
| `comment.ts` | Comment data structures |
| `vote.ts` | Vote data structures |
| `client.ts` | Client profile types |
| `client-item.ts` | Client-facing item types |
| `profile.ts` | User profile types |
| `survey.ts` | Survey data structures |
| `location.ts` | Location/geography types |
| `sponsor-ad.ts` | Sponsor and advertisement types |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity model types |
| `twenty-crm-errors.types.ts` | Twenty CRM error handling types |
| `twenty-crm-sync.types.ts` | Twenty CRM synchronization types |

---

## Tipos de domínio principais

### Tipos de itens (`item.ts`)

O sistema de tipos de itens é o mais extenso, cobrindo todo o ciclo de vida de uma listagem de diretório.

**Tipos de chave:**

- **`ItemData`** - o modelo de dados do item principal com campos para `id`, `name`, `slug`, `description`, `source_url`, `status`, `category`, `tags`, `collections`, `submitted_by`, `submitted_at`, `deleted_at` e mais
- **`CreateItemRequest`** -- DTO para criação de item; requer `id`, `name`, `slug`, `description`, `source_url`
- **`UpdateItemRequest`** -- DTO parcial para atualizações de itens; todos os campos opcionais
- **`ReviewRequest`** -- contém `status` (`'approved'` ou `'rejected'`) e opcional `review_notes`
- **`ItemListOptions`** - opções de filtragem e paginação: `status`, `categories`, `tags`, `submittedBy`, `search`, `includeDeleted`, `sortBy`, `sortOrder`

### Tipos de usuário (`user.ts`)

Tipos de usuário em nível de autenticação com esquemas de validação Zod.

**Tipos de chave:**

- **`AuthUserData`** -- representa um registro de usuário autenticado (id, email, criado_em, etc.)
- **`CreateUserRequest`** -- e-mail e senha para criação de usuário
- **`UpdateUserRequest`** -- campos de atualização parcial
- **`UserListOptions`** -- opções de paginação e filtragem
- **`AuthUserListResponse`** - resposta paginada com `users`, `total`, `page`, `limit`, `totalPages`
- **`userValidationSchema`** -- Esquema Zod para validação completa da criação do usuário
- **`updateUserValidationSchema`** -- Esquema Zod para validação parcial de atualização do usuário

### Tipos de função (`role.ts`)

Tipos de dados de função para o sistema RBAC.

**Tipos de chave:**

- **`RoleData`** - registro de função com `id`, `name`, `description`, `permissions`, `isDefault`, `status`, carimbos de data e hora
- **`CreateRoleRequest`** -- campos necessários para criar uma nova função
- **`UpdateRoleRequest`** - atualização parcial da função
- **`RoleListOptions`** -- opções de filtragem incluindo `status`, pesquisa e paginação
- **`RoleWithCount`** -- estende `RoleData` com `userCount` para exibição de administrador

### Tipos de tags (`tag.ts`)

Tipos de dados de etiqueta para o sistema de etiquetagem/etiquetagem.

**Tipos de chave:**

- **`TagData`** - registro de tag com `id`, `name` e metadados opcionais
- **`CreateTagRequest`** -- requer `id` e `name`
- **`UpdateTagRequest`** -- atualização parcial da tag
- **`TagListResponse`** -- lista de tags paginada com `tags`, `total`, `page`, `limit`, `totalPages`

### Tipos de categoria (`category.ts`)

Tipos de dados de categoria para a taxonomia organizacional.

**Tipos de chave:**

- **`CategoryData`** -- registro de categoria com `id`, `name`, `description` e metadados
- **`CategoryWithCount`** -- estende `CategoryData` com uma contagem de itens
- **`CreateCategoryRequest`** -- requer `id`, `name`, opcional `description`
- **`UpdateCategoryRequest`** -- atualização parcial da categoria (requer `id`)
- **`CategoryListOptions`** -- opções de filtragem, classificação e paginação
- **`CATEGORY_VALIDATION`** -- constantes para validação de comprimento de campo (nome min/max, descrição max, restrições de ID)

---

## Integration Types

### Twenty CRM Types

Four files define the type system for the Twenty CRM integration:

| File | Contents |
|------|----------|
| `twenty-crm-config.types.ts` | Configuration types for CRM connection settings |
| `twenty-crm-entities.types.ts` | Entity models mapping to CRM objects |
| `twenty-crm-errors.types.ts` | Error types for CRM API error handling |
| `twenty-crm-sync.types.ts` | Synchronization state and operation types |

---

## Convenções de padrão de tipo

### DTOs de solicitação/resposta

A base de código segue um padrão consistente para objetos de transferência de dados:

- **`Create[Entity]Request`** -- contém todos os campos obrigatórios para criação
- **`Update[Entity]Request`** -- tipo parcial onde a maioria dos campos são opcionais; normalmente requer `id`
- **`[Entity]ListOptions`** -- parâmetros de filtragem, classificação e paginação
- **`[Entity]ListResponse`** - resposta paginada com `items`, `total`, `page`, `limit`, `totalPages`

### Esquemas de validação

Os esquemas Zod são co-localizados com seus tipos correspondentes:

```ts
// In user.ts
export const userValidationSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  // ...
});
```

Os repositórios usam `.parse()` ou `.pick()` nesses esquemas antes de executar mutações.

### Constantes de validação

Para entidades apoiadas por Git (categorias, coleções), as constantes de validação são exportadas como objetos simples:

```ts
export const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  // ...
};
```

Eles são referenciados em métodos de validação de repositório.

---

## Type Relationships

```
ItemData
  ├── references CategoryData (via category field)
  ├── references TagData (via tags field)
  ├── references Collection (via collections field)
  └── referenced by ClientDashboardRepository

AuthUserData
  ├── references RoleData (via role assignments)
  └── referenced by UserRepository

RoleData
  ├── contains Permission[] (from permissions/definitions)
  └── referenced by RoleRepository

CategoryData
  └── referenced by items (category field)

TagData
  └── referenced by items (tags field)
```

---

## Diretrizes de uso

1. **Sempre importe tipos de `@/lib/types/`** em vez de declará-los novamente em componentes ou rotas de API
2. **Use DTOs de solicitação** para validação de entrada do manipulador de API, não para o modelo de dados completo
3. **Use esquemas Zod** quando disponíveis (tipos de usuário) para validação em tempo de execução
4. **Use constantes de validação** (categorias, coleções) para restrições de campo consistentes no front-end e back-end
5. **Estender tipos localmente** somente quando você precisar de tipos derivados específicos de componentes que não pertencem à camada compartilhada

---

## Related Files

| File | Relationship |
|------|-------------|
| `lib/repositories/*.ts` | Consumers of these types for data access |
| `lib/services/*.ts` | Business logic that transforms between these types |
| `lib/permissions/definitions.ts` | Permission type definitions (separate from this directory) |
| `lib/guards/plan-features.guard.ts` | Feature type definitions (in guards, not types directory) |
| `app/api/**` | API routes that accept request DTOs and return response types |
