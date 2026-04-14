---
id: repository-patterns
title: "Padrões de repositório"
sidebar_label: "Padrões de repositório"
sidebar_position: 19
---

# Padrões de repositório

O modelo implementa o padrão Repositório para fornecer uma camada limpa de acesso a dados entre a lógica de negócios e o armazenamento de dados. Os repositórios encapsulam a criação de consultas, a validação, a paginação e o registro de auditoria, ao mesmo tempo que delegam o armazenamento real aos serviços subjacentes (baseados em Git ou em banco de dados).

## Visão geral da arquitetura

```mermaid
graph TD
    A[API Route / Service] --> B[Repository]
    B --> C{Storage Backend}
    C -->|Git-based| D[ItemGitService]
    C -->|Git-based| E[CategoryGitService]
    C -->|Database| F[UserDbService]
    B --> G[Validation]
    B --> H[Audit Logging]
    B --> I[Pagination]
    D --> J[.content/ Directory]
    F --> K[Database via Drizzle]
```

## Arquivos de origem

|Arquivo|Objetivo|
|------|---------|
|`lib/repositories/item.repository.ts`|Item CRUD com armazenamento Git, filtragem, auditoria|
|`lib/repositories/category.repository.ts`|Gerenciamento de categorias com armazenamento Git|
|`lib/repositories/user.repository.ts`|Operações do usuário com armazenamento de banco de dados|
|`lib/repositories/tag.repository.ts`|Gerenciamento de tags|
|`lib/repositories/role.repository.ts`|Gerenciamento de funções|
|`lib/repositories/collection.repository.ts`|Gerenciamento de coleção|
|`lib/repositories/sponsor-ad.repository.ts`|Gerenciamento de anúncios do patrocinador|
|`lib/repositories/client-item.repository.ts`|Operações de itens voltadas para o cliente|
|`lib/repositories/client-dashboard.repository.ts`|Dados do painel do cliente|
|`lib/repositories/admin-stats.repository.ts`|Estatísticas de administração|
|`lib/repositories/admin-analytics-optimized.repository.ts`|Consultas analíticas otimizadas|
|`lib/repositories/integration-mapping.repository.ts`|Mapeamentos de integração externa|
|`lib/repositories/twenty-crm-config.repository.ts`|Configuração de vinte CRM|

## Métodos comuns de repositório

Todos os repositórios seguem uma superfície de API consistente:

|Método|Descrição|
|--------|-------------|
|`findAll(options?)`|Recuperar todos os registros com filtragem opcional|
|`findAllPaginated(page, limit, options?)`|Recuperação paginada|
|`findById(id)`|Encontre um único registro por ID|
|`findBySlug(slug)`|Encontre um único registro por slug|
|`create(data)`|Crie um novo registro com validação|
|`update(id, data)`|Atualizar um registro existente com validação|
|`delete(id)`|Exclusão forçada de um registro|
|`getStats()`|Obtenha estatísticas agregadas|

## Repositório de itens

O repositório mais abrangente, demonstrando todos os padrões principais.

### Inicialização de serviço lenta

O serviço Git é inicializado lentamente no primeiro uso:

```typescript
export class ItemRepository {
  private gitService: ItemGitService | null = null;

  private async getGitService(): Promise<ItemGitService> {
    if (!this.gitService) {
      const dataRepo = coreConfig.content.dataRepository;
      const token = coreConfig.content.ghToken;
      // Parse GitHub URL, create service config
      this.gitService = await createItemGitService(config);
    }
    return this.gitService;
  }
}
```

### Filtragem

O método `findAll` suporta filtragem multicritério com lógica OR para matrizes:

```typescript
async findAll(options: ItemListOptions = {}): Promise<ItemData[]> {
  const items = await gitService.readItems(options.includeDeleted ?? false);
  let filteredItems = items;

  if (options.status)
    filteredItems = filteredItems.filter(item => item.status === options.status);

  if (options.categories?.length > 0)
    filteredItems = filteredItems.filter(item => {
      const itemCategories = Array.isArray(item.category) ? item.category : [item.category];
      return options.categories!.some(cat => itemCategories.includes(cat));
    });

  if (options.tags?.length > 0)
    filteredItems = filteredItems.filter(item =>
      options.tags!.some(tag => item.tags.includes(tag))
    );

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filteredItems = filteredItems.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower)
    );
  }

  return filteredItems;
}
```

### Paginação

```typescript
async findAllPaginated(page = 1, limit = 10, options = {}): Promise<{
  items: ItemData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  return await gitService.getItemsPaginated(page, limit, options);
}
```

### Registro de auditoria

Todas as operações mutantes são registradas em uma trilha de auditoria (melhor esforço, sem bloqueio):

```typescript
async create(data: CreateItemRequest, auditUser?: AuditUser): Promise<ItemData> {
  this.validateCreateData(data);
  const item = await gitService.createItem(data);

  try {
    await itemAuditService.logCreation(item, auditUser);
  } catch (err) {
    console.warn('Audit logCreation failed:', err);
  }

  return item;
}
```

Eventos de auditoria capturados:

|Operação|Método de auditoria|Dados capturados|
|-----------|-------------|---------------|
|Criar|`logCreation`|Novo item, usuário|
|Atualizar|`logUpdate`|Estado anterior, novo estado, usuário|
|Revisão|`logReview`|Item, status anterior, notas, usuário|
|Excluir|`logDeletion`|Item, usuário, sinalizador soft/hard|
|Restaurar|`logRestoration`|Item, usuário|

### Operações em lote

O método `batchUpdate` otimiza múltiplas atualizações com um único commit do Git:

```typescript
async batchUpdate(updates: Array<{ id: string; data: UpdateItemRequest }>): Promise<ItemData[]> {
  // Pre-validate ALL updates before writing
  for (const { id, data } of updates) {
    this.validateUpdateData(id, data);
  }

  // Write each update without committing
  for (const { id, data } of updates) {
    await gitService.updateItemWithoutCommit(id, data);
  }

  // Single commit for all changes
  await gitService.commitAndPushBatch(`Batch update ${updates.length} items`);

  // Audit logging after successful commit
  for (const entry of auditEntries) {
    await itemAuditService.logUpdate(entry.previous, entry.updated, auditUser);
  }
}
```

### Validação

Os repositórios realizam validação de entrada antes das operações de armazenamento:

```typescript
private validateCreateData(data: CreateItemRequest): void {
  if (!data.id?.trim())          throw new Error('Item ID is required');
  if (!data.name?.trim())        throw new Error('Item name is required');
  if (!data.slug?.trim())        throw new Error('Item slug is required');
  if (!data.description?.trim()) throw new Error('Item description is required');
  if (!data.source_url?.trim())  throw new Error('Item source URL is required');

  if (!/^[a-z0-9-]+$/.test(data.slug))
    throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');

  try { new URL(data.source_url); }
  catch { throw new Error('Invalid source URL format'); }
}
```

### Exclusão e restauração suaves

```typescript
async softDelete(id: string): Promise<ItemData> {
  return await gitService.softDeleteItem(id);
}

async restore(id: string): Promise<ItemData> {
  return await gitService.restoreItem(id);
}
```

## CategoriaRepositório

Demonstra padrão singleton e verificação de duplicatas:

```typescript
export class CategoryRepository {
  // Duplicate name checking (case-insensitive, excludes self for updates)
  private async checkDuplicateName(name: string, excludeId?: string): Promise<void> {
    const categories = await gitService.readCategories();
    const duplicate = categories.find(cat =>
      cat.name.toLowerCase() === name.toLowerCase() && cat.id !== excludeId
    );
    if (duplicate) throw new Error(`Category with name "${name}" already exists`);
  }

  // Sorting
  private sortCategories(categories, options): CategoryData[] {
    return categories.sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return options.sortOrder === 'desc' ? -comparison : comparison;
    });
  }
}

// Singleton export
export const categoryRepository = new CategoryRepository();
```

## Repositório de usuário

Usa armazenamento baseado em banco de dados via `UserDbService` com validação Zod:

```typescript
export class UserRepository {
  private userDbService: UserDbService;

  async create(data: CreateUserRequest): Promise<AuthUserData> {
    // Zod schema validation
    const validatedData = userValidationSchema
      .pick({ email: true, password: true })
      .parse(data);

    // Uniqueness check
    const exists = await this.userDbService.emailExists(validatedData.email);
    if (exists) throw new Error('Email already in use');

    return await this.userDbService.createUser(validatedData);
  }
}
```

## Estratégia de tratamento de erros

Os repositórios seguem um padrão consistente de tratamento de erros:

1. Relançar erros comerciais conhecidos (por exemplo, "E-mail já em uso")
2. Registrar e encapsular erros desconhecidos com mensagens genéricas
3. As falhas de registro de auditoria são detectadas e avisadas, nunca bloqueando a operação
