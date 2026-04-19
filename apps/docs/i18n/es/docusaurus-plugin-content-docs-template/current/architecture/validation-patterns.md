---
id: validation-patterns
title: "Patrones de validación"
sidebar_label: "Patrones de validación"
sidebar_position: 21
---

# Patrones de validación

La plantilla utiliza Zod para la validación basada en esquemas en todos los límites de la API. Los esquemas de validación definen formas de datos, restricciones, transformaciones e inferencia de tipos en una única fuente de verdad. Cada dominio tiene su propio módulo de validación con esquemas para operaciones de creación, actualización y consulta.

## Descripción general de la arquitectura

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

## Archivos fuente

|Archivo|Propósito|
|------|---------|
|`lib/validations/auth.ts`|Esquemas de contraseña y autenticación|
|`lib/validations/item.ts`|Esquema de datos de ubicación del artículo|
|`lib/validations/client-item.ts`|Esquemas de creación/actualización/consulta de elementos de cara al cliente|
|`lib/validations/company.ts`|CRUD de empresa y esquemas de asociación artículo-empresa|
|`lib/validations/sponsor-ad.ts`|Esquemas del ciclo de vida de los anuncios patrocinadores|
|`lib/validations/client-dashboard.ts`|Esquemas de parámetros de consulta del panel|
|`lib/validations/user-location.ts`|Ubicación del usuario y configuración de privacidad|

## Patrones centrales

### Patrón 1: esquema + tipo inferido

Cada esquema exporta un tipo TypeScript correspondiente a través de `z.infer`:

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

### Patrón 2: transformar y normalizar

Los esquemas utilizan `.transform()` para normalizar los datos de entrada:

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

### Patrón 3: restricciones de enumeración

Los campos de estado usan `z.enum()` con matrices constantes para seguridad de tipos:

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

### Patrón 4: parámetros de consulta forzados

Los parámetros de cadena de consulta de solicitudes HTTP se obtienen a partir de cadenas:

```typescript
export const querySponsorAdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(sponsorAdStatuses).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "startDate", "endDate", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

### Patrón 5: Transformación de cadena a número

Para parámetros de consulta que llegan como cadenas pero representan números:

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

### Patrón 6: Validación entre campos con Refinar

Reglas de validación complejas que abarcan múltiples campos:

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

### Patrón 7: tipos de unión

Campos que aceptan múltiples formatos:

```typescript
category: z.union([
  z.string().min(1, 'Category is required'),
  z.array(z.string().min(1)).min(1, 'At least one category is required'),
]).optional().nullable(),
```

## Esquemas de dominio

### Autenticación

Validación de contraseña con múltiples restricciones de expresiones regulares:

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Ubicación del artículo

Datos geográficos con coordenadas acotadas:

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

### Privacidad de la ubicación del usuario

Configuración de privacidad basada en enumeraciones:

```typescript
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);
export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Envío de artículos del cliente

Esquema de creación completo con constantes de validación externas:

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

### Ciclo de vida del anuncio del patrocinador

Múltiples esquemas que cubren todo el flujo de trabajo de anuncios de patrocinadores:

|esquema|Propósito|
|--------|---------|
|`createSponsorAdSchema`|Envío de anuncio de nuevo patrocinador|
|`updateSponsorAdSchema`|Actualización del administrador (estado, fechas, suscripción)|
|`approveSponsorAdSchema`|Aprobación del administrador|
|`rejectSponsorAdSchema`|Rechazo del administrador con motivo (10-500 caracteres)|
|`cancelSponsorAdSchema`|Cancelación con motivo opcional|
|`querySponsorAdsSchema`|Listado paginado con filtros.|

## Patrones de reutilización de esquemas

### Esquemas parciales para actualizaciones

Los esquemas de actualización a menudo reflejan los esquemas de creación con todos los campos opcionales:

```typescript
export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(companyStatus).optional(),
});
```

### Alias de esquema

Cuando dos operaciones tienen necesidades de validación idénticas:

```typescript
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1).max(255).transform(val => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

// Reuse for updates (identical validation)
export const updateItemCompanySchema = assignCompanyToItemSchema;
```

### Selección selectiva

Usando `.pick()` para crear esquemas de subconjunto:

```typescript
const validatedData = userValidationSchema
  .pick({ email: true, password: true })
  .parse(data);
```

## Uso en rutas API

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
