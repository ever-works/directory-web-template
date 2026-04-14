---
id: category-types
title: Определения типов категорий
sidebar_label: Типы категорий
sidebar_position: 3
---

# Определения типов категорий

**Источник:** `lib/types/category.ts`

Категории используются для организации элементов в логические группы. В шаблоне используется файловая система, в которой категории хранятся в виде структурированных данных и на них ссылаются элементы.

## Интерфейсы

### `CategoryData`

Базовая структура данных категории с минимальным количеством полей.

```typescript
interface CategoryData {
  id: string;
  name: string;
}
```

- `id` — уникальный идентификатор категории (обычно это фрагмент типа `"developer-tools"`).
- `name` — отображаемое имя, читаемое человеком (например, `"Developer Tools"`)

### `CategoryWithCount`

Расширенные данные о категориях, включающие количество элементов и активное состояние, используемые в информационных панелях администратора и списках категорий.

```typescript
interface CategoryWithCount extends CategoryData {
  count?: number;
  isInactive?: boolean;
}
```

- `count` - Количество элементов, отнесенных к этой категории.
- `isInactive` - существует ли категория в конфигурации, но не имеет назначенных элементов.

### `CreateCategoryRequest`

Полезная нагрузка для создания новой категории.

```typescript
interface CreateCategoryRequest {
  id: string;
  name: string;
}
```

### `UpdateCategoryRequest`

Полезная нагрузка для обновления существующей категории. Расширяет `Partial<CreateCategoryRequest>`, поэтому необходимо указывать только изменяемые поля, но `id` требуется всегда.

```typescript
interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  id: string;
}
```

### `CategoryListResponse`

Разбитый на страницы ответ на запросы списка категорий.

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

Конверт ответа для операций с одной категорией.

```typescript
interface CategoryResponse {
  success: boolean;
  category?: CategoryData;
  error?: string;
}
```

### `CategoryListOptions`

Параметры запроса для фильтрации и разбиения на страницы списков категорий.

```typescript
interface CategoryListOptions {
  includeInactive?: boolean;
  sortBy?: 'name' | 'id';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
```

- `includeInactive` — если `true` включает категории, в которых нет элементов.
- `sortBy` — сортировка по названию категории или идентификатору.
- Порядок сортировки по умолчанию — по возрастанию по имени.

## Константы

### `CATEGORY_VALIDATION`

Ограничения проверки для полей категорий:

```typescript
const CATEGORY_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

## Примеры использования

### Создание категории

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

### Список категорий с опциями

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

### Отображение категорий с количеством

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

### Обновление категории

```typescript
import type { UpdateCategoryRequest } from '@/lib/types/category';

const update: UpdateCategoryRequest = {
  id: 'developer-tools',
  name: 'Dev Tools & Utilities',
};
```

## Связанные типы

- [`ItemData.category`](./item-types.md) ссылается на идентификаторы категорий (поддерживает `string | string[]`)
- [`TagData`](./category-types.md) использует аналогичный шаблон для тегов
- [`ItemListOptions.categories`](./item-types.md) принимает массив идентификаторов категорий для фильтрации
