---
id: collection-types
title: Дефиниции на типа колекция
sidebar_label: Видове колекции
sidebar_position: 15
---

# Дефиниции на типа колекция

**Източник:** `types/collection.ts`

Колекциите са подбрани групи от елементи, организирани по теми. Те позволяват на администраторите да създават ръчно подбрани списъци като „Най-добри избори“, „Нови тази седмица“ или „Най-добри за предприятие“.

## Интерфейси

### `Collection`

Основната структура на данните за събиране.

```typescript
interface Collection {
  id: string;              // Unique identifier (slug-friendly)
  slug: string;            // URL-safe slug
  name: string;            // Display name
  description: string;     // Collection description
  icon_url?: string;       // Optional icon/image URL
  item_count: number;      // Number of items in collection
  items?: string[];        // Array of item IDs assigned to this collection
  isActive: boolean;       // Whether the collection is publicly visible
  created_at?: string;     // ISO 8601 creation timestamp
  updated_at?: string;     // ISO 8601 last update timestamp
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`id`|`string`|Уникален идентификатор, 3-50 знака|
|`slug`|`string`|Безопасна за URL версия на името|
|`name`|`string`|Екранно име, 2-100 знака|
|`description`|`string`|Описание в обикновен текст, максимум 500 знака|
|`icon_url`|`string?`|URL към икона или корично изображение|
|`item_count`|`number`|Изчислен брой присвоени елементи|
|`items`|`string[]?`|ID на артикулите; попълва се само при поискване|
|`isActive`|`boolean`|Контролира публичната видимост|

### `CreateCollectionRequest`

Полезен товар за създаване на нова колекция.

```typescript
interface CreateCollectionRequest {
  id: string;
  name: string;
  slug?: string;         // Auto-generated from name if omitted
  description?: string;
  icon_url?: string;
  isActive?: boolean;    // Defaults to true
}
```

### `UpdateCollectionRequest`

Полезен товар за актуализиране на съществуваща колекция. Всички полета с изключение на `id` не са задължителни.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Полезен товар за присвояване на елементи към колекция.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Параметри на заявка за изброяване на колекции.

```typescript
interface CollectionListOptions {
  includeInactive?: boolean;                          // Default: false
  search?: string;                                     // Filter by name
  sortBy?: 'name' | 'item_count' | 'created_at';     // Default: 'name'
  sortOrder?: 'asc' | 'desc';                         // Default: 'asc'
  page?: number;                                       // Default: 1
  limit?: number;                                      // Default: 20
}
```

## Типове отговори

### `CollectionsResponse`

Връща се при изброяване на няколко колекции.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Връща се при извличане на една колекция с нейните елементи.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Правила за валидиране

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Поле|правило|
|-------|------|
|`id`|3-50 знака, трябва да са уникални|
|`name`|2-100 знака|
|`description`|Максимум 500 знака|

## Пример за използване

```typescript
import type {
  Collection,
  CreateCollectionRequest,
  CollectionListOptions,
} from '@/types/collection';

// Create a collection
const newCollection: CreateCollectionRequest = {
  id: 'top-picks-2025',
  name: 'Top Picks 2025',
  description: 'Our favourite tools this year.',
  isActive: true,
};

// List with filtering
const options: CollectionListOptions = {
  search: 'top',
  sortBy: 'item_count',
  sortOrder: 'desc',
  page: 1,
  limit: 10,
};
```

## Свързани типове

- [Типове елементи](./item-types.md) -- елементи, които принадлежат към колекции
- [Типове етикети](./tag-types.md) -- етикети като алтернативен организационен модел
