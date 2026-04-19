---
id: repository-patterns
title: "Modelli di deposito"
sidebar_label: "Modelli di deposito"
sidebar_position: 19
---

# Modelli di deposito

Il modello implementa il modello Repository per fornire un livello di accesso ai dati pulito tra la logica aziendale e l'archiviazione dei dati. I repository incapsulano la creazione di query, la convalida, l'impaginazione e la registrazione di controllo delegando l'archiviazione effettiva ai servizi sottostanti (basati su Git o supportati da database).

## Panoramica dell'architettura

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

## File di origine

|Archivio|Scopo|
|------|---------|
|`lib/repositories/item.repository.ts`|Elemento CRUD con archiviazione, filtraggio e controllo Git|
|`lib/repositories/category.repository.ts`|Gestione delle categorie con archiviazione Git|
|`lib/repositories/user.repository.ts`|Operazioni utente con archiviazione nel database|
|`lib/repositories/tag.repository.ts`|Gestione dei tag|
|`lib/repositories/role.repository.ts`|Gestione dei ruoli|
|`lib/repositories/collection.repository.ts`|Gestione della raccolta|
|`lib/repositories/sponsor-ad.repository.ts`|Gestione degli annunci degli sponsor|
|`lib/repositories/client-item.repository.ts`|Operazioni sugli articoli rivolte al cliente|
|`lib/repositories/client-dashboard.repository.ts`|Dati del dashboard del cliente|
|`lib/repositories/admin-stats.repository.ts`|Statistiche amministrative|
|`lib/repositories/admin-analytics-optimized.repository.ts`|Query analitiche ottimizzate|
|`lib/repositories/integration-mapping.repository.ts`|Mappature di integrazione esterna|
|`lib/repositories/twenty-crm-config.repository.ts`|Venti configurazioni CRM|

## Metodi di archiviazione comuni

Tutti i repository seguono una superficie API coerente:

|Metodo|Descrizione|
|--------|-------------|
|`findAll(options?)`|Recupera tutti i record con il filtro opzionale|
|`findAllPaginated(page, limit, options?)`|Recupero impaginato|
|`findById(id)`|Trova un singolo record per ID|
|`findBySlug(slug)`|Trova un singolo record per slug|
|`create(data)`|Crea un nuovo record con convalida|
|`update(id, data)`|Aggiorna un record esistente con la convalida|
|`delete(id)`|Eliminazione definitiva di un record|
|`getStats()`|Ottieni statistiche aggregate|

## ItemRepository

Il repository più completo, che mostra tutti i modelli chiave.

### Inizializzazione del servizio pigro

Il servizio Git viene inizializzato pigramente al primo utilizzo:

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

### Filtraggio

Il metodo `findAll` supporta il filtraggio multicriterio con logica OR per gli array:

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

### Impaginazione

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

### Registrazione di controllo

Tutte le operazioni di modifica vengono registrate in un audit trail (massimo sforzo, non bloccante):

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

Eventi di controllo acquisiti:

|Operazione|Metodo di verifica|Dati catturati|
|-----------|-------------|---------------|
|Crea|`logCreation`|Nuovo elemento, utente|
|Aggiorna|`logUpdate`|Stato precedente, nuovo stato, utente|
|Recensione|`logReview`|Articolo, stato precedente, note, utente|
|Elimina|`logDeletion`|Articolo, utente, flag soft/hard|
|Ripristina|`logRestoration`|Articolo, utente|

### Operazioni batch

Il metodo `batchUpdate` ottimizza più aggiornamenti con un singolo commit Git:

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

### Validazione

I repository eseguono la convalida dell'input prima delle operazioni di archiviazione:

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

### Eliminazione e ripristino graduali

```typescript
async softDelete(id: string): Promise<ItemData> {
  return await gitService.softDeleteItem(id);
}

async restore(id: string): Promise<ItemData> {
  return await gitService.restoreItem(id);
}
```

## CategoriaRepository

Dimostra il modello singleton e il controllo dei duplicati:

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

## Repository utente

Utilizza l'archiviazione supportata da database tramite `UserDbService` con convalida Zod:

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

## Strategia di gestione degli errori

I repository seguono uno schema coerente di gestione degli errori:

1. Riproduci errori aziendali noti (ad esempio "Email già in uso")
2. Registra e racchiudi gli errori sconosciuti con messaggi generici
3. Gli errori di registrazione del controllo vengono rilevati e avvisati, senza mai bloccare l'operazione
