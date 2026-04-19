---
id: validation-patterns
title: "Validatiepatronen"
sidebar_label: "Validatiepatronen"
sidebar_position: 21
---

# Validatiepatronen

De sjabloon gebruikt Zod voor schemagebaseerde validatie over alle API-grenzen heen. Validatieschema's definiëren datavormen, beperkingen, transformaties en type-inferentie in één enkele bron van waarheid. Elk domein heeft zijn eigen validatiemodule met schema's voor het maken, bijwerken en opvragen van bewerkingen.

## Architectuuroverzicht

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

## Bronbestanden

|Bestand|Doel|
|------|---------|
|`lib/validations/auth.ts`|Wachtwoord- en authenticatieschema's|
|`lib/validations/item.ts`|Gegevensschema voor artikellocatie|
|`lib/validations/client-item.ts`|Klantgerichte itemschema's maken/bijwerken/query's|
|`lib/validations/company.ts`|Bedrijfs-CRUD- en item-bedrijf-associatieschema's|
|`lib/validations/sponsor-ad.ts`|Sponsor levenscyclusschema's van advertenties|
|`lib/validations/client-dashboard.ts`|Parameterschema's voor dashboardquery's|
|`lib/validations/user-location.ts`|Gebruikerslocatie en privacy-instellingen|

## Kernpatronen

### Patroon 1: Schema + Afgeleid type

Elk schema exporteert een corresponderend TypeScript-type via `z.infer`:

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

### Patroon 2: Transformeren en normaliseren

Schema's gebruiken `.transform()` om invoergegevens te normaliseren:

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

### Patroon 3: Beperkingen opsommen

Statusvelden gebruiken `z.enum()` met const-arrays voor typeveiligheid:

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

### Patroon 4: Gedwongen queryparameters

Queryreeksparameters van HTTP-verzoeken worden afgedwongen vanuit tekenreeksen:

```typescript
export const querySponsorAdsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(sponsorAdStatuses).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "startDate", "endDate", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
```

### Patroon 5: Transformatie van tekenreeks naar nummer

Voor queryparameters die binnenkomen als tekenreeksen maar getallen vertegenwoordigen:

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

### Patroon 6: Veldoverschrijdende validatie met Verfijnen

Complexe validatieregels die meerdere velden bestrijken:

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

### Patroon 7: Union-typen

Velden die meerdere formaten accepteren:

```typescript
category: z.union([
  z.string().min(1, 'Category is required'),
  z.array(z.string().min(1)).min(1, 'At least one category is required'),
]).optional().nullable(),
```

## Domeinschema's

### Authenticatie

Wachtwoordvalidatie met meerdere regex-beperkingen:

```typescript
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");
```

### Artikellocatie

Geografische gegevens met begrensde coördinaten:

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

### Privacy van gebruikerslocatie

Op Enum gebaseerde privacy-instellingen:

```typescript
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);
export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Inzending van klantitems

Volledig schema maken met externe validatieconstanten:

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

### Levenscyclus van sponsoradvertenties

Meerdere schema's die de volledige workflow voor sponsoradvertenties bestrijken:

|Schema|Doel|
|--------|---------|
|`createSponsorAdSchema`|Nieuwe sponsoradvertentie-inzending|
|`updateSponsorAdSchema`|Beheerdersupdate (status, datums, abonnement)|
|`approveSponsorAdSchema`|Goedkeuring door beheerder|
|`rejectSponsorAdSchema`|Afwijzing door beheerder met reden (10-500 tekens)|
|`cancelSponsorAdSchema`|Annulering met optionele reden|
|`querySponsorAdsSchema`|Gepagineerde lijst met filters|

## Schemapatronen voor hergebruik

### Gedeeltelijke schema's voor updates

Updateschema's weerspiegelen vaak schema's waarbij alle velden optioneel zijn:

```typescript
export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().or(z.literal("")),
  status: z.enum(companyStatus).optional(),
});
```

### Schema-aliasing

Wanneer twee bewerkingen identieke validatiebehoeften hebben:

```typescript
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1).max(255).transform(val => val.toLowerCase().trim()),
  companyId: z.string().uuid("Invalid company ID format"),
});

// Reuse for updates (identical validation)
export const updateItemCompanySchema = assignCompanyToItemSchema;
```

### Selectief plukken

`.pick()` gebruiken om subsetschema's te maken:

```typescript
const validatedData = userValidationSchema
  .pick({ email: true, password: true })
  .parse(data);
```

## Gebruik in API-routes

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
