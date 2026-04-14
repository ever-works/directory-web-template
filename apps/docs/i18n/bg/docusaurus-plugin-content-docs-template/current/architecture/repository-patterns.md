---
id: repository-patterns
title: "Модели на хранилище"
sidebar_label: "Модели на хранилище"
sidebar_position: 19
---

# Модели на хранилище

Шаблонът прилага модела Repository, за да осигури чист слой за достъп до данни между бизнес логиката и съхранението на данни. Репозиториите капсулират изграждането на заявки, валидирането, пагинирането и регистрирането на одит, като същевременно делегират действително съхранение на базови услуги (базирани на Git или поддържани от база данни).

## Преглед на архитектурата

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

## Изходни файлове

|Файл|Цел|
|------|---------|
|`lib/repositories/item.repository.ts`|Елемент CRUD с Git съхранение, филтриране, одит|
|`lib/repositories/category.repository.ts`|Управление на категории с Git съхранение|
|`lib/repositories/user.repository.ts`|Потребителски операции със съхранение на база данни|
|`lib/repositories/tag.repository.ts`|Управление на тагове|
|`lib/repositories/role.repository.ts`|Управление на ролите|
|`lib/repositories/collection.repository.ts`|Управление на колекцията|
|`lib/repositories/sponsor-ad.repository.ts`|Управление на реклами на спонсори|
|`lib/repositories/client-item.repository.ts`|Операции с артикули, обърнати към клиента|
|`lib/repositories/client-dashboard.repository.ts`|Данни на клиентското табло|
|`lib/repositories/admin-stats.repository.ts`|Административна статистика|
|`lib/repositories/admin-analytics-optimized.repository.ts`|Оптимизирани заявки за анализ|
|`lib/repositories/integration-mapping.repository.ts`|Съпоставяния на външна интеграция|
|`lib/repositories/twenty-crm-config.repository.ts`|Двадесет CRM конфигурация|

## Общи методи за хранилище

Всички хранилища следват последователна API повърхност:

|Метод|Описание|
|--------|-------------|
|`findAll(options?)`|Извличане на всички записи с филтриране по избор|
|`findAllPaginated(page, limit, options?)`|Пагинирано извличане|
|`findById(id)`|Намерете единичен запис по ID|
|`findBySlug(slug)`|Намерете единичен запис по slug|
|`create(data)`|Създайте нов запис с валидиране|
|`update(id, data)`|Актуализирайте съществуващ запис с валидиране|
|`delete(id)`|Трудно изтриване на запис|
|`getStats()`|Вземете обобщена статистика|

## ItemRepository

The most comprehensive repository, demonstrating all key patterns.

### Мързелива инициализация на услугата

The Git service is initialized lazily on first use:

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

### Филтриране

The `findAll` method supports multi-criteria filtering with OR logic for arrays:

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

### Пагинация

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

### Регистриране на одит

All mutating operations log to an audit trail (best-effort, non-blocking):

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

Уловени одитни събития:

|Операция|Метод на одита|Данните са заснети|
|-----------|-------------|---------------|
|Създавайте|`logCreation`|Нов артикул, потребител|
|Актуализация|`logUpdate`|Предишно състояние, ново състояние, потребител|
|Преглед|`logReview`|Елемент, предишен статус, бележки, потребител|
|Изтриване|`logDeletion`|Елемент, потребител, мек/твърд флаг|
|Възстановяване|`logRestoration`|Елемент, потребител|

### Пакетни операции

The `batchUpdate` method optimizes multiple updates with a single Git commit:

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

### Валидиране

Репозиториите извършват проверка на входа преди операции за съхранение:

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

### Плавно изтриване и възстановяване

```typescript
async softDelete(id: string): Promise<ItemData> {
  return await gitService.softDeleteItem(id);
}

async restore(id: string): Promise<ItemData> {
  return await gitService.restoreItem(id);
}
```

## CategoryRepository

Демонстрира сингълтон модел и проверка на дубликат:

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

Използва хранилище, поддържано от база данни чрез `UserDbService` с Zod валидиране:

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

## Стратегия за обработка на грешки

Хранилищата следват последователен модел за обработка на грешки:

1. Повторно извеждане на известни бизнес грешки (напр. „Имейл вече се използва“)
2. Регистрирайте и обвивайте неизвестните грешки с общи съобщения
3. Грешките при регистриране на одит се улавят и предупреждават, като никога не блокират операцията
