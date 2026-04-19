---
id: item-repository
title: Repositório de itens
sidebar_label: Repositório de itens
sidebar_position: 16
---

# Repositório de itens

A classe `ItemRepository` fornece a camada primária de acesso a dados para gerenciar itens (listagens/envios) no modelo. Ele delega armazenamento a um serviço apoiado por Git e adiciona validação, filtragem, paginação, registro de auditoria e suporte para exclusão reversível.

**Arquivo fonte:** `template/lib/repositories/item.repository.ts`

---

## Architecture Overview

```
API Route / Server Action
        |
  ItemRepository          <-- validation, filtering, audit
        |
  ItemGitService          <-- Git read/write via GitHub API
        |
  GitHub Repository       <-- .content/data/*.yml files
```

The repository lazily initializes an `ItemGitService` instance by parsing the `DATA_REPOSITORY` environment variable for the GitHub owner/repo pair and authenticating with `GH_TOKEN`.

---

## Definição de classe

```ts
export class ItemRepository {
  private gitService: ItemGitService | null = null;
}
```

### Dependências

|Importar|Objetivo|
|--------|---------|
|`ItemData`, `CreateItemRequest`, `UpdateItemRequest`, `ReviewRequest`, `ItemListOptions`|Definições de tipo de `@/lib/types/item`|
|`createItemGitService` / `ItemGitService`|Serviço de armazenamento apoiado por Git|
|`getContentPath`|Resolve diretório de conteúdo local vs. Vercel|
|`coreConfig`|Serviço de configuração centralizado|
|`itemAuditService` / `AuditUser`|Registro de trilha de auditoria|

---

## Private Methods

### `getGitService(): Promise<ItemGitService>`

Lazily creates and caches the Git service singleton. Reads `coreConfig.content.dataRepository` and `coreConfig.content.ghToken`, parses the GitHub URL to extract `owner` and `repo`, and calls `createItemGitService` with a configuration object containing branch, data directory, and items directory paths.

Throws an `Error` if `DATA_REPOSITORY` or `GH_TOKEN` is missing or the URL format is invalid.

---

## Métodos de consulta

### `findAll(options?: ItemListOptions): Promise<ItemData[]>`

Retorna todos os itens que correspondem aos filtros fornecidos. Aplica a seguinte cadeia de filtros em ordem:

1. **status** – correspondência exata em `item.status`
2. **categorias** -- lógica OR; o item deve conter pelo menos uma das categorias solicitadas
3. **tags** -- lógica OR; o item deve conter pelo menos uma das tags solicitadas
4. **submitedBy** - correspondência exata em `item.submitted_by`
5. **pesquisa** - correspondência de substring sem distinção entre maiúsculas e minúsculas em `item.name` ou `item.description`

```ts
async findAll(options: ItemListOptions = {}): Promise<ItemData[]>
```

|Parâmetro|Tipo|Padrão|Descrição|
|-----------|------|---------|-------------|
|`options.status`|`string`| -- |Filtrar por status do item|
|`options.categories`|`string[]`| -- |Filtrar slugs por categoria (OR)|
|`options.tags`|`string[]`| -- |Filtrar por nomes de tags (OR)|
|`options.submittedBy`|`string`| -- |Filtrar por ID de usuário do remetente|
|`options.search`|`string`| -- |Pesquisa de texto livre|
|`options.includeDeleted`|`boolean`|`false`|Incluir itens excluídos de forma reversível|

---

### `findAllPaginated(page?, limit?, options?): Promise<PaginatedResult>`

Server-side paginated query that delegates to `gitService.getItemsPaginated`. Supports the same filter options as `findAll` plus `sortBy` and `sortOrder`.

```ts
async findAllPaginated(
  page: number = 1,
  limit: number = 10,
  options: ItemListOptions = {}
): Promise<{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

---

### `findById(id, includeDeleted?): Promise<ItemData | null>`

Procura um único item por seu ID exclusivo.

```ts
async findById(id: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findBySlug(slug, includeDeleted?): Promise<ItemData | null>`

Looks up a single item by its URL slug.

```ts
async findBySlug(slug: string, includeDeleted: boolean = false): Promise<ItemData | null>
```

---

### `findManyBySlugs(slugs, includeDeleted?): Promise<ItemData[]>`

Pesquisa em lote de vários itens por seus slugs. Retorna um array vazio se a entrada estiver vazia.

```ts
async findManyBySlugs(slugs: string[], includeDeleted: boolean = false): Promise<ItemData[]>
```

---

## Mutation Methods

### `create(data, auditUser?): Promise<ItemData>`

Creates a new item after running `validateCreateData`. Logs the creation via `itemAuditService.logCreation` (best-effort -- failures are warned but not thrown).

```ts
async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

**Validation rules** enforced by `validateCreateData`:
- `id`, `name`, `slug`, `description`, `source_url` are all required and non-empty
- `slug` must match `/^[a-z0-9-]+$/`
- `source_url` must be a valid URL (parsed via `new URL()`)

---

### `update(id, data, auditUser?): Promise<ItemData>`

Atualiza um item existente. Captura o estado anterior para registro de comparação de auditoria.

```ts
async update(id: string, data: UpdateItemRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `batchUpdate(updates, auditUser?): Promise<ItemData[]>`

Applies multiple updates in a single Git commit for atomicity. Pre-validates all entries before writing any. After committing, logs each change to the audit trail.

```ts
async batchUpdate(
  updates: Array<{ id: string; data: UpdateItemRequest }>,
  auditUser?: AuditUser
): Promise<ItemData[]>
```

Uses `gitService.updateItemWithoutCommit` for each item, then calls `gitService.commitAndPushBatch` once.

---

### `review(id, reviewData, auditUser?): Promise<ItemData>`

Revisa um item (aprova ou rejeita). Valida que `reviewData.status` é `"approved"` ou `"rejected"`.

```ts
async review(id: string, reviewData: ReviewRequest, auditUser?: AuditUser): Promise<ItemData>
```

---

### `delete(id, auditUser?): Promise<void>`

Hard-deletes an item permanently from the Git repository.

```ts
async delete(id: string, auditUser?: AuditUser): Promise<void>
```

---

### `softDelete(id, auditUser?): Promise<ItemData>`

Marca um item como excluído (define `deleted_at`) sem remover o arquivo.

```ts
async softDelete(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

### `restore(id, auditUser?): Promise<ItemData>`

Restores a previously soft-deleted item by clearing the `deleted_at` timestamp.

```ts
async restore(id: string, auditUser?: AuditUser): Promise<ItemData>
```

---

## Métodos utilitários

### `checkDuplicateId(id): Promise<boolean>`

Retorna `true` se algum item (incluindo excluído) compartilhar o ID fornecido.

### `checkDuplicateSlug(slug): Promise<boolean>`

Retorna `true` se algum item (incluindo excluído) compartilhar o slug fornecido.

### `getStats(options?): Promise<StatsObject>`

Retorna contagens de status filtradas pelas restrições opcionais `submittedBy`, `search`, `categories` e `tags`.

```ts
async getStats(options?: {
  submittedBy?: string;
  search?: string;
  categories?: string[];
  tags?: string[];
}): Promise<{
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  deleted: number;
}>
```

Itens com carimbo de data/hora `deleted_at` são contados separadamente dos itens ativos.

---

## Audit Trail Integration

Every mutation method accepts an optional `AuditUser` parameter. When provided, the repository logs the action via `itemAuditService`:

| Method | Audit Call |
|--------|-----------|
| `create` | `logCreation(item, auditUser)` |
| `update` | `logUpdate(previousItem, updatedItem, auditUser)` |
| `batchUpdate` | `logUpdate(...)` for each changed item |
| `review` | `logReview(item, previousStatus, notes, auditUser)` |
| `delete` | `logDeletion(item, auditUser, false)` |
| `softDelete` | `logDeletion(item, auditUser, true)` |
| `restore` | `logRestoration(item, auditUser)` |

All audit calls are wrapped in try/catch and log warnings on failure -- they never cause the parent operation to fail.

---

## Exemplo de uso

```ts
import { ItemRepository } from '@/lib/repositories/item.repository';

const repo = new ItemRepository();

// List approved items in a category
const items = await repo.findAll({
  status: 'approved',
  categories: ['developer-tools'],
});

// Paginated query
const page = await repo.findAllPaginated(1, 20, { search: 'timer' });

// Create with audit
const newItem = await repo.create(
  { id: 'my-tool', name: 'My Tool', slug: 'my-tool', description: '...', source_url: 'https://...' },
  { id: 'user-123', email: 'admin@example.com' }
);
```
