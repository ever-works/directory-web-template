---
id: validation-schemas
title: Esquemas de validação
sidebar_label: Esquemas de validação
sidebar_position: 39
---

# Esquemas de validação

O modelo usa Zod para validação de tempo de execução em rotas de API, ações de servidor e envios de formulários. Os esquemas são organizados por domínio em `lib/validations/` e referenciados pelo código do lado do servidor e do lado do cliente.

## Estrutura de arquivo

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

## Esquemas de autenticação (`auth.ts`)

### Esquema de senha

Um esquema compartilhado que impõe requisitos de senha fortes:

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

Requisitos:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 dígito
- Pelo menos 1 caractere especial

## Esquemas de itens (`item.ts`)

### Esquema de localização

Valida dados de localização geográfica para itens. Todos os campos são opcionais, pois o rigor é controlado pelas configurações do site:

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

## Esquemas de itens do cliente (`client-item.ts`)

### Criar item

Esquema para itens enviados pelo cliente com campos principais obrigatórios:

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

### Atualizar item

Permite apenas campos que os clientes têm permissão para modificar (todos opcionais):

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

### Consulta de lista de itens

Valida e transforma parâmetros de consulta para listas de itens paginados:

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

### Parâmetro de ID do item

```ts
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

export type ItemIdParamInput = z.infer<typeof itemIdParamSchema>;
```

## Esquemas da Empresa (`company.ts`)

### Criar empresa

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

### Atualizar empresa

Idêntico a `createCompanySchema` mas com um campo `id` e todos os outros campos opcionais:

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

### Associação Item-Empresa

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

## Esquemas de localização do usuário (`user-location.ts`)

### Privacidade de localização

```ts
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);

export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Atualizar localização

Valida a localização do perfil do usuário com um refinamento entre campos, garantindo que a latitude e a longitude sejam fornecidas juntas:

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

## Esquemas de anúncios do patrocinador (`sponsor-ad.ts`)

### Enums de status e intervalo

```ts
export const sponsorAdStatuses = [
  "pending_payment", "pending", "rejected",
  "active", "expired", "cancelled",
] as const;

export const sponsorAdIntervals = ["weekly", "monthly"] as const;
```

### Criar anúncio de patrocinador

```ts
export const createSponsorAdSchema = z.object({
  itemSlug: z.string().min(1, "Item slug is required"),
  interval: z.enum(sponsorAdIntervals),
  paymentProvider: z.string().min(1, "Payment provider is required"),
});
```

### Atualizar anúncio do patrocinador (administrador)

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

### Aprovar e Rejeitar

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

### Cancelar

```ts
export const cancelSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
  cancelReason: z.string().max(500).optional(),
});
```

### Consultar anúncios do patrocinador

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

## Esquemas do painel (`client-dashboard.ts`)

```ts
export const dashboardStatsQuerySchema = z.object({
  // Reserved for future date range filters
});

export type DashboardStatsQueryInput = z.infer<typeof dashboardStatsQuerySchema>;
```

## Padrões de uso

### Em rotas de API

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

### No formulário React Hook

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

## Arquivos relacionados

- `lib/validations/auth.ts` - Validação de senha
- `lib/validations/item.ts` - Esquema de localização do item
- `lib/validations/client-item.ts` - Esquemas de itens voltados para o cliente
- `lib/validations/client-dashboard.ts` - Esquemas de consulta do painel
- `lib/validations/company.ts` - Esquemas empresa e empresa item
- `lib/validations/user-location.ts` - Esquemas de localização do usuário
- `lib/validations/sponsor-ad.ts` - Esquemas do ciclo de vida do anúncio patrocinador
- `lib/types/item.ts` - `ITEM_VALIDATION` constantes usadas por esquemas
