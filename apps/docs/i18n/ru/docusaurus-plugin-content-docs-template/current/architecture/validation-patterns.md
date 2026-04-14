---
id: validation-patterns
title: "Шаблоны проверки"
sidebar_label: "Шаблоны проверки"
sidebar_position: 21
---

# Шаблоны проверки

Шаблон использует Zod для проверки на основе схемы во всех границах API. Схемы проверки определяют формы данных, ограничения, преобразования и вывод типов в едином источнике достоверных данных. Каждый домен имеет собственный модуль проверки со схемами для операций создания, обновления и запроса.

## Обзор архитектуры

```mermaid
graph TD
    A[API Route Handler] --> B[Zod Schema]
    B --> C{Validation}
    C -->|Valid| D[Typed Data]
    C -->|Invalid| E[ZodError]
    D --> F[Repository / Service]
    E --> G[Error Response]
    B --> H[TypeScript Type via z.infer]
    H --> I[Components / Hooks]
```

## Исходные файлы

|Файл|Цель|
|------|---------|
|`lib/validations/auth.ts`|Схемы паролей и аутентификации|
|`lib/validations/item.ts`|Схема данных о местоположении элемента|
|`lib/validations/client-item.ts`|Схемы создания/обновления/запроса клиентских элементов|
|`lib/validations/company.ts`|CRUD компании и схемы ассоциации товара-компании|
|`lib/validations/sponsor-ad.ts`|Схемы жизненного цикла спонсорских объявлений|
|`lib/validations/client-dashboard.ts`|Схемы параметров запроса информационной панели|
|`lib/validations/user-location.ts`|Местоположение пользователя и настройки конфиденциальности|

## Основные шаблоны

### Шаблон 1: Схема + выведенный тип

Каждая схема экспортирует соответствующий тип TypeScript через `z.infer`:

```typescript
import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
// Inferred type:
// {
//   name: string;
//   website?: string | "";
//   status: "active" | "inactive";
// }
```

### Схема 2: преобразование и нормализация

Схемы используют `.transform()` для нормализации входных данных:

```typescript
domain: z.string()
  .max(255)
  .optional()
  .transform((val) => val?.toLowerCase().trim() || undefined),

slug: z.string()
  .max(255)
  .optional()
  .transform((val) => val?.toLowerCase().trim() || undefined)
  .refine(
    (val) => !val || /^[a-z0-9-]+$/.test(val),
    { message: "Slug must contain only lowercase letters, numbers, and hyphens" }
  ),
```

### Шаблон 3: Ограничения перечисления

В полях статуса используется `z.enum()` с константными массивами для обеспечения безопасности типов:

```typescript
export const companyStatus = ["active", "inactive"] as const;
export const sponsorAdStatuses = [
  "pending_payment", "pending", "rejected",
  "active", "expired", "cancelled",
] as const;
export const sponsorAdIntervals = ["weekly", "monthly"] as const;

// Usage in schemas
status: z.enum(companyStatus).default("active"),
interval: z.enum(sponsorAdIntervals),
```

### Шаблон 4: Принудительные параметры запроса

Параметры строки запроса из HTTP-запросов извлекаются из строк:

```typescript
export const querySponsorAdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(sponsorAdStatuses).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "startDate", "endDate", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

### Шаблон 5: преобразование строки в число

Для параметров запроса, которые поступают в виде строк, но представляют собой числа:

```typescript
page: z.string()
  .optional()
  .transform(val => (val ? parseInt(val, 10) : 1))
  .refine(val => !Number.isNaN(val), { message: 'Page must be a valid number' })
  .refine(val => val >= 1, { message: 'Page must be at least 1' }),

deleted: z.string()
  .optional()
  .transform(val => val === 'true'),  // String "true" -> boolean true
```

### Шаблон 6: Межполевая проверка с помощью Refine

Сложные правила проверки, охватывающие несколько полей:

```typescript
export const updateLocationSchema = z.object({
  defaultLatitude: z.number().min(-90).max(90).nullable().optional(),
  defaultLongitude: z.number().min(-180).max(180).nullable().optional(),
  defaultCity: z.string().max(200).nullable().optional(),
  defaultCountry: z.string().max(100).nullable().optional(),
  locationPrivacy: locationPrivacySchema.optional(),
}).refine(
  (data) => {
    const hasLat = data.defaultLatitude != null;
    const hasLng = data.defaultLongitude != null;
    return hasLat === hasLng;  // Both or neither
  },
  { message: 'Both latitude and longitude must be provided together' }
);
```

### Шаблон 7: Типы объединений

Поля, которые принимают несколько форматов:

```typescript
category: z.union([
  z.string().min(1, 'Category is required'),
  z.array(z.string().min(1)).min(1, 'At least one category is required'),
]).optional().nullable(),
```

## Схемы доменов

### Аутентификация

Проверка пароля с несколькими ограничениями регулярных выражений:

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Расположение предмета

Географические данные с ограниченными координатами:

```typescript
export const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  service_area: z.enum(['local', 'regional', 'national', 'global']).optional(),
  is_remote: z.boolean().optional(),
  geocoded_by: z.enum(['mapbox', 'google']).optional(),
}).optional();
```

### Конфиденциальность местоположения пользователя

Настройки конфиденциальности на основе перечисления:

```typescript
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);
export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Отправка клиентского товара

Полная схема создания с внешними константами проверки:

```typescript
import { ITEM_VALIDATION } from '@/lib/types/item';

export const clientCreateItemSchema = z.object({
  name: z.string()
    .min(ITEM_VALIDATION.NAME_MIN_LENGTH)
    .max(ITEM_VALIDATION.NAME_MAX_LENGTH),
  description: z.string()
    .min(ITEM_VALIDATION.DESCRIPTION_MIN_LENGTH)
    .max(ITEM_VALIDATION.DESCRIPTION_MAX_LENGTH),
  source_url: z.string().url('Invalid URL format'),
  category: z.union([
    z.string().min(1),
    z.array(z.string().min(1)).min(1),
  ]).optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});
```

### Жизненный цикл спонсорской рекламы

Несколько схем, охватывающих весь рабочий процесс спонсорской рекламы:

|Схема|Цель|
|--------|---------|
|`createSponsorAdSchema`|Представление новой спонсорской рекламы|
|`updateSponsorAdSchema`|Обновление администратора (статус, даты, подписка)|
|`approveSponsorAdSchema`|Одобрение администратора|
|`rejectSponsorAdSchema`|Отказ администратора с указанием причины (10–500 символов)|
|`cancelSponsorAdSchema`|Отмена с указанием необязательной причины|
|`querySponsorAdsSchema`|Постраничный список с фильтрами|

## Шаблоны повторного использования схемы

### Частичные схемы обновлений

Схемы обновления часто отражают схемы создания со всеми необязательными полями:

```typescript
export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(companyStatus).optional(),
});
```

### Псевдоним схемы

Когда две операции имеют одинаковые потребности в проверке:

```typescript
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1).max(255).transform(val => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

// Reuse for updates (identical validation)
export const updateItemCompanySchema = assignCompanyToItemSchema;
```

### Выборочный сбор

Использование `.pick()` для создания подмножества схем:

```typescript
const validatedData = userValidationSchema
  .pick({ email: true, password: true })
  .parse(data);
```

## Использование в маршрутах API

```typescript
import { clientCreateItemSchema } from '@/lib/validations/client-item';

export async function POST(request: Request) {
  const body = await request.json();

  // Validation + transformation in one step
  const result = clientCreateItemSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { errors: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // result.data is fully typed and transformed
  const item = await repository.create(result.data);
  return Response.json(item, { status: 201 });
}
```
