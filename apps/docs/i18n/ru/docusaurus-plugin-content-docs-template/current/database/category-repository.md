---
id: category-repository
title: Репозиторий категорий
sidebar_label: Репозиторий категорий
sidebar_position: 21
---

# Репозиторий категорий

`CategoryRepository` управляет жизненным циклом категорий элементов. Категории хранятся в виде данных YAML в репозитории контента на базе Git и предоставляют основную организационную таксономию для элементов.

**Исходный файл:** `template/lib/repositories/category.repository.ts`

---

## Architecture Overview

```
Admin Category UI
        |
  API Route / Server Action
        |
  CategoryRepository
        |
  CategoryGitService
        |
  GitHub Repository (categories.yml)
```

> **Note:** This file uses the `'server-only'` import guard to prevent accidental client-side usage.

---

## Определение класса

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Зависимости

|Импорт|Цель|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Базовые и расширенные типы категорий|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|DTO мутаций|
|`CategoryListOptions`|Параметры фильтрации, сортировки и нумерации страниц|
|`CATEGORY_VALIDATION`|Константы ограничения проверки|
|`createCategoryGitService`|Фабрика для службы хранения Git|
|`coreConfig`|Централизованная конфигурация|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Методы запроса

### `findAll(options?): Promise<CategoryWithCount[]>`

Возвращает все категории с дополнительной сортировкой.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Поведение:**
- Все категории считаются активными (поле `isActive` удалено)
- Опция `includeInactive` принята для обратной совместимости, но не имеет эффекта фильтрации.
- Применяет сортировку с помощью частного метода `sortCategories`.

**Параметры сортировки:**

|`sortBy`|`sortOrder`|Поведение|
|----------|-------------|----------|
|`'name'` (по умолчанию)|`'asc'` (по умолчанию)|Алфавитный алфавит от А до Я|
|`'name'`|`'desc'`|Алфавитный Я-А|

---

### `findAllPaginated(options?): Promise<PaginatedResult>`

Returns a paginated subset of categories.

```ts
async findAllPaginated(options?: CategoryListOptions): Promise<{
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>
```

Defaults: `page = 1`, `limit = 10`. Applies all filters and sorting from `findAll` before slicing.

---

### `findById(id): Promise<CategoryData | null>`

Извлекает одну категорию по ее уникальному идентификатору.

```ts
async findById(id: string): Promise<CategoryData | null>
```

---

### `findBySlug(slug): Promise<CategoryData | null>`

Retrieves a category by slug. Currently delegates to `findById` since the category ID serves as the slug.

```ts
async findBySlug(slug: string): Promise<CategoryData | null>
```

---

## Методы мутации

### `create(data): Promise<CategoryData>`

Создает новую категорию после проверки и проверки повторяющихся имен.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Этапы обработки:**

1. Проверяет ввод через `validateCategoryData`
2. Проверяет наличие повторяющихся имен через `checkDuplicateName`
3. Создает через `gitService.createCategory`

**Правила проверки:**
- `name` должен находиться между символами `CATEGORY_VALIDATION.NAME_MIN_LENGTH` и `NAME_MAX_LENGTH`.
- `id` должно содержать от 3 до 50 символов.
- `id` должно соответствовать `/^[a-z0-9-]+$/` (только строчные буквы, цифры и дефисы)

---

### `update(data): Promise<CategoryData>`

Updates an existing category. The `data` object must include the `id` field.

```ts
async update(data: UpdateCategoryRequest): Promise<CategoryData>
```

**Processing steps:**

1. Validates update data (ID required, name constraints if provided)
2. If name is changing, checks for duplicate names excluding the current category
3. Updates through `gitService.updateCategory`

---

### `delete(id): Promise<void>`

Выполняет принудительное удаление категории из репозитория Git.

```ts
async delete(id: string): Promise<void>
```

Делегаты `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Изменяет порядок категорий на основе предоставленного массива идентификаторов.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Этапы обработки:**

1. Читает все текущие категории
2. Изменяет их порядок, чтобы они соответствовали предоставленной последовательности идентификаторов.
3. Добавляет любые категории, не включенные в список изменения порядка.
4. Записывает переупорядоченный список обратно через `gitService.writeCategories`

---

## Private Helper Methods

### `validateCategoryData(data: CreateCategoryRequest): void`

Validates creation data:
- Name length within `CATEGORY_VALIDATION` bounds
- ID between 3 and 50 characters
- ID matches lowercase alphanumeric with hyphens pattern

### `validateUpdateData(data: UpdateCategoryRequest): void`

Validates update data:
- ID is required
- Name constraints enforced if name is provided

### `checkDuplicateName(name, excludeId?): Promise<void>`

Performs a case-insensitive duplicate check across all existing categories. Throws `Error('Category with name "..." already exists')` if a duplicate is found. Optionally excludes a specific category ID (for updates).

### `sortCategories(categories, options): CategoryData[]`

Sorts categories by the specified field and order. Currently supports sorting by `name` only.

---

## Синглтон Экспорт

```ts
export const categoryRepository = new CategoryRepository();
```

---

## Usage Example

```ts
import { categoryRepository } from '@/lib/repositories/category.repository';

// List all categories sorted alphabetically
const categories = await categoryRepository.findAll({
  sortBy: 'name',
  sortOrder: 'asc',
});

// Create a new category
const newCat = await categoryRepository.create({
  id: 'developer-tools',
  name: 'Developer Tools',
  description: 'Tools for software developers',
});

// Paginated listing
const page = await categoryRepository.findAllPaginated({
  page: 1,
  limit: 20,
});

// Reorder categories
await categoryRepository.reorder([
  'developer-tools',
  'productivity',
  'design',
]);
```

---

## Связанные файлы

|Файл|Отношения|
|------|-------------|
|`lib/services/category-git.service.ts`|Серверное хранилище Git|
|`lib/types/category.ts`|Определения типов и константы проверки|
|`lib/config/config-service.ts`|Конфигурация URL-адреса репозитория и токенов|
|`lib/repositories/item.repository.ts`|Категории ссылок на товары|
