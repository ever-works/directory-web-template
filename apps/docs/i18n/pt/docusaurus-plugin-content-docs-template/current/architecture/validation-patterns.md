---
id: validation-patterns
title: "Padrões de validação"
sidebar_label: "Padrões de validação"
sidebar_position: 21
---

# Padrões de validação

O modelo usa Zod para validação baseada em esquema em todos os limites da API. Os esquemas de validação definem formatos de dados, restrições, transformações e inferência de tipo em uma única fonte de verdade. Cada domínio possui seu próprio módulo de validação com esquemas para operações de criação, atualização e consulta.

## Visão geral da arquitetura

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

## Arquivos de origem

|Arquivo|Objetivo|
|------|---------|
|`lib/validations/auth.ts`|Esquemas de senha e autenticação|
|`lib/validations/item.ts`|Esquema de dados de localização do item|
|`lib/validations/client-item.ts`|Esquemas de criação/atualização/consulta de itens voltados para o cliente|
|`lib/validations/company.ts`|CRUD da empresa e esquemas de associação item-empresa|
|`lib/validations/sponsor-ad.ts`|Esquemas de ciclo de vida do anúncio patrocinador|
|`lib/validations/client-dashboard.ts`|Esquemas de parâmetros de consulta do painel|
|`lib/validations/user-location.ts`|Localização do usuário e configurações de privacidade|

## Padrões principais

### Padrão 1: Esquema + Tipo Inferido

Cada esquema exporta um tipo TypeScript correspondente via `z.infer`:

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

### Padrão 2: Transformar e Normalizar

Os esquemas usam `.transform()` para normalizar os dados de entrada:

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

### Padrão 3: restrições de enumeração

Os campos de status usam `z.enum()` com matrizes const para segurança de tipo:

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

### Padrão 4: parâmetros de consulta forçada

Os parâmetros de string de consulta de solicitações HTTP são forçados a partir de strings:

```typescript
export const querySponsorAdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(sponsorAdStatuses).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "startDate", "endDate", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

### Padrão 5: Transformação de string em número

Para parâmetros de consulta que chegam como strings, mas representam números:

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

### Padrão 6: Validação Cross-Field com Refine

Regras de validação complexas que abrangem vários campos:

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

### Padrão 7: Tipos de União

Campos que aceitam vários formatos:

```typescript
category: z.union([
  z.string().min(1, 'Category is required'),
  z.array(z.string().min(1)).min(1, 'At least one category is required'),
]).optional().nullable(),
```

## Esquemas de Domínio

### Autenticação

Validação de senha com múltiplas restrições de regex:

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Localização do item

Dados geográficos com coordenadas limitadas:

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

### Privacidade da localização do usuário

Configurações de privacidade baseadas em enum:

```typescript
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);
export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Envio de item do cliente

Esquema de criação completo com constantes de validação externas:

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

### Ciclo de vida do anúncio do patrocinador

Vários esquemas que cobrem todo o fluxo de trabalho do anúncio do patrocinador:

|Esquema|Objetivo|
|--------|---------|
|`createSponsorAdSchema`|Envio de novo anúncio de patrocinador|
|`updateSponsorAdSchema`|Atualização do administrador (status, datas, assinatura)|
|`approveSponsorAdSchema`|Aprovação do administrador|
|`rejectSponsorAdSchema`|Rejeição do administrador com motivo (10 a 500 caracteres)|
|`cancelSponsorAdSchema`|Cancelamento com motivo opcional|
|`querySponsorAdsSchema`|Listagem paginada com filtros|

## Padrões de reutilização de esquema

### Esquemas parciais para atualizações

Os esquemas de atualização geralmente refletem os esquemas de criação com todos os campos opcionais:

```typescript
export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(companyStatus).optional(),
});
```

### Aliasing de esquema

Quando duas operações têm necessidades de validação idênticas:

```typescript
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1).max(255).transform(val => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

// Reuse for updates (identical validation)
export const updateItemCompanySchema = assignCompanyToItemSchema;
```

### Colheita Seletiva

Usando `.pick()` para criar esquemas de subconjunto:

```typescript
const validatedData = userValidationSchema
  .pick({ email: true, password: true })
  .parse(data);
```

## Uso em rotas API

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
