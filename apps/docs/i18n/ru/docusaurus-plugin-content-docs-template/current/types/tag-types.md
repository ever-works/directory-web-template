---
id: tag-types
title: Определения типов тегов
sidebar_label: Типы тегов
sidebar_position: 20
---

# Определения типов тегов

**Источник:** `lib/types/tag.ts`

Теги обеспечивают плоскую систему маркировки предметов. Они управляются через интерфейс администратора и хранятся в файловой системе контента.

## Интерфейсы

### `TagData`

Структура данных базового тега.

```typescript
interface TagData {
  id: string;         // Unique tag identifier
  name: string;       // Display name
  isActive: boolean;  // Whether the tag is publicly visible
}
```

|Поле|Тип|Описание|
|-------|------|-------------|
|`id`|`string`|Стабильный идентификатор, используемый в файлах YAML элементов.|
|`name`|`string`|Удобочитаемая этикетка, отображаемая в пользовательском интерфейсе, 2–50 символов.|
|`isActive`|`boolean`|Неактивные теги скрыты от общедоступных фильтров, но сохраняются в данных.|

### `TagWithCount`

Данные тегов дополнены статистикой использования.

```typescript
interface TagWithCount extends TagData {
  count?: number;  // Number of items using this tag
}
```

### `CreateTagRequest`

Полезная нагрузка для создания нового тега.

```typescript
interface CreateTagRequest {
  id: string;
  name: string;
  isActive: boolean;
}
```

### `UpdateTagRequest`

Полезная нагрузка для обновления тега. `id` изменить нельзя.

```typescript
type UpdateTagRequest = Partial<Omit<CreateTagRequest, 'id'>>;
```

### `TagListOptions`

Параметры запроса для перечисления тегов.

```typescript
interface TagListOptions {
  includeInactive?: boolean;           // Default: false
  sortBy?: 'name' | 'id';             // Default: 'name'
  sortOrder?: 'asc' | 'desc';         // Default: 'asc'
  page?: number;                       // Default: 1
  limit?: number;                      // Default: 20
}
```

## Типы ответов

### `TagListResponse`

Ответ со списком тегов с разбивкой на страницы.

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

Результат операции с одним тегом.

```typescript
interface TagResponse {
  success: boolean;
  tag?: TagData;
  error?: string;
}
```

## Правила валидации

```typescript
const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
} as const;
```

|Поле|Правило|
|-------|------|
|`name`|2-50 символов|
|`id`|Должно быть уникальным во всех тегах.|

## Теги в системе контента

Теги ссылаются на идентификатор в файлах YAML элемента:

```yaml
# .content/items/my-tool.yml
name: My Tool
tags:
  - open-source
  - productivity
  - saas
```

Репозиторий тегов считывает определения тегов из репозитория контента и предоставляет их пользовательскому интерфейсу администратора и компонентам фильтрации.

## Интеграция фильтров

Теги интегрируются с системой фильтрации на стороне клиента посредством следующих компонентов:

- `components/filters/components/tags/` -- пользовательский интерфейс фильтра тегов
- `components/filters/hooks/use-tag-visibility.ts` -- управляет отображением тегов.
- `components/filters/utils/tag-utils.ts` -- вспомогательные функции для фильтрации тегов

## Пример использования

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

## Связанные типы

- [Типы коллекций](./collection-types.md) – коллекции как альтернативная модель группировки.
- [Типы элементов](./item-types.md) — элементы, ссылающиеся на теги.
- [Типы разрешений](./permission-types.md) -- `tags:read`, `tags:create` и т. д.
