---
id: types-overview
title: Type System Overview
sidebar_label: Overview
sidebar_position: 0
---

# Type System Overview

The template uses a comprehensive TypeScript type system located in `lib/types/`. These type definitions serve as the single source of truth for data structures used across API routes, services, repositories, and UI components.

## Type Files

The `lib/types/` directory contains the following modules:

| File | Description |
|------|-------------|
| `item.ts` | Item data, CRUD requests, list options, validation constants, and status definitions |
| `user.ts` | Admin user data, authentication types, Zod validation schemas, and helper functions |
| `profile.ts` | Public user profile structure including social links, skills, portfolio, and submissions |
| `category.ts` | Category data, CRUD requests, list options, and validation constants |
| `comment.ts` | Comment types inferred from the database schema, including user-enriched comments |
| `vote.ts` | Vote schema (Zod), response types, error types, and client-side vote state |
| `survey.ts` | Survey and survey response types, filter options, and status/type enums |
| `location.ts` | Location settings, geo query types, map provider types, and coordinate data |
| `sponsor-ad.ts` | Sponsor advertisement types including requests, responses, stats, and dashboard data |
| `client.ts` | Client profile types for the client-facing portal, including dashboard and stats |
| `client-item.ts` | Client-side item submission types with engagement metrics and status filters |
| `role.ts` | Role and permission types for the RBAC system |
| `tag.ts` | Tag data, CRUD requests, list options, and validation constants |
| `twenty-crm-config.types.ts` | Twenty CRM integration configuration and connection testing types |
| `twenty-crm-entities.types.ts` | Twenty CRM entity types for Person and Company records |
| `twenty-crm-errors.types.ts` | Structured error types, error codes, and type guards for CRM errors |
| `twenty-crm-sync.types.ts` | Upsert operations, cache entries, and sync-related types |

## Architecture Patterns

### Consistent CRUD Pattern

Most entity types follow a consistent pattern of interfaces:

```typescript
// Core data interface
interface EntityData {
  id: string;
  name: string;
  // ... entity-specific fields
}

// Create request (input for POST endpoints)
interface CreateEntityRequest {
  // Required fields for creation
}

// Update request (input for PUT/PATCH endpoints)
interface UpdateEntityRequest extends Partial<CreateEntityRequest> {
  id: string; // ID is always required for updates
}

// List response (paginated)
interface EntityListResponse {
  entities: EntityData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Single entity response
interface EntityResponse {
  success: boolean;
  entity?: EntityData;
  error?: string;
}

// List/query options
interface EntityListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}
```

### Validation Constants

Each entity module exports a validation constants object using `as const` for type safety:

```typescript
export const ENTITY_VALIDATION = {
  NAME_MIN_LENGTH: 3,
  NAME_MAX_LENGTH: 100,
  // ... other constraints
} as const;
```

These constants are used in both server-side validation and client-side form validation, ensuring consistent rules across the stack.

### Discriminated Union Responses

API response types use discriminated unions for type-safe error handling:

```typescript
type ApiResponse =
  | { success: true; data: SomeData; message?: string }
  | { success: false; error: string };
```

This pattern is used by `SponsorAdResponse`, `ClientResponse`, `ClientListResponse`, and others.

### Zod Schema Integration

Several modules use Zod for runtime validation alongside TypeScript types:

```typescript
import { z } from 'zod';

export const entitySchema = z.object({
  id: z.string(),
  name: z.string().min(3).max(100),
});

// Derive TypeScript type from Zod schema
export type Entity = z.infer<typeof entitySchema>;
```

This is used in `vote.ts` (for the vote schema) and `user.ts` (for user validation).

### Extended Types with Relationships

Types that include related data use the `extends` keyword:

```typescript
// Base type
interface EntityData {
  id: string;
  name: string;
}

// Extended type with related user data
interface EntityWithUser extends EntityData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// Extended type with count (for statistics)
interface EntityWithCount extends EntityData {
  count?: number;
}
```

## Import Conventions

Types are imported using the `type` keyword for type-only imports:

```typescript
import type { ItemData, ItemListResponse } from '@/lib/types/item';
import type { MapProvider } from '@/lib/types/location';
```

This ensures types are erased at compile time and do not affect bundle size.

## Configuration vs Runtime Types

The location module demonstrates a pattern used for configuration:

- **Config types** use `snake_case` to match YAML configuration files
- **Runtime types** use `camelCase` for idiomatic TypeScript usage
- A mapping function converts between the two formats

```typescript
// YAML config (snake_case)
interface LocationConfigSettings {
  distance_filter_enabled?: boolean;
  default_radius_km?: number;
}

// Runtime (camelCase)
interface LocationSettings {
  distanceFilterEnabled: boolean;
  defaultRadiusKm: number;
}

// Converter function
function mapLocationConfigToRuntime(
  config?: LocationConfigSettings
): LocationSettings;
```

## Status Enums and Labels

Status values are defined as const objects with corresponding label and color mappings:

```typescript
export const ITEM_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type ItemStatus =
  (typeof ITEM_STATUSES)[keyof typeof ITEM_STATUSES];

export const ITEM_STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
} as const;

export const ITEM_STATUS_COLORS = {
  draft: 'gray',
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
} as const;
```

## Database-Inferred Types

Some types are inferred directly from the Drizzle ORM schema:

```typescript
import { comments } from '@/lib/db/schema';

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

This approach ensures types stay in sync with database migrations automatically.

## Related Documentation

- [Item Types](./item-types.md) - Core item data structures
- [User Types](./user-types.md) - User authentication and profile types
- [Category Types](./category-types.md) - Category management types
- [Comment Types](./comment-types.md) - Comment and review types
- [Vote Types](./vote-types.md) - Voting system types
- [Survey Types](./survey-types.md) - Survey and response types
- [Location Types](./location-types.md) - Geolocation and map types
- [Sponsor Ad Types](./sponsor-ad-types.md) - Sponsorship and advertising types
- [CRM Types](./crm-types.md) - Twenty CRM integration types
