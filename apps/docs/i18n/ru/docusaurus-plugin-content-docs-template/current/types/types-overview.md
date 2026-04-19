---
id: types-overview
title: Тип Обзор системы
sidebar_label: Обзор
sidebar_position: 0
---

# Тип Обзор системы

В шаблоне используется комплексная система типов TypeScript, расположенная в `lib/types/`. Эти определения типов служат единственным источником достоверных данных для структур данных, используемых в маршрутах API, службах, репозиториях и компонентах пользовательского интерфейса.

## Тип файлов

Каталог `lib/types/` содержит следующие модули:

|Файл|Описание|
|------|-------------|
|`item.ts`|Данные элемента, запросы CRUD, параметры списка, константы проверки и определения статуса.|
|`user.ts`|Данные пользователя администратора, типы аутентификации, схемы проверки Zod и вспомогательные функции.|
|`profile.ts`|Структура общедоступного профиля пользователя, включая социальные ссылки, навыки, портфолио и материалы.|
|`category.ts`|Данные категории, запросы CRUD, параметры списка и константы проверки.|
|`comment.ts`|Типы комментариев, выведенные из схемы базы данных, включая комментарии, обогащенные пользователем.|
|`vote.ts`|Схема голосования (Zod), типы ответов, типы ошибок и состояние голосования на стороне клиента|
|`survey.ts`|Типы опросов и ответов на опросы, параметры фильтров и перечисления статусов/типов|
|`location.ts`|Настройки местоположения, типы географических запросов, типы поставщиков карт и данные координат.|
|`sponsor-ad.ts`|Типы рекламных объявлений спонсора, включая запросы, ответы, статистику и данные информационной панели.|
|`client.ts`|Типы профилей клиентов для клиентского портала, включая панель мониторинга и статистику|
|`client-item.ts`|Типы отправки элементов на стороне клиента с показателями взаимодействия и фильтрами статуса|
|`role.ts`|Типы ролей и разрешений для системы RBAC|
|`tag.ts`|Данные тегов, запросы CRUD, параметры списка и константы проверки.|
|`twenty-crm-config.types.ts`|Двадцать конфигураций интеграции CRM и типов тестирования соединений|
|`twenty-crm-entities.types.ts`|Двадцать типов сущностей CRM для записей о людях и компаниях.|
|`twenty-crm-errors.types.ts`|Структурированные типы ошибок, коды ошибок и защита типов для ошибок CRM.|
|`twenty-crm-sync.types.ts`|Операции Upsert, записи кэша и типы, связанные с синхронизацией|

## Архитектурные шаблоны

### Согласованный шаблон CRUD

Большинство типов сущностей следуют единому шаблону интерфейсов:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Константы проверки

Каждый модуль сущности экспортирует объект констант проверки, используя `as const` для обеспечения безопасности типов:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Эти константы используются как при проверке формы на стороне сервера, так и при проверке формы на стороне клиента, обеспечивая согласованность правил во всем стеке.

### Дискриминированные ответы профсоюзов

Типы ответов API используют размеченные объединения для типовобезопасной обработки ошибок:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Этот шаблон используется `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` и другими.

### Интеграция схемы Zod

Некоторые модули используют Zod для проверки времени выполнения наряду с типами TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Это используется в `vote.ts` (для схемы голосования) и `user.ts` (для проверки пользователя).

### Расширенные типы с отношениями

Типы, включающие связанные данные, используют ключевое слово `extends`:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Соглашения об импорте

Типы импортируются с использованием ключевого слова `type` для импорта только типов:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Это гарантирует, что типы будут удалены во время компиляции и не повлияют на размер пакета.

## Конфигурация и типы времени выполнения

Модуль location демонстрирует шаблон, используемый для настройки:

- **Типы конфигурации** используют `snake_case` для соответствия файлам конфигурации YAML.
- **Типы времени выполнения** используют `camelCase` для идиоматического использования TypeScript.
- Функция сопоставления преобразует два формата.

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Перечисления и метки статусов

Значения статуса определяются как константные объекты с соответствующими метками и цветовыми сопоставлениями:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Типы, выводимые базой данных

Некоторые типы выводятся непосредственно из схемы ORM Drizzle:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Такой подход гарантирует автоматическую синхронизацию типов с миграцией базы данных.

## Сопутствующая документация

- [Типы предметов](./item-types.md) — основные структуры данных предметов.
- [Типы пользователей](./user-types.md) — аутентификация пользователей и типы профилей.
- [Типы категорий](./category-types.md) — типы управления категориями.
- [Типы комментариев](./comment-types.md) - Типы комментариев и отзывов
- [Типы голосования](./vote-types.md) - Типы систем голосования
- [Типы опросов](./survey-types.md) — типы опросов и ответов
- [Типы местоположений](./location-types.md) - Геолокация и типы карт
- [Типы спонсорских объявлений](./sponsor-ad-types.md) - Типы спонсорства и рекламы
- [Типы CRM](./crm-types.md) — Двадцать типов интеграции CRM.
