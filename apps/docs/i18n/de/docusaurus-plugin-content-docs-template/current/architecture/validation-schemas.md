---
id: validation-schemas
title: Validierungsschemata
sidebar_label: Validierungsschemata
sidebar_position: 39
---

# Validierungsschemata

Die Vorlage verwendet Zod zur Laufzeitvalidierung über API-Routen, Serveraktionen und Formularübermittlungen hinweg. Schemata werden nach Domäne in `lib/validations/` organisiert und sowohl vom serverseitigen als auch vom clientseitigen Code referenziert.

## Dateistruktur

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

## Authentifizierungsschemata (`auth.ts`)

### Passwortschema

Ein gemeinsames Schema, das starke Passwortanforderungen durchsetzt:

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

Anforderungen:
- Mindestens 8 Zeichen
- Mindestens 1 Großbuchstabe
- Mindestens 1 Kleinbuchstabe
- Mindestens 1 Ziffer
- Mindestens 1 Sonderzeichen

## Artikelschemata (`item.ts`)

### Standortschema

Validiert geografische Standortdaten für Artikel. Alle Felder sind optional, da die Strenge durch die Site-Einstellungen gesteuert wird:

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

## Client-Artikelschemata (`client-item.ts`)

### Artikel erstellen

Schema für vom Kunden übermittelte Elemente mit erforderlichen Kernfeldern:

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

### Artikel aktualisieren

Erlaubt nur Felder, die Clients ändern dürfen (alle optional):

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

### Abfrage der Artikelliste

Validiert und transformiert Abfrageparameter für paginierte Artikellisten:

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

### Artikel-ID-Parameter

```ts
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

export type ItemIdParamInput = z.infer<typeof itemIdParamSchema>;
```

## Firmenschemata (`company.ts`)

### Unternehmen erstellen

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

### Unternehmen aktualisieren

Identisch mit `createCompanySchema`, aber mit einem Feld `id` und allen anderen Feldern optional:

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

### Artikel-Firmen-Vereinigung

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

## Benutzerstandortschemata (`user-location.ts`)

### Standortdatenschutz

```ts
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);

export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Standort aktualisieren

Validiert den Standort des Benutzerprofils mit einer feldübergreifenden Verfeinerung, um sicherzustellen, dass Breiten- und Längengrad zusammen bereitgestellt werden:

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

## Sponsor-Anzeigenschemata (`sponsor-ad.ts`)

### Status- und Intervallaufzählungen

```ts
export const sponsorAdStatuses = [
  "pending_payment", "pending", "rejected",
  "active", "expired", "cancelled",
] as const;

export const sponsorAdIntervals = ["weekly", "monthly"] as const;
```

### Erstellen Sie eine Sponsor-Anzeige

```ts
export const createSponsorAdSchema = z.object({
  itemSlug: z.string().min(1, "Item slug is required"),
  interval: z.enum(sponsorAdIntervals),
  paymentProvider: z.string().min(1, "Payment provider is required"),
});
```

### Sponsor-Anzeige aktualisieren (Admin)

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

### Genehmigen und ablehnen

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

### Abbrechen

```ts
export const cancelSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
  cancelReason: z.string().max(500).optional(),
});
```

### Fragen Sie Sponsoranzeigen ab

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

## Dashboard-Schemata (`client-dashboard.ts`)

```ts
export const dashboardStatsQuerySchema = z.object({
  // Reserved for future date range filters
});

export type DashboardStatsQueryInput = z.infer<typeof dashboardStatsQuerySchema>;
```

## Nutzungsmuster

### In API-Routen

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

### In React-Hook-Form

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

## Verwandte Dateien

- `lib/validations/auth.ts` – Passwortvalidierung
- `lib/validations/item.ts` – Artikelstandortschema
- `lib/validations/client-item.ts` – Schemata für kundenorientierte Elemente
- `lib/validations/client-dashboard.ts` – Dashboard-Abfrageschemata
- `lib/validations/company.ts` – Firmen- und Artikel-Firmen-Schemata
- `lib/validations/user-location.ts` – Benutzerstandortschemata
- `lib/validations/sponsor-ad.ts` – Lebenszyklusschemata für Sponsor-Anzeigen
- `lib/types/item.ts` - `ITEM_VALIDATION` Konstanten, die von Schemas verwendet werden
