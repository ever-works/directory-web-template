---
id: repository-patterns
title: "Repository-Muster"
sidebar_label: "Repository-Muster"
sidebar_position: 19
---

# Repository-Muster

Die Vorlage implementiert das Repository-Muster, um eine saubere Datenzugriffsschicht zwischen Geschäftslogik und Datenspeicher bereitzustellen. Repositorys kapseln Abfrageerstellung, Validierung, Paginierung und Prüfprotokollierung, während sie den eigentlichen Speicher an zugrunde liegende Dienste (Git-basiert oder datenbankgestützt) delegieren.

## Architekturübersicht

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

## Quelldateien

|Datei|Zweck|
|------|---------|
|`lib/repositories/item.repository.ts`|Element CRUD mit Git-Speicherung, Filterung, Prüfung|
|`lib/repositories/category.repository.ts`|Kategorieverwaltung mit Git-Speicher|
|`lib/repositories/user.repository.ts`|Benutzeroperationen mit Datenbankspeicher|
|`lib/repositories/tag.repository.ts`|Tag-Verwaltung|
|`lib/repositories/role.repository.ts`|Rollenmanagement|
|`lib/repositories/collection.repository.ts`|Sammlungsverwaltung|
|`lib/repositories/sponsor-ad.repository.ts`|Verwaltung von Sponsor-Anzeigen|
|`lib/repositories/client-item.repository.ts`|Kundenseitige Artikeloperationen|
|`lib/repositories/client-dashboard.repository.ts`|Kunden-Dashboard-Daten|
|`lib/repositories/admin-stats.repository.ts`|Admin-Statistiken|
|`lib/repositories/admin-analytics-optimized.repository.ts`|Optimierte Analyseabfragen|
|`lib/repositories/integration-mapping.repository.ts`|Externe Integrationszuordnungen|
|`lib/repositories/twenty-crm-config.repository.ts`|Zwanzig CRM-Konfiguration|

## Gängige Repository-Methoden

Alle Repositorys folgen einer konsistenten API-Oberfläche:

|Methode|Beschreibung|
|--------|-------------|
|`findAll(options?)`|Rufen Sie alle Datensätze mit optionaler Filterung ab|
|`findAllPaginated(page, limit, options?)`|Paginierter Abruf|
|`findById(id)`|Suchen Sie einen einzelnen Datensatz anhand der ID|
|`findBySlug(slug)`|Suchen Sie einen einzelnen Datensatz nach Slug|
|`create(data)`|Erstellen Sie einen neuen Datensatz mit Validierung|
|`update(id, data)`|Aktualisieren Sie einen vorhandenen Datensatz mit Validierung|
|`delete(id)`|Einen Datensatz endgültig löschen|
|`getStats()`|Erhalten Sie aggregierte Statistiken|

## ItemRepository

Das umfassendste Repository, das alle wichtigen Muster demonstriert.

### Lazy Service-Initialisierung

Der Git-Dienst wird bei der ersten Verwendung verzögert initialisiert:

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

### Filtern

Die Methode `findAll` unterstützt die Filterung nach mehreren Kriterien mit ODER-Logik für Arrays:

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

### Paginierung

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

### Audit-Protokollierung

Alle mutierenden Vorgänge werden in einem Audit-Trail protokolliert (Best-Effort, nicht blockierend):

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

Erfasste Audit-Ereignisse:

|Betrieb|Prüfmethode|Erfasste Daten|
|-----------|-------------|---------------|
|Erstellen|`logCreation`|Neuer Artikel, Benutzer|
|Aktualisieren|`logUpdate`|Vorheriger Status, neuer Status, Benutzer|
|Rezension|`logReview`|Artikel, vorheriger Status, Notizen, Benutzer|
|Löschen|`logDeletion`|Artikel, Benutzer, Soft-/Hard-Flag|
|Wiederherstellen|`logRestoration`|Artikel, Benutzer|

### Batch-Operationen

Die Methode `batchUpdate` optimiert mehrere Updates mit einem einzigen Git-Commit:

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

### Validierung

Repositorys führen vor Speichervorgängen eine Eingabevalidierung durch:

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

### Vorläufiges Löschen und Wiederherstellen

```typescript
async softDelete(id: string): Promise<ItemData> {
  return await gitService.softDeleteItem(id);
}

async restore(id: string): Promise<ItemData> {
  return await gitService.restoreItem(id);
}
```

## CategoryRepository

Demonstriert Singleton-Muster und Duplikatprüfung:

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

## UserRepository

Verwendet datenbankgestützten Speicher über `UserDbService` mit Zod-Validierung:

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

## Fehlerbehandlungsstrategie

Repositorys folgen einem konsistenten Fehlerbehandlungsmuster:

1. Bekannte Geschäftsfehler erneut auslösen (z. B. „E-Mail bereits verwendet“)
2. Unbekannte Fehler protokollieren und mit generischen Nachrichten umschließen
3. Fehler bei der Überwachungsprotokollierung werden abgefangen und gewarnt, ohne dass der Vorgang blockiert wird
