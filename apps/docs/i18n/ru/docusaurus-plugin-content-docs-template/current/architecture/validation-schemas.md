---
id: validation-schemas
title: Схемы проверки
sidebar_label: Схемы проверки
sidebar_position: 39
---

# Схемы проверки

Шаблон использует Zod для проверки во время выполнения маршрутов API, действий сервера и отправки форм. Схемы организованы по доменам в `lib/validations/` и на них ссылаются как в серверном, так и в клиентском коде.

## Структура файла

```
lib/validations/
  auth.ts               # Password validation schema
  item.ts               # Item location schema
  client-item.ts        # Client-facing item CRUD schemas
  client-dashboard.ts   # Dashboard query parameters
  company.ts            # Company create/update, item-company association
  user-location.ts      # User profile location settings
  sponsor-ad.ts         # Sponsor ad lifecycle schemas
```

## Схемы аутентификации (`auth.ts`)

### Схема паролей

Общая схема, обеспечивающая требования к надежным паролям:

```ts
import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");
```

Требования:
- Минимум 8 символов
- Хотя бы 1 заглавная буква
- Хотя бы 1 строчная буква
- Хотя бы 1 цифра
- Минимум 1 специальный символ

## Схемы предметов (`item.ts`)

### Схема расположения

Проверяет данные о географическом местоположении предметов. Все поля являются необязательными, поскольку строгость контролируется настройками сайта:

```ts
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

export type LocationSchemaInput = z.infer<typeof locationSchema>;
```

## Схемы элементов клиента (`client-item.ts`)

### Создать элемент

Схема для отправленных клиентом элементов с обязательными основными полями:

```ts
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
    z.array(z.string().min(1)).min(1, 'At least one category is required'),
  ]).optional().nullable(),
  tags: z.array(z.string().min(1)).optional().default([]),
  icon_url: z.string().url('Invalid icon URL format').optional().or(z.literal('')),
  location: locationSchema,
});

export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
```

### Обновить элемент

Разрешены только поля, которые клиентам разрешено изменять (все необязательно):

```ts
export const clientUpdateItemSchema = z.object({
  name: z.string().min(...).max(...).optional(),
  description: z.string().min(...).max(...).optional(),
  source_url: z.string().url('Invalid URL format').optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string().min(1)).optional(),
  icon_url: z.string().url().optional().or(z.literal('')),
  location: locationSchema,
});

export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
```

### Запрос списка элементов

Проверяет и преобразует параметры запроса для списков элементов с разбивкой на страницы:

```ts
export const clientItemsListQuerySchema = z.object({
  page: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1),
  limit: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1 && val <= 100),
  status: z.enum(['all', 'pending', 'approved', 'rejected'])
    .optional().default('all'),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'updated_at', 'status', 'submitted_at'])
    .optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional().default('desc'),
  deleted: z.string().optional()
    .transform(val => val === 'true'),
});

export type ClientItemsListQueryInput = z.infer<typeof clientItemsListQuerySchema>;
```

### Параметр идентификатора товара

```ts
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

export type ItemIdParamInput = z.infer<typeof itemIdParamSchema>;
```

## Схемы компании (`company.ts`)

### Создать компанию

```ts
export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(255),
  website: z.string().url("Invalid URL format").optional().or(z.literal("")),
  domain: z.string().max(255).optional()
    .transform((val) => val?.toLowerCase().trim() || undefined),
  slug: z.string().max(255).optional()
    .transform((val) => val?.toLowerCase().trim() || undefined)
    .refine(
      (val) => !val || /^[a-z0-9-]+$/.test(val),
      { message: "Slug must contain only lowercase letters, numbers, and hyphens" }
    ),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
```

### Обновить компанию

Идентичен `createCompanySchema`, но с полем `id` и всеми остальными полями, которые являются необязательными:

```ts
export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  domain: z.string().max(255).optional().transform(...),
  slug: z.string().max(255).optional().transform(...).refine(...),
  status: z.enum(["active", "inactive"]).optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
```

### Ассоциация компаний «Итем-Компания»

```ts
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1).max(255)
    .transform((val) => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

export const removeCompanyFromItemSchema = z.object({
  itemSlug: z.string().min(1).max(255)
    .transform((val) => val.toLowerCase().trim()),
});
```

## Схемы расположения пользователей (`user-location.ts`)

### Конфиденциальность местоположения

```ts
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);

export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Обновить местоположение

Проверяет местоположение профиля пользователя с уточнением между полями, гарантируя, что широта и долгота предоставляются вместе:

```ts
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
    return hasLat === hasLng;
  },
  { message: 'Both latitude and longitude must be provided together' }
);

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
```

## Спонсорские рекламные схемы (`sponsor-ad.ts`)

### Перечисления состояний и интервалов

```ts
export const sponsorAdStatuses = [
  "pending_payment", "pending", "rejected",
  "active", "expired", "cancelled",
] as const;

export const sponsorAdIntervals = ["weekly", "monthly"] as const;
```

### Создать спонсорское объявление

```ts
export const createSponsorAdSchema = z.object({
  itemSlug: z.string().min(1, "Item slug is required"),
  interval: z.enum(sponsorAdIntervals),
  paymentProvider: z.string().min(1, "Payment provider is required"),
});
```

### Обновить спонсорское объявление (администратор)

```ts
export const updateSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
  status: z.enum(sponsorAdStatuses).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  subscriptionId: z.string().optional(),
  customerId: z.string().optional(),
});
```

### Утвердить и отклонить

```ts
export const approveSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
});

export const rejectSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
  rejectionReason: z.string()
    .min(10, "Please provide a reason (minimum 10 characters)")
    .max(500, "Rejection reason is too long (maximum 500 characters)"),
});
```

### Отмена

```ts
export const cancelSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
  cancelReason: z.string().max(500).optional(),
});
```

### Запрос спонсорских объявлений

```ts
export const querySponsorAdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(sponsorAdStatuses).optional(),
  interval: z.enum(sponsorAdIntervals).optional(),
  search: z.string().optional(),
  sortBy: z.enum([
    "createdAt", "updatedAt", "startDate", "endDate", "status"
  ]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

## Схемы информационной панели (`client-dashboard.ts`)

```ts
export const dashboardStatsQuerySchema = z.object({
  // Reserved for future date range filters
});

export type DashboardStatsQueryInput = z.infer<typeof dashboardStatsQuerySchema>;
```

## Шаблоны использования

### В API-маршрутах

```ts
import { clientCreateItemSchema } from '@/lib/validations/client-item';

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = clientCreateItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const validData = parsed.data;
  // ... create item
}
```

### В форме React Hook

```ts
import { zodResolver } from '@hookform/resolvers/zod';
import { createCompanySchema } from '@/lib/validations/company';

function CompanyForm() {
  const form = useForm({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: '', status: 'active' },
  });

  // Form fields are type-safe based on the schema
}
```

## Связанные файлы

- `lib/validations/auth.ts` - Проверка пароля
- `lib/validations/item.ts` - Схема расположения элемента
- `lib/validations/client-item.ts` — схемы элементов, ориентированные на клиента.
- `lib/validations/client-dashboard.ts` - Схемы запросов информационной панели
- `lib/validations/company.ts` - Схемы компаний и товаров-компаний
- `lib/validations/user-location.ts` - Схемы расположения пользователей
- `lib/validations/sponsor-ad.ts` – схемы жизненного цикла спонсорских объявлений.
- `lib/types/item.ts` - `ITEM_VALIDATION` константы, используемые схемами
