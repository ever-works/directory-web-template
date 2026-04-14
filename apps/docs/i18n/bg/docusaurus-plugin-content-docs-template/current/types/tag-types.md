---
id: tag-types
title: Дефиниции на типове тагове
sidebar_label: Типове тагове
sidebar_position: 20
---

# Дефиниции на типове тагове

**Източник:** `lib/types/tag.ts`

Етикетите осигуряват плоска система за етикетиране на елементи. Те се управляват чрез администраторския интерфейс и се съхраняват във файловата система за съдържание.

## Интерфейси

### `TagData`

Базовата структура на данните на етикета.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`id`|`string`|Стабилен идентификатор, използван в YAML файлове на елемент|
|`name`|`string`|Четим от човека етикет, показан в потребителския интерфейс, 2-50 знака|
|`isActive`|`boolean`|Неактивните маркери са скрити от публичните филтри, но се запазват в данните|

### `TagWithCount`

Данните за етикети са разширени със статистически данни за употребата.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Полезен товар за създаване на нов етикет.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Полезен товар за актуализиране на етикет. `id` не може да се променя.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Параметри на заявката за етикети за списък.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Типове отговори

### `TagListResponse`

Отговор на списък с пагинирани етикети.

```typescript
interface TagListResponse {
  tags: TagWithCount[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `TagResponse`

Резултат от операция с един етикет.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Правила за валидиране

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Поле|правило|
|-------|------|
|`name`|2-50 знака|
|`id`|Трябва да е уникален във всички тагове|

## Тагове в системата за съдържание

Етикетите са посочени по ID в YAML файлове на елемент:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

Хранилището на етикети чете дефинициите на етикети от хранилището на съдържанието и ги предоставя на администраторския потребителски интерфейс и филтърни компоненти.

## Интеграция на филтъра

Етикетите се интегрират с филтърната система от страна на клиента чрез тези компоненти:

- `components/filters/components/tags/` -- потребителски интерфейс на филтъра за етикети
- `components/filters/hooks/use-tag-visibility.ts` -- контролира кои тагове да се показват
- `components/filters/utils/tag-utils.ts` -- помощни функции за филтриране на тагове

## Пример за използване

```typescript
import type {
  TagData,
  CreateTagRequest,
  TagListOptions,
} from '@/lib/types/tag';

// Create a new tag
const newTag: CreateTagRequest = {
  id: 'ai-powered',
  name: 'AI Powered',
  isActive: true,
};

// List active tags sorted by name
const options: TagListOptions = {
  includeInactive: false,
  sortBy: 'name',
  sortOrder: 'asc',
  page: 1,
  limit: 50,
};
```

## Свързани типове

- [Типове колекции](./collection-types.md) -- колекции като алтернативен модел на групиране
- [Типове елементи](./item-types.md) -- елементи, които препращат към тагове
- [Типове разрешения](./permission-types.md) -- `tags:read`, `tags:create` и т.н.
