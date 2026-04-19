---
id: category-repository
title: Категория Хранилище
sidebar_label: Категория Хранилище
sidebar_position: 21
---

# Категория Хранилище

`CategoryRepository` управлява жизнения цикъл на категории артикули. Категориите се съхраняват като YAML данни в хранилището на съдържание, поддържано от Git, и предоставят основната организационна таксономия за елементите.

**Изходен файл:** `template/lib/repositories/category.repository.ts`

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

## Дефиниция на класа

```ts
export class CategoryRepository {
  private gitService: any = null;
}
```

### Зависимости

|Импортиране|Цел|
|--------|---------|
|`CategoryData`, `CategoryWithCount`|Типове основни и обогатени категории|
|`CreateCategoryRequest`, `UpdateCategoryRequest`|Мутационни DTO|
|`CategoryListOptions`|Опции за филтриране, сортиране и пагиниране|
|`CATEGORY_VALIDATION`|Константи на ограничения за валидиране|
|`createCategoryGitService`|Фабрика за услугата за съхранение Git|
|`coreConfig`|Централизирана конфигурация|

---

## Git Service Initialization

The private `getGitService()` method lazily initializes the Git service by:

1. Reading `coreConfig.content.dataRepository` for the GitHub repository URL
2. Parsing the URL to extract `owner` and `repo`
3. Using `coreConfig.content.ghToken` for authentication
4. Using `coreConfig.content.githubBranch` (default: `"main"`) for the target branch

Throws descriptive errors if configuration is missing or malformed.

---

## Методи за заявка

### `findAll(options?): Promise<CategoryWithCount[]>`

Връща всички категории с незадължително сортиране.

```ts
async findAll(options: CategoryListOptions = {}): Promise<CategoryWithCount[]>
```

**Поведение:**
- Всички категории се третират като активни (полето `isActive` е премахнато)
- Опцията `includeInactive` се приема за обратна съвместимост, но няма ефект на филтриране
- Прилага сортиране чрез личния метод `sortCategories`

**Опции за сортиране:**

|`sortBy`|`sortOrder`|Поведение|
|----------|-------------|----------|
|`'name'` (по подразбиране)|`'asc'` (по подразбиране)|Азбучен ред A-Z|
|`'name'`|`'desc'`|Азбучен Z-A|

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

Извлича една категория по нейния уникален идентификатор.

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

## Методи за мутация

### `create(data): Promise<CategoryData>`

Създава нова категория след валидиране и проверка на дублирани имена.

```ts
async create(data: CreateCategoryRequest): Promise<CategoryData>
```

**Стъпки на обработка:**

1. Потвърждава въвеждането чрез `validateCategoryData`
2. Проверява за дублиращи се имена чрез `checkDuplicateName`
3. Създава чрез `gitService.createCategory`

**Правила за валидиране:**
- `name` трябва да е между `CATEGORY_VALIDATION.NAME_MIN_LENGTH` и `NAME_MAX_LENGTH` знаци
- `id` трябва да бъде между 3 и 50 знака
- `id` трябва да съвпада с `/^[a-z0-9-]+$/` (само малки букви, цифри, тирета)

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

Извършва твърдо изтриване на категория от хранилището на Git.

```ts
async delete(id: string): Promise<void>
```

Делегати на `hardDelete(id)`.

---

### `hardDelete(id): Promise<void>`

Permanently removes a category from the Git repository.

```ts
async hardDelete(id: string): Promise<void>
```

---

### `reorder(categoryIds): Promise<void>`

Пренарежда категориите въз основа на предоставения масив от идентификатори.

```ts
async reorder(categoryIds: string[]): Promise<void>
```

**Стъпки на обработка:**

1. Чете всички текущи категории
2. Пренарежда ги, за да съответстват на предоставената ID последователност
3. Добавя всички категории, които не са включени в списъка за пренареждане
4. Записва пренаредения списък обратно чрез `gitService.writeCategories`

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

## Сингълтън Експорт

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

## Свързани файлове

|Файл|Връзка|
|------|-------------|
|`lib/services/category-git.service.ts`|Бекенд за съхранение на Git|
|`lib/types/category.ts`|Дефиниции на типове и константи за валидиране|
|`lib/config/config-service.ts`|Конфигурация за URL адрес на хранилище и токени|
|`lib/repositories/item.repository.ts`|Референтни категории на артикули|
