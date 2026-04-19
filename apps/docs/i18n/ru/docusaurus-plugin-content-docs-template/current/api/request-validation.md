---
id: request-validation
title: "Проверка запроса API"
sidebar_label: "Запросить проверку"
sidebar_position: 8
---

# Проверка запроса API

Шаблон проверяет запросы API на нескольких уровнях: схемы Zod для проверки тела/запроса, служебные функции для разбиения на страницы и ограничения размера тела, а также встроенные средства защиты типов для параметров перечисления. На этой странице описывается каждый механизм проверки и то, как они используются в обработчиках маршрутов API.

## Архитектура проверки

```mermaid
flowchart TD
    A[Incoming Request] --> B{Auth Check}
    B -->|Unauthorized| C[401 Response]
    B -->|Authorized| D{Content-Length Check}
    D -->|Too large| E[413 Response]
    D -->|OK| F{Pagination Validation}
    F -->|Invalid| G[400 Response]
    F -->|Valid| H{Parameter Validation}
    H -->|Invalid enum| I[400 Response]
    H -->|Valid| J{Body Validation}
    J -->|Zod error| K[400 Response]
    J -->|Valid| L[Service / Repository]
    L -->|Error| M[safeErrorResponse]
    L -->|Success| N[200/201 Response]
```

## Схемы проверки Zod

### Схема расположения (`lib/validations/item.ts`)

Все поля являются необязательными; строгость контролируется настройками уровня формы:

```typescript
export const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional(),
  longitude: z.number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional(),
  service_area: z.enum(['local', 'regional', 'national', 'global']).optional(),
  is_remote: z.boolean().optional(),
  geocoded_by: z.enum(['mapbox', 'google']).optional(),
}).optional();
```

### Схемы элементов клиента (`lib/validations/client-item.ts`)

#### Создать элемент

```typescript
export const clientCreateItemSchema = z.object({
  name: z.string()
    .min(ITEM_VALIDATION.NAME_MIN_LENGTH)
    .max(ITEM_VALIDATION.NAME_MAX_LENGTH),
  description: z.string()
    .min(ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH)
    .max(ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH),
  source_url: z.string().url('Invalid URL format'),
  category: z.union([
    z.string().min(1, 'Category is required'),
    z.array(z.string().min(1)).min(1),
  ]).optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

#### Обновить элемент

Использует те же определения полей, но все поля являются необязательными:

```typescript
export const clientUpdateItemSchema = z.object({
  name: z.string().min(...).max(...).optional(),
  description: z.string().min(...).max(...).optional(),
  source_url: z.string().url().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string()).optional(),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

#### Получение списка параметров запроса

Параметры запроса используют `.transform()` для преобразования строковых входных данных в типизированные значения:

```typescript
export const clientItemsListQuerySchema = z.object({
  page: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1),
  limit: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1 && val <= 100),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'updated_at', 'status', 'submitted_at']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  deleted: z.string().optional().transform(val => val === 'true'),
});
```

### Схема пароля (`lib/validations/auth.ts`)

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Схемы компании (`lib/validations/company.ts`)

```typescript
export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  website: z.string().url().optional().or(z.literal("")),
  domain: z.string().max(255).optional()
    .transform(val => val?.toLowerCase().trim() || undefined),
  slug: z.string().max(255).optional()
    .transform(val => val?.toLowerCase().trim() || undefined)
    .refine(val => !val || /^[a-z0-9-]+$/.test(val)),
  status: z.enum(["active", "inactive"]).default("active"),
});
```

### Выведенные типы

Все схемы экспортируют типы, выведенные Zod, вместе со схемой:

```typescript
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

## Проверка нумерации страниц (`lib/utils/pagination-validation.ts`)

Общая утилита для проверки параметров запроса `page` и `limit`:

```typescript
export function validatePaginationParams(
  searchParams: URLSearchParams
): PaginationParams | PaginationError {
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(page) || page < 1) {
    return { error: 'Invalid page parameter. Must be a positive integer.', status: 400 };
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return { error: 'Invalid limit parameter. Must be between 1 and 100.', status: 400 };
  }
  return { page, limit };
}
```

Использование в обработчиках маршрутов соответствует шаблону дискриминируемого объединения:

```typescript
const paginationResult = validatePaginationParams(searchParams);
if ('error' in paginationResult) {
  return NextResponse.json(
    { success: false, error: paginationResult.error },
    { status: paginationResult.status }
  );
}
const { page, limit } = paginationResult;
```

## Запросить ограничения на размер тела (`lib/utils/request-body.ts`)

### `readBodyWithLimit`

Считывает тело запроса через `ReadableStream` с дополнительной проверкой размера:

```typescript
export async function readBodyWithLimit<T = unknown>(
  request: NextRequest,
  options: ReadBodyOptions
): Promise<ReadBodyResult<T>>
```

Особенности:
- Быстрый путь: сначала проверяется заголовок `Content-Length`
- Инкрементальный: считывает фрагменты потока и проверяет размер по мере поступления байтов.
- Отмена: вызывает `reader.cancel()` при превышении лимита.
- Анализ JSON: необязательно, корректно обрабатывается `SyntaxError`

```typescript
// Usage
const { data } = await readBodyWithLimit(request, { maxSize: 1024 });
```

### `validateContentLength`

Ранний отказ без чтения тела:

```typescript
export function validateContentLength(request: NextRequest, maxSize: number): boolean
```

Выдает `BodySizeLimitError`, если заголовок `Content-Length` превышает предел.

### `BodySizeLimitError`

Пользовательский класс ошибок со свойствами `maxSize` и `actualSize`:

```typescript
export class BodySizeLimitError extends Error {
  constructor(
    public readonly maxSize: number,
    public readonly actualSize: number
  ) {
    super(`Request body too large. Maximum size is ${maxSize} bytes, received ${actualSize} bytes.`);
  }
}
```

## Встроенная проверка параметров

Для параметров перечисления, которые не охватываются схемами Zod, обработчики маршрутов используют защиту встроенного типа:

```typescript
// Type-safe status validation
const validStatuses = ['draft', 'pending', 'approved', 'rejected'] as const;
type ItemStatus = (typeof validStatuses)[number];
const isItemStatus = (s: string): s is ItemStatus =>
  (validStatuses as readonly string[]).includes(s);

if (statusParam && !isItemStatus(statusParam)) {
  return NextResponse.json(
    { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
    { status: 400 }
  );
}
```

Этот шаблон повторяется для параметров `sortBy` и `sortOrder`.

## Очистка входных данных поиска

Параметры текстового поиска обрезаны и нормализованы:

```typescript
const searchRaw = searchParams.get('search');
const search = searchRaw?.trim() ? searchRaw.trim() : undefined;
```

Параметры CSV анализируются и нормализуются:

```typescript
const parseCsv = (value: string | null): string[] | undefined => {
  if (!value) return undefined;
  const arr = value.split(',').map(v => v.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
};
```

## Утилиты разбивки на страницы (`lib/paginate.ts`)

Простые помощники по нумерации страниц для нумерации страниц на уровне шаблона:

```typescript
export const PER_PAGE = 12;

export function totalPages(size: number, perPage: number = PER_PAGE) {
  return Math.ceil(size / perPage);
}

export function paginateMeta(rawPage: number | string = 1, perPage: number = PER_PAGE) {
  const page = typeof rawPage === 'string' ? parseInt(rawPage) : rawPage;
  const start = (page - 1) * perPage;
  return { page, start };
}
```

## Сводка уровня проверки

|Слой|Расположение|Механизм|Цель|
|-------|----------|-----------|---------|
|Авторизация|Обработчик маршрута|`session?.user?.isAdmin`|Ролевой доступ|
|Размер тела|`lib/utils/request-body.ts`|Потоковый читатель|Предотвратите негабаритную полезную нагрузку|
|Пагинация|`lib/utils/pagination-validation.ts`|Парсинг URLSearchParams|Подтвердить страницу/лимит|
|Параметры перечисления|Встроенный обработчик маршрута|Тип охранных функций|Проверка статуса, сортировка по и т. д.|
|Схема тела|`lib/validations/*.ts`|Схемы Зода|Структурированная проверка ввода|
|Поиск|Встроенный обработчик маршрута|Обрезка + анализ CSV|Входная санитарная обработка|
