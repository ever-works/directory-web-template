---
id: validation-schemas
title: Schémas de validation
sidebar_label: Schémas de validation
sidebar_position: 39
---

# Schémas de validation

Le modèle utilise Zod pour la validation d'exécution sur les routes API, les actions du serveur et les soumissions de formulaires. Les schémas sont organisés par domaine dans `lib/validations/` et référencés par le code côté serveur et côté client.

## Structure du fichier

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

## Schémas d'authentification (`auth.ts`)

### Schéma de mot de passe

Un schéma partagé appliquant des exigences strictes en matière de mot de passe :

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

Exigences :
- Minimum 8 caractères
- Au moins 1 lettre majuscule
- Au moins 1 lettre minuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial

## Schémas d'articles (`item.ts`)

### Schéma de localisation

Valide les données de localisation géographique des éléments. Tous les champs sont facultatifs puisque la rigueur est contrôlée par les paramètres du site :

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

## Schémas d'éléments clients (`client-item.ts`)

### Créer un article

Schéma pour les éléments soumis par le client avec les champs principaux obligatoires :

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

### Mettre à jour l'élément

Autorise uniquement les champs que les clients sont autorisés à modifier (tous facultatifs) :

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

### Requête de liste d'articles

Valide et transforme les paramètres de requête pour les listes d'éléments paginés :

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

### Paramètre d'ID d'article

```ts
export const itemIdParamSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

export type ItemIdParamInput = z.infer<typeof itemIdParamSchema>;
```

## Schémas d'entreprise (`company.ts`)

### Créer une entreprise

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

### Mettre à jour la société

Identique à `createCompanySchema` mais avec un champ `id` et tous les autres champs facultatifs :

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

### Association article-entreprise

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

## Schémas de localisation des utilisateurs (`user-location.ts`)

### Confidentialité de l'emplacement

```ts
export const locationPrivacyValues = ['private', 'city', 'exact'] as const;
export const locationPrivacySchema = z.enum(locationPrivacyValues);

export type LocationPrivacy = z.infer<typeof locationPrivacySchema>;
```

### Mettre à jour l'emplacement

Valide l'emplacement du profil utilisateur avec un affinement multi-champ garantissant que la latitude et la longitude sont fournies ensemble :

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

## Schémas de publicité de sponsoring (`sponsor-ad.ts`)

### Énumérations d'état et d'intervalle

```ts
export const sponsorAdStatuses = [
  "pending_payment", "pending", "rejected",
  "active", "expired", "cancelled",
] as const;

export const sponsorAdIntervals = ["weekly", "monthly"] as const;
```

### Créer une annonce de sponsor

```ts
export const createSponsorAdSchema = z.object({
  itemSlug: z.string().min(1, "Item slug is required"),
  interval: z.enum(sponsorAdIntervals),
  paymentProvider: z.string().min(1, "Payment provider is required"),
});
```

### Mettre à jour l'annonce du sponsor (administrateur)

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

### Approuver et rejeter

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

### Annuler

```ts
export const cancelSponsorAdSchema = z.object({
  id: z.string().uuid("Invalid sponsor ad ID"),
  cancelReason: z.string().max(500).optional(),
});
```

### Interroger les annonces des sponsors

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

## Schémas de tableau de bord (`client-dashboard.ts`)

```ts
export const dashboardStatsQuerySchema = z.object({
  // Reserved for future date range filters
});

export type DashboardStatsQueryInput = z.infer<typeof dashboardStatsQuerySchema>;
```

## Modèles d'utilisation

### Dans les routes API

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

### Sous forme de crochet de réaction

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

## Fichiers associés

- `lib/validations/auth.ts` - Validation du mot de passe
- `lib/validations/item.ts` - Schéma de localisation des articles
- `lib/validations/client-item.ts` - Schémas d'éléments destinés au client
- `lib/validations/client-dashboard.ts` - Schémas de requête du tableau de bord
- `lib/validations/company.ts` - Schémas de société et d'article-société
- `lib/validations/user-location.ts` - Schémas de localisation des utilisateurs
- `lib/validations/sponsor-ad.ts` – Schémas du cycle de vie des annonces sponsorisées
- `lib/types/item.ts` - `ITEM_VALIDATION` constantes utilisées par les schémas
