---
id: validation-service
title: "Validation Service"
sidebar_label: "Validation Service"
sidebar_position: 15
---

# Validation Service

The template uses **Zod** as its validation library throughout the stack. Validation schemas are centralized in `lib/validations/` and used for both server-side API validation and client-side form validation via `react-hook-form` with `@hookform/resolvers`.

## Architecture Overview

Validation schemas are organized by domain in `lib/validations/`:

| File | Domain |
|------|--------|
| `lib/validations/auth.ts` | Authentication (password rules) |
| `lib/validations/item.ts` | Item location data |
| `lib/validations/client-item.ts` | Client item CRUD and list queries |
| `lib/validations/client-dashboard.ts` | Dashboard query parameters |
| `lib/validations/company.ts` | Company CRUD and item associations |
| `lib/validations/sponsor-ad.ts` | Sponsor advertisement management |
| `lib/validations/user-location.ts` | User profile location settings |

Additional validation utilities live in `lib/utils/`:

| File | Purpose |
|------|---------|
| `lib/utils/email-validation.ts` | ReDoS-safe email validation |
| `lib/utils/pagination-validation.ts` | Shared pagination parameter validation |
| `lib/utils/slug.ts` | URL slug generation and reversal |

## Authentication Validation

The `lib/validations/auth.ts` file defines the shared password schema used across registration, login, and password reset flows:

```ts
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
```

Password requirements enforced:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

## Item Validation

### Location Schema

The `lib/validations/item.ts` file defines location data validation:

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
```

All fields are optional because validation strictness is driven by feature flags (e.g., `requireLocationOnSubmit`).

### Client Item Schemas

The `lib/validations/client-item.ts` file defines schemas for client-facing item operations:

**Create Item:**

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
```

**Update Item:**

```ts
export const clientUpdateItemSchema = z.object({
  name: z.string().min(...).max(...).optional(),
  description: z.string().min(...).max(...).optional(),
  source_url: z.string().url('Invalid URL format').optional(),
  category: z.union([...]).optional(),
  tags: z.array(z.string().min(1)).optional(),
  icon_url: z.string().url('Invalid icon URL format').optional().or(z.literal('')),
  location: locationSchema,
});
```

**List Query Parameters:**

```ts
export const clientItemsListQuerySchema = z.object({
  page: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .refine(val => !Number.isNaN(val))
    .refine(val => val >= 1),
  limit: z.string().optional()
    .transform(val => (val ? parseInt(val, 10) : 10))
    .refine(val => val >= 1 && val <= 100),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).optional().default('all'),
  search: z.string().max(100, 'Search query is too long').optional(),
  sortBy: z.enum(['name', 'updated_at', 'status', 'submitted_at']).optional().default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  deleted: z.string().optional().transform(val => val === 'true'),
});
```

Note the use of `.transform()` to convert string query parameters to their proper types.

## Company Validation

The `lib/validations/company.ts` file provides schemas for company management:

```ts
export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
  domain: z.string().max(255).optional()
    .transform((val) => val?.toLowerCase().trim() || undefined),
  slug: z.string().max(255).optional()
    .transform((val) => val?.toLowerCase().trim() || undefined)
    .refine(
      (val) => !val || /^[a-z0-9-]+$/.test(val),
      { message: 'Slug must contain only lowercase letters, numbers, and hyphens' }
    ),
  status: z.enum(['active', 'inactive']).default('active'),
});
```

The slug field demonstrates combining `.transform()` for normalization with `.refine()` for custom validation.

### Item-Company Association

```ts
export const assignCompanyToItemSchema = z.object({
  itemSlug: z.string().min(1, 'Item slug is required').max(255)
    .transform((val) => val.toLowerCase().trim()),
  companyId: z.string().uuid('Invalid company ID format'),
});
```

## User Location Validation

The `lib/validations/user-location.ts` file validates user profile location settings with cross-field validation:

```ts
export const updateLocationSchema = z
  .object({
    defaultLatitude: z.number().min(-90).max(90).nullable().optional(),
    defaultLongitude: z.number().min(-180).max(180).nullable().optional(),
    defaultCity: z.string().max(200).nullable().optional(),
    defaultCountry: z.string().max(100).nullable().optional(),
    locationPrivacy: z.enum(['private', 'city', 'exact']).optional(),
  })
  .refine(
    (data) => {
      const hasLat = data.defaultLatitude != null;
      const hasLng = data.defaultLongitude != null;
      return hasLat === hasLng;
    },
    { message: 'Both latitude and longitude must be provided together' }
  );
```

The `.refine()` at the object level ensures latitude and longitude are either both present or both absent.

## Sponsor Ad Validation

The `lib/validations/sponsor-ad.ts` file shows schemas for complex status-driven entities:

```ts
export const sponsorAdStatuses = [
  'pending_payment', 'pending', 'rejected',
  'active', 'expired', 'cancelled',
] as const;

export const createSponsorAdSchema = z.object({
  itemSlug: z.string().min(1, 'Item slug is required'),
  interval: z.enum(['weekly', 'monthly']),
  paymentProvider: z.string().min(1, 'Payment provider is required'),
});

export const rejectSponsorAdSchema = z.object({
  id: z.string().uuid('Invalid sponsor ad ID'),
  rejectionReason: z.string()
    .min(10, 'Please provide a reason (minimum 10 characters)')
    .max(500, 'Rejection reason is too long (maximum 500 characters)'),
});
```

## Email Validation

The `lib/utils/email-validation.ts` file provides ReDoS-safe email validation:

```ts
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length < 5 || email.length > 254) {
    return false;
  }
  const atIndex = email.indexOf('@');
  if (atIndex === -1 || atIndex === 0 || atIndex === email.length - 1) {
    return false;
  }
  // Split and validate local + domain parts individually
  // ...checks for valid characters, domain structure, part lengths
  return true;
}
```

This function avoids regex-based catastrophic backtracking by validating email structure procedurally.

## Pagination Validation

The `lib/utils/pagination-validation.ts` file provides reusable validation for API pagination:

```ts
export function validatePaginationParams(
  searchParams: URLSearchParams
): PaginationParams | PaginationError {
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(page) || page < 1) {
    return { error: 'Invalid page parameter.', status: 400 };
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return { error: 'Invalid limit parameter.', status: 400 };
  }
  return { page, limit };
}
```

## Using Schemas in API Routes

Validation schemas are used in API route handlers for request validation:

```ts
import { clientCreateItemSchema } from '@/lib/validations/client-item';

export async function POST(request: Request) {
  const body = await request.json();
  const result = clientCreateItemSchema.safeParse(body);

  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    );
  }

  // result.data is fully typed
  const item = await createItem(result.data);
  return Response.json(item, { status: 201 });
}
```

## Using Schemas with React Hook Form

Schemas integrate with `react-hook-form` through the Zod resolver:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientCreateItemSchema, ClientCreateItemInput } from '@/lib/validations/client-item';

function ItemForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientCreateItemInput>({
    resolver: zodResolver(clientCreateItemSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  );
}
```

## Type Inference

All schemas export inferred TypeScript types for end-to-end type safety:

```ts
export type ClientCreateItemInput = z.infer<typeof clientCreateItemSchema>;
export type ClientUpdateItemInput = z.infer<typeof clientUpdateItemSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
```

## Related Files

| File | Description |
|------|-------------|
| `lib/validations/auth.ts` | Password validation schema |
| `lib/validations/item.ts` | Item location schema |
| `lib/validations/client-item.ts` | Client item CRUD schemas |
| `lib/validations/company.ts` | Company management schemas |
| `lib/validations/sponsor-ad.ts` | Sponsor ad schemas |
| `lib/validations/user-location.ts` | User location settings schema |
| `lib/utils/email-validation.ts` | ReDoS-safe email validation |
| `lib/utils/pagination-validation.ts` | Pagination parameter validation |
