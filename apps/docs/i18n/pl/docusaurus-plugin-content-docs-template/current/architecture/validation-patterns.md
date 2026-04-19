---
id: validation-patterns
title: "Wzory walidacji"
sidebar_label: "Wzory walidacji"
sidebar_position: 21
---

# Wzory walidacji

Szablon używa Zoda do sprawdzania poprawności opartej na schemacie we wszystkich granicach API. Schematy walidacji definiują kształty danych, ograniczenia, transformacje i wnioskowanie o typach w jednym źródle prawdy. Każda domena ma swój własny moduł sprawdzania poprawności ze schematami operacji tworzenia, aktualizacji i zapytań.

## Przegląd architektury

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

## Pliki źródłowe

|Plik|Cel|
|------|---------|
|`lib/validations/auth.ts`|Hasła i schematy uwierzytelniania|
|`lib/validations/item.ts`|Schemat danych o lokalizacji elementu|
|`lib/validations/client-item.ts`|Schematy tworzenia/aktualizowania/zapytań elementów dostępnych dla klienta|
|`lib/validations/company.ts`|Firma CRUD i schematy powiązań pozycja-firma|
|`lib/validations/sponsor-ad.ts`|Schematy cyklu życia reklamy sponsora|
|`lib/validations/client-dashboard.ts`|Schematy parametrów zapytań w panelu kontrolnym|
|`lib/validations/user-location.ts`|Lokalizacja użytkownika i ustawienia prywatności|

## Podstawowe wzory

### Wzorzec 1: Schemat + wywnioskowany typ

Każdy schemat eksportuje odpowiedni typ TypeScript poprzez `z.infer`:

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

### Wzorzec 2: Przekształcanie i normalizowanie

Schematy wykorzystują `.transform()` do normalizacji danych wejściowych:

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

### Wzorzec 3: Ograniczenia wyliczeniowe

Pola statusu używają `z.enum()` z tablicami const dla bezpieczeństwa typów:

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

### Wzorzec 4: Parametry wymuszonego zapytania

Parametry ciągu zapytania z żądań HTTP są wymuszane na podstawie ciągów:

```typescript
export const querySponsorAdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(sponsorAdStatuses).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "startDate", "endDate", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

### Wzorzec 5: Transformacja ciągu znaków na liczbę

W przypadku parametrów zapytania, które przychodzą jako ciągi znaków, ale reprezentują liczby:

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

### Wzorzec 6: Walidacja między polami z udoskonaleniem

Złożone reguły walidacji obejmujące wiele pól:

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

### Wzór 7: Typy Unii

Pola akceptujące wiele formatów:

```typescript
category: z.union([
  z.string().min(1, 'Category is required'),
  z.array(z.string().min(1)).min(1, 'At least one category is required'),
]).optional().nullable(),
```

## Schematy domen

### Uwierzytelnianie

Weryfikacja hasła z wieloma ograniczeniami wyrażeń regularnych:

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Lokalizacja przedmiotu

Dane geograficzne z ograniczonymi współrzędnymi:

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

### Prywatność lokalizacji użytkownika

Ustawienia prywatności oparte na wyliczeniu:

```typescript
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);
export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Przesłanie przedmiotu klienta

Pełny schemat tworzenia z zewnętrznymi stałymi walidacyjnymi:

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

### Cykl życia reklamy sponsora

Wiele schematów obejmujących pełny przepływ pracy z reklamą sponsora:

|Schemat|Cel|
|--------|---------|
|`createSponsorAdSchema`|Nowe zgłoszenie sponsora|
|`updateSponsorAdSchema`|Aktualizacja administratora (status, daty, subskrypcja)|
|`approveSponsorAdSchema`|Zatwierdzenie administratora|
|`rejectSponsorAdSchema`|Odrzucenie przez administratora z powodem (10–500 znaków)|
|`cancelSponsorAdSchema`|Anulowanie z opcjonalnym powodem|
|`querySponsorAdsSchema`|Lista stronicowana z filtrami|

## Wzorce ponownego wykorzystania schematu

### Częściowe schematy aktualizacji

Aktualizuj schematy często odzwierciedlają schematy tworzenia, przy czym wszystkie pola są opcjonalne:

```typescript
export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(companyStatus).optional(),
});
```

### Aliasing schematu

Gdy dwie operacje mają identyczne potrzeby w zakresie walidacji:

```typescript
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1).max(255).transform(val => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

// Reuse for updates (identical validation)
export const updateItemCompanySchema = assignCompanyToItemSchema;
```

### Wybieranie selektywne

Używanie `.pick()` do tworzenia schematów podzbiorów:

```typescript
const validatedData = userValidationSchema
  .pick({ email: true, password: true })
  .parse(data);
```

## Użycie w trasach API

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
