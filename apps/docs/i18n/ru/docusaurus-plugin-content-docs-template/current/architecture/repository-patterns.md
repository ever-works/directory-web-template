---
id: repository-patterns
title: "Шаблоны репозитория"
sidebar_label: "Шаблоны репозитория"
sidebar_position: 19
---

# Шаблоны репозитория

В шаблоне реализован шаблон репозитория, обеспечивающий чистый уровень доступа к данным между бизнес-логикой и хранилищем данных. Репозитории инкапсулируют построение запросов, проверку, разбиение на страницы и ведение журнала аудита, одновременно делегируя фактическое хранилище базовым службам (на основе Git или на основе базы данных).

## Обзор архитектуры

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

## Исходные файлы

|Файл|Цель|
|------|---------|
|`lib/repositories/item.repository.ts`|Элемент CRUD с хранилищем Git, фильтрацией и аудитом|
|`lib/repositories/category.repository.ts`|Управление категориями с помощью хранилища Git|
|`lib/repositories/user.repository.ts`|Операции пользователя с хранилищем базы данных|
|`lib/repositories/tag.repository.ts`|Управление тегами|
|`lib/repositories/role.repository.ts`|Управление ролями|
|`lib/repositories/collection.repository.ts`|Управление коллекцией|
|`lib/repositories/sponsor-ad.repository.ts`|Управление рекламой спонсоров|
|`lib/repositories/client-item.repository.ts`|Операции с элементами, ориентированными на клиента|
|`lib/repositories/client-dashboard.repository.ts`|Данные личного кабинета клиента|
|`lib/repositories/admin-stats.repository.ts`|Статистика администратора|
|`lib/repositories/admin-analytics-optimized.repository.ts`|Оптимизированные аналитические запросы|
|`lib/repositories/integration-mapping.repository.ts`|Сопоставления внешней интеграции|
|`lib/repositories/twenty-crm-config.repository.ts`|Двадцать конфигураций CRM|

## Общие методы репозитория

Все репозитории имеют единообразную поверхность API:

|Метод|Описание|
|--------|-------------|
|`findAll(options?)`|Получить все записи с дополнительной фильтрацией|
|`findAllPaginated(page, limit, options?)`|Постраничный поиск|
|`findById(id)`|Найти одну запись по идентификатору|
|`findBySlug(slug)`|Найти одну запись по слизню|
|`create(data)`|Создать новую запись с проверкой|
|`update(id, data)`|Обновить существующую запись с помощью проверки|
|`delete(id)`|Жесткое удаление записи|
|`getStats()`|Получить сводную статистику|

## Репозиторий предметов

Самый полный репозиторий, демонстрирующий все ключевые шаблоны.

### Ленивая инициализация сервиса

Служба Git инициализируется лениво при первом использовании:

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

### Фильтрация

Метод `findAll` поддерживает многокритериальную фильтрацию с логикой ИЛИ для массивов:

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

### Журнал аудита

Все операции изменения регистрируются в журнале аудита (максимально возможное, неблокирующее):

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

Зафиксированы события аудита:

|Операция|Метод аудита|Собранные данные|
|-----------|-------------|---------------|
|Создать|`logCreation`|Новый элемент, пользователь|
|Обновить|`logUpdate`|Предыдущее состояние, новое состояние, пользователь|
|Обзор|`logReview`|Элемент, предыдущий статус, примечания, пользователь|
|Удалить|`logDeletion`|Элемент, пользователь, программный/жесткий флаг|
|Восстановить|`logRestoration`|Элемент, пользователь|

### Пакетные операции

Метод `batchUpdate` оптимизирует несколько обновлений с помощью одного коммита Git:

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

### Валидация

Репозитории выполняют проверку ввода перед операциями хранения:

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

### Мягкое удаление и восстановление

```typescript
async softDelete(id: string): Promise<ItemData> {
  return await gitService.softDeleteItem(id);
}

async restore(id: string): Promise<ItemData> {
  return await gitService.restoreItem(id);
}
```

## КатегорияРепозиторий

Демонстрирует шаблон Singleton и проверку дубликатов:

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

## Пользовательский репозиторий

Использует хранилище на основе базы данных через `UserDbService` с проверкой Zod:

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

## Стратегия обработки ошибок

Репозитории следуют единому шаблону обработки ошибок:

1. Повторно выдать известные бизнес-ошибки (например, «Электронная почта уже используется»).
2. Регистрируйте и оборачивайте неизвестные ошибки общими сообщениями.
3. Ошибки ведения журнала аудита обнаруживаются и предупреждаются, никогда не блокируя операцию.
