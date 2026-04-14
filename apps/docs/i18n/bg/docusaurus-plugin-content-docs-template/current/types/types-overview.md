---
id: types-overview
title: Тип Преглед на системата
sidebar_label: Преглед
sidebar_position: 0
---

# Тип Преглед на системата

Шаблонът използва цялостна система от типове TypeScript, разположена в `lib/types/`. Тези дефиниции на типове служат като единствен източник на истина за структурите от данни, използвани в API маршрути, услуги, хранилища и UI компоненти.

## Въведете файлове

Директорията `lib/types/` съдържа следните модули:

|Файл|Описание|
|------|-------------|
|`item.ts`|Данни за артикули, CRUD заявки, опции за списък, константи за валидиране и дефиниции на статус|
|`user.ts`|Потребителски данни на администратор, типове удостоверяване, схеми за валидиране на Zod и помощни функции|
|`profile.ts`|Структура на публичен потребителски профил, включително социални връзки, умения, портфолио и изявления|
|`category.ts`|Данни за категории, CRUD заявки, опции за списък и константи за валидиране|
|`comment.ts`|Типове коментари, изведени от схемата на базата данни, включително коментари, обогатени от потребителите|
|`vote.ts`|Схема на гласуване (Zod), типове отговори, типове грешки и състояние на гласуване от страна на клиента|
|`survey.ts`|Проучване и типове отговори на проучването, опции за филтриране и изброяване на статус/тип|
|`location.ts`|Настройки за местоположение, типове географски заявки, типове доставчик на карти и данни за координати|
|`sponsor-ad.ts`|Типове реклами на спонсори, включително заявки, отговори, статистика и данни от таблото за управление|
|`client.ts`|Типове клиентски профили за портала, насочен към клиента, включително табло за управление и статистика|
|`client-item.ts`|Типове подаване на елементи от страна на клиента с показатели за ангажираност и филтри за състояние|
|`role.ts`|Типове роли и разрешения за системата RBAC|
|`tag.ts`|Данни за тагове, CRUD заявки, опции за списък и константи за валидиране|
|`twenty-crm-config.types.ts`|Двадесет конфигурации за интегриране на CRM и типове тестване на връзката|
|`twenty-crm-entities.types.ts`|Двадесет типа CRM обекти за записи на лица и компании|
|`twenty-crm-errors.types.ts`|Структурирани типове грешки, кодове за грешки и предпазители на типове за CRM грешки|
|`twenty-crm-sync.types.ts`|Операции за връщане, записи в кеша и типове, свързани със синхронизирането|

## Архитектурни модели

### Последователен модел CRUD

Повечето типове обекти следват последователен модел на интерфейси:

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

### Валидиращи константи

Всеки модул на обект експортира обект на константи за валидиране, използвайки `as const` за безопасност на типа:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

Тези константи се използват както при валидиране от страна на сървъра, така и при валидиране на формуляр от страна на клиента, като гарантират последователни правила в стека.

### Дискриминирани синдикални реакции

Типовете отговори на API използват дискриминирани съюзи за безопасна за типа обработка на грешки:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

Този модел се използва от `SponsorAdResponse`, `ClientResponse`, `ClientListResponse` и други.

### Интегриране на Zod схема

Няколко модула използват Zod за проверка по време на изпълнение заедно с типовете TypeScript:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

Това се използва в `vote.ts` (за схемата за гласуване) и `user.ts` (за потребителско валидиране).

### Разширени типове с релации

Типовете, които включват свързани данни, използват ключовата дума `extends`:

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

## Конвенции за импортиране

Типовете се импортират с помощта на ключовата дума `type` за импортиране само на типове:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

Това гарантира, че типовете се изтриват по време на компилиране и не засяга размера на пакета.

## Конфигурация срещу типове по време на изпълнение

Модулът за местоположение демонстрира модел, използван за конфигурация:

- **Типове конфигурации** използват `snake_case`, за да съответстват на YAML конфигурационните файлове
- **Типовете по време на изпълнение** използват `camelCase` за идиоматично използване на TypeScript
- Функция за картографиране преобразува между двата формата

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

## Енуми и етикети на състоянието

Стойностите на състоянието се дефинират като const обекти със съответния етикет и цветови съпоставки:

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

## Изведени от базата данни типове

Някои типове се извеждат директно от Drizzle ORM схемата:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

Този подход гарантира, че типовете автоматично остават в синхрон с миграциите на бази данни.

## Свързана документация

- [Типове артикули](./item-types.md) - Основни структури от данни за артикули
- [Типове потребители](./user-types.md) - Удостоверяване на потребители и типове профили
- [Типове категории](./category-types.md) - Типове управление на категории
- [Типове коментари](./comment-types.md) - Типове коментари и прегледи
- [Типове гласуване](./vote-types.md) - Типове системи за гласуване
- [Типове анкети](./survey-types.md) - Типове анкети и отговори
- [Типове местоположение](./location-types.md) - Геолокация и типове карти
- [Типове реклами на спонсори](./sponsor-ad-types.md) - Типове спонсорство и реклама
- [CRM типове](./crm-types.md) - Двадесет типа CRM интеграция
