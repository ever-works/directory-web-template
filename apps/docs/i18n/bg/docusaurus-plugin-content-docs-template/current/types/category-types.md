---
id: category-types
title: Дефиниции на тип категория
sidebar_label: Типове категории
sidebar_position: 3
---

# Дефиниции на тип категория

**Източник:** `lib/types/category.ts`

Категориите се използват за организиране на елементи в логически групи. Шаблонът използва базирана на файлове система, където категориите се съхраняват като структурирани данни и се препращат от елементи.

## Интерфейси

### `CategoryData`

Структурата на данните на основната категория с минимални полета.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` - Уникален идентификатор за категорията (обикновено охлюв като `"developer-tools"`)
- `name` - Екранно име, разбираемо от човека (напр. `"Developer Tools"`)

### `CategoryWithCount`

Разширени данни за категория, които включват брой елементи и активно състояние, използвани в таблата за управление на администратора и списъците с категории.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Брой елементи, присвоени на тази категория
- `isInactive` - Дали категорията съществува в конфигурацията, но няма присвоени елементи

### `CreateCategoryRequest`

Полезен товар за създаване на нова категория.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Полезен товар за актуализиране на съществуваща категория. Разширява `Partial<CreateCategoryRequest>`, така че трябва да се предоставят само полетата, които се променят, но `id` винаги се изисква.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Страниран отговор за заявки за списък с категории.

```typescript
interface CategoryListResponse {
  categories: CategoryWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `CategoryResponse`

Обвивка на отговора за операции с една категория.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Параметри на заявката за филтриране и страниране на списъци с категории.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` - Когато `true`, включва категории, които имат нула елементи
- `sortBy` - Сортиране по име на категория или ID
- Редът на сортиране по подразбиране е възходящ по име

## Константи

### `CATEGORY_VALIDATION`

Ограничения за проверка на полета за категории:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Примери за използване

### Създаване на категория

```typescript
import type { CreateCategoryRequest } from '@/lib/types/category';
import { CATEGORY_VALIDATION } from '@/lib/types/category';

function validateCategoryName(name: string): boolean {
  return (
    name.length >= CATEGORY_VALIDATION.NAME_MIN_LENGTH &&
    name.length <= CATEGORY_VALIDATION.NAME_MAX_LENGTH
  );
}

const newCategory: CreateCategoryRequest = {
  id: 'developer-tools',
  name: 'Developer Tools',
};
```

### Изброяване на категории с опции

```typescript
import type { CategoryListOptions } from '@/lib/types/category';

const options: CategoryListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

### Показване на категории с преброяване

```typescript
import type { CategoryWithCount } from '@/lib/types/category';

function renderCategoryList(categories: CategoryWithCount[]) {
  return categories
    .filter(cat => !cat.isInactive)
    .map(cat => ({
      label: `${cat.name} (${cat.count ?? 0})`,
      value: cat.id,
    }));
}
```

### Актуализиране на категория

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Свързани типове

- [`ItemData.category`](./item-types.md) препраща към идентификатори на категории (поддържа `string | string[]`)
- [`TagData`](./category-types.md) следва подобен модел за тагове
- [`ItemListOptions.categories`](./item-types.md) приема масив от идентификатори на категории за филтриране
