---
id: mappers-system
title: "Mappers System"
sidebar_label: "Mappers System"
sidebar_position: 48
---

# Mappers System

## Overview

The Mappers System provides pure, side-effect-free transformation functions that convert internal application data models into external CRM (Customer Relationship Management) payloads. Currently, it implements mappers for the Twenty CRM integration, converting `ClientProfile` and `Company` entities into Twenty-compatible `Person` and `Company` payloads with null-safe field mapping and required-field validation.

## Architecture

The mappers module lives in `lib/mappers/` and follows a strict separation-of-concerns pattern:

- **Mappers** are pure functions: no I/O, no database calls, no HTTP requests.
- **Services** (in `lib/services/`) consume mappers to prepare data before sending to external APIs.
- **Types** are imported from the database schema (`lib/db/schema`) and CRM type definitions (`lib/types/twenty-crm-entities.types`).

```
lib/mappers/
  |-- twenty-crm.mapper.ts
      |-- ensureExternalId()                (ID validation)
      |-- extractCityFromLocation()         (Location parsing)
      |-- mapClientProfileToPerson()        (ClientProfile -> TwentyPerson)
      |-- mapCompanyToTwentyCompany()       (Company -> TwentyCompany)
```

The data flow is:

```
Database Entity  -->  Mapper Function  -->  CRM Payload  -->  Service  -->  External API
(ClientProfile)     (mapClientProfile     (TwentyPerson)  (CRM Service)  (Twenty CRM)
                     ToPerson)
```

## API Reference

### Exports from `lib/mappers/twenty-crm.mapper.ts`

#### `ensureExternalId(id: string | undefined | null, entityType: string): string`

Validates that an entity ID is present and non-empty. This is a critical safety check ensuring that every CRM record has a valid `external_id` linking back to the local system.

**Parameters:**
- `id` -- The local entity ID (may be undefined or null)
- `entityType` -- Entity type name for error messages (e.g., `'ClientProfile'`)

**Returns:** Trimmed ID string

**Throws:** `Error` if the ID is missing, null, undefined, or an empty string.

#### `extractCityFromLocation(location: string | undefined | null): string | null`

Parses a free-form location string to extract the city name. Handles various formats by splitting on commas and taking the first part.

**Supported formats:**
- `"San Francisco"` --> `"San Francisco"`
- `"San Francisco, CA"` --> `"San Francisco"`
- `"San Francisco, CA, USA"` --> `"San Francisco"`

**Returns:** The city name or `null` if the location is empty/undefined.

#### `mapClientProfileToPerson(clientProfile: ClientProfile): TwentyPerson`

Maps a local `ClientProfile` database entity to a Twenty CRM `Person` payload.

**Field mapping:**

| ClientProfile Field | TwentyPerson Field | Required |
|--------------------|--------------------|----------|
| `id` | `external_id` | Yes (throws if missing) |
| `name` | `name` | Yes |
| `email` | `email` | Yes |
| `phone` | `phone` | Optional |
| `jobTitle` | `job_title` | Optional |
| `company` | `company_name` | Optional |
| `website` | `website` | Optional |
| `location` | `city` (extracted) | Optional |
| `accountType` | `account_type` | Optional |
| `plan` | `plan` | Optional |
| `totalSubmissions` | `total_submissions` | Optional |

**Returns:** A `TwentyPerson` object with only populated fields.

**Throws:** `Error` if `clientProfile.id` is missing.

#### `mapCompanyToTwentyCompany(company: Company): TwentyCompany`

Maps a local `Company` entity to a Twenty CRM `Company` payload.

**Field mapping:**

| Company Field | TwentyCompany Field | Required |
|--------------|---------------------|----------|
| `id` | `external_id` | Yes (throws if missing) |
| `name` | `name` | Yes |
| `domain` | `domain_name` | Optional |
| `website` | `website` | Optional |
| `status` | `status` | Optional |

**Returns:** A `TwentyCompany` object with only populated fields.

**Throws:** `Error` if `company.id` is missing.

## Implementation Details

**Null-safe mapping**: Optional fields use explicit `if` checks before assignment, ensuring that `null`, `undefined`, and empty values are never sent to the CRM. This keeps payloads clean and avoids overwriting existing CRM data with null values.

**External ID enforcement**: Every mapper calls `ensureExternalId()` as its first operation. This throws immediately on invalid IDs, following a fail-fast pattern that prevents orphaned records in the CRM.

**No mutation**: Mapper functions create new objects rather than modifying the input. The input `ClientProfile` or `Company` object is never altered.

**Optional field pruning**: Fields are only added to the output object when they have truthy values. This produces minimal payloads that only update non-null fields in the CRM.

**City extraction heuristic**: The `extractCityFromLocation()` function uses a simple comma-split approach. This handles the most common location formats (City, City + State, City + State + Country) but does not attempt to parse complex address formats.

## Configuration

No configuration is required. The mappers are pure functions that depend only on their input types. The Twenty CRM connection configuration (API URL, tokens) is managed by the integration service layer.

## Usage Examples

```typescript
import {
  mapClientProfileToPerson,
  mapCompanyToTwentyCompany,
  ensureExternalId,
  extractCityFromLocation,
} from '@/lib/mappers/twenty-crm.mapper';

// Map a client profile to a CRM person
const clientProfile = await db.query.clientProfiles.findFirst({
  where: eq(clientProfiles.id, userId),
});

const personPayload = mapClientProfileToPerson(clientProfile);
// {
//   external_id: "usr_abc123",
//   name: "Jane Doe",
//   email: "jane@example.com",
//   job_title: "CTO",
//   company_name: "Acme Corp",
//   city: "San Francisco",
//   plan: "premium",
// }

// Map a company to a CRM company
const company = await db.query.companies.findFirst({
  where: eq(companies.id, companyId),
});

const companyPayload = mapCompanyToTwentyCompany(company);
// {
//   external_id: "comp_xyz789",
//   name: "Acme Corp",
//   domain_name: "acme.com",
//   website: "https://acme.com",
//   status: "active",
// }

// Use utility functions independently
const city = extractCityFromLocation("Berlin, Germany");
// "Berlin"

const validId = ensureExternalId(user.id, "User");
// "usr_abc123" or throws Error
```

## Best Practices

- Always use the mapper functions instead of manually constructing CRM payloads to ensure consistent field naming and null safety.
- Handle the `Error` thrown by `ensureExternalId()` at the service layer; log it and skip the CRM sync for that record rather than crashing the entire batch.
- When adding new fields to a mapper, follow the existing pattern: check for truthiness before assigning to the output object.
- Write unit tests for mappers since they are pure functions with no dependencies, making them easy to test in isolation.
- If a new CRM integration is needed, create a new mapper file (e.g., `hubspot.mapper.ts`) in the same directory following the same patterns.

## Related Modules

- [Config Manager System](./config-manager-system) -- Integration configuration via `configService.integrations`
- [API Client Layer](/docs/template/architecture/api-client-layer) -- HTTP client used by CRM services
