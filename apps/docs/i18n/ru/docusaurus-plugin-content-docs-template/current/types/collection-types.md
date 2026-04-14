---
id: collection-types
title: Определения типов коллекций
sidebar_label: Типы коллекций
sidebar_position: 15
---

# Определения типов коллекций

**Источник:** `types/collection.ts`

Коллекции — это тщательно подобранные группы предметов, организованные по темам. Они позволяют администраторам создавать тщательно отобранные списки, такие как «Лучшее», «Новое на этой неделе» или «Лучшее для предприятия».

## Интерфейсы

### `Collection`

Основная структура данных коллекции.

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
|`id`|`string`|Уникальный идентификатор, 3-50 символов.|
|`slug`|`string`|URL-безопасная версия имени|
|`name`|`string`|Отображаемое имя, 2–100 символов.|
|`description`|`string`|Описание в виде обычного текста, максимум 500 символов.|
|`icon_url`|`string?`|URL-адрес значка или изображения обложки|
|`item_count`|`number`|Вычисленное количество назначенных элементов|
|`items`|`string[]?`|Идентификаторы предметов; заполняется только по запросу|
|`isActive`|`boolean`|Контролирует общественную видимость|

### `CreateCollectionRequest`

Полезная нагрузка для создания новой коллекции.

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

Полезная нагрузка для обновления существующей коллекции. Все поля, кроме `id`, являются необязательными.

```typescript
interface UpdateCollectionRequest extends Partial<CreateCollectionRequest> {
  id: string;
  item_count?: number;
  items?: string[];
}
```

### `AssignCollectionItemsRequest`

Полезная нагрузка для назначения элементов коллекции.

```typescript
interface AssignCollectionItemsRequest {
  itemIds: string[];  // Array of item IDs to assign
}
```

### `CollectionListOptions`

Параметры запроса для перечисления коллекций.

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

## Типы ответов

### `CollectionsResponse`

Возвращается при перечислении нескольких коллекций.

```typescript
interface CollectionsResponse {
  collections: Collection[];
  total: number;            // Total matching collections
}
```

### `CollectionDetailResponse`

Возвращается при получении одной коллекции с ее элементами.

```typescript
interface CollectionDetailResponse {
  collection: Collection;
  items: any[];             // Item objects matching collection.items
  total: number;            // Total items in collection
}
```

## Правила валидации

```typescript
const COLLECTION_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ID_MIN_LENGTH: 3,
  ID_MAX_LENGTH: 50,
} as const;
```

|Поле|Правило|
|-------|------|
|`id`|3-50 символов, должны быть уникальными|
|`name`|2-100 символов|
|`description`|Максимум 500 символов|

## Пример использования

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

## Связанные типы

- [Типы элементов](./item-types.md) — элементы, принадлежащие коллекциям.
- [Типы тегов](./tag-types.md) – теги как альтернативная организационная модель.
