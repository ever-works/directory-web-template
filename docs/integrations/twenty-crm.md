---
id: twenty-crm
title: Twenty CRM Integration
sidebar_label: Twenty CRM
sidebar_position: 0
---

# Twenty CRM Integration

The Ever Works template includes a full integration with [Twenty CRM](https://twenty.com), an open-source CRM platform. This integration synchronizes client and company data between your directory and Twenty CRM, enabling you to manage contacts, track interactions, and build relationships with directory participants.

## Architecture Overview

The CRM integration is built around five dedicated service files that separate concerns cleanly:

| Service | File | Responsibility |
|---------|------|----------------|
| **REST Client** | `lib/services/twenty-crm-rest-client.service.ts` | HTTP communication with retry logic and error handling |
| **API Service** | `lib/services/twenty-crm-api.service.ts` | Connection testing and reachability checks |
| **Sync Service** | `lib/services/twenty-crm-sync.service.ts` | Upsert operations with hybrid caching |
| **Config DB Service** | `lib/services/twenty-crm-config-db.service.ts` | Database CRUD for CRM configuration |
| **Sync Factory** | `lib/services/twenty-crm-sync-factory.ts` | Service instantiation and dependency wiring |

## Configuration

### Environment Variables

```bash
# .env.local
TWENTY_CRM_BASE_URL=https://your-twenty-instance.com
TWENTY_CRM_API_KEY=your-api-key-here
TWENTY_CRM_ENABLED=true
TWENTY_CRM_SYNC_MODE=direct_crm   # disabled | platform | direct_crm
```

These variables are validated at startup through the integrations config schema located in `lib/config/schemas/integrations.schema.ts`. The schema uses Zod and supports three sync modes:

- **disabled** -- CRM sync is off (default)
- **platform** -- Sync through the Ever Works Platform API
- **direct_crm** -- Direct REST API calls to your Twenty CRM instance

### Admin UI Configuration

CRM settings can also be managed through the admin dashboard at `/admin/settings`. The `TwentyCrmConfigDbService` persists configuration to the database, allowing runtime changes without redeployment. The admin can:

- Set or update the base URL and API key
- Toggle the integration on or off
- Switch sync modes
- Test the connection

## REST Client (`TwentyCrmRestClient`)

The REST client provides a robust HTTP layer on top of the Twenty CRM API with the following features:

- **Automatic retries** with exponential backoff (default: 3 retries, 1s initial backoff, 30s max)
- **Timeout handling** (default: 10s per request)
- **Idempotency keys** generated automatically for POST and PUT requests
- **Bearer token authentication** via the configured API key
- **Error classification** into typed error codes: `AUTH_ERROR`, `RATE_LIMIT`, `TIMEOUT`, `NETWORK_ERROR`, `NOT_FOUND`, `SERVER_ERROR`, `VALIDATION_ERROR`

Retryable HTTP status codes: `408`, `429`, `500`, `502`, `503`, `504`.

```typescript
import { TwentyCrmRestClient } from '@/lib/services/twenty-crm-rest-client.service';

const client = new TwentyCrmRestClient({
  baseUrl: 'https://api.twenty.com',
  apiKey: 'your-api-key',
  timeout: 10000,
  maxRetries: 3,
});

const response = await client.get<CompanyData>('/rest/companies');
if (response.success) {
  console.log(response.data);
} else {
  console.error(response.error.code, response.error.message);
}
```

## Sync Service (`TwentyCrmSyncService`)

The sync service implements idempotent upsert operations with a three-tier lookup strategy:

1. **Memory cache** -- In-process Map with configurable TTL (default: 5 minutes)
2. **Database** -- Persistent integration mapping table via `IntegrationMappingRepository`
3. **API** -- Direct query to Twenty CRM filtered by `external_id`

### Upsert Companies

```typescript
const result = await syncService.upsertCompany({
  external_id: 'company_123',
  name: 'Acme Corporation',
  website: 'https://acme.com',
});
// result.id        -> CRM UUID
// result.created   -> boolean
// result.updated   -> boolean
```

### Upsert Persons

Persons can optionally be linked to companies. If a `company_external_id` is provided and the company does not yet exist, it is created automatically:

```typescript
const result = await syncService.upsertPerson({
  external_id: 'user_456',
  name: 'John Doe',
  email: 'john@acme.com',
  company_external_id: 'company_123',
  company_name: 'Acme Corporation',
});
```

### Batch Operations

For bulk syncing, use the batch methods which process entries in parallel and persist all mappings in a single database transaction:

```typescript
const companies = await syncService.upsertManyCompanies([
  { external_id: 'c1', name: 'Company A' },
  { external_id: 'c2', name: 'Company B' },
]);

const persons = await syncService.upsertManyPersons([
  { external_id: 'p1', name: 'Alice', email: 'alice@a.com' },
  { external_id: 'p2', name: 'Bob', email: 'bob@b.com' },
]);
```

### Conflict Handling

The sync service handles HTTP 409 conflicts with automatic retry logic:

- On **update conflict** (record was deleted): invalidates cache, re-lookups, and retries
- On **create conflict** (record already exists): re-fetches the CRM ID, then updates instead
- Default: 3 retries with exponential backoff (100ms base delay)

## API Service (`TwentyCrmApiService`)

Used for connection testing and validation from the admin settings page:

```typescript
const apiService = new TwentyCrmApiService();

// Full connection test (requires valid API key)
const result = await apiService.testConnection(baseUrl, apiKey);
// { ok: true, latencyMs: 142, message: 'Successfully connected' }

// Basic reachability check (no auth required)
const reachable = await apiService.isReachable(baseUrl);
```

## Config DB Service (`TwentyCrmConfigDbService`)

Manages the single-row CRM configuration in the database:

| Method | Description |
|--------|-------------|
| `getConfig()` | Retrieves current configuration or null |
| `createConfig(data, userId)` | Creates initial configuration |
| `updateConfig(id, data, userId)` | Updates existing configuration |
| `exists()` | Checks if any configuration exists |

Configuration fields: `baseUrl`, `apiKey`, `enabled`, `syncMode`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.

## Factory (`createTwentyCrmSyncService`)

Two factory functions simplify service creation:

```typescript
// From explicit config
const service = createTwentyCrmSyncService({
  baseUrl: 'https://api.twenty.com',
  apiKey: 'key',
});

// From environment variables (reads TWENTY_CRM_BASE_URL, TWENTY_CRM_API_KEY)
const service = createTwentyCrmSyncServiceFromEnv();
```

## Field Mapping

The integration maps Ever Works entities to Twenty CRM objects:

| Ever Works | Twenty CRM | Endpoint |
|-----------|------------|----------|
| Client (user profile) | Person | `/rest/people` |
| Company | Company | `/rest/companies` |

Key field mappings:

- `external_id` -- Ever Works user or company ID (used for idempotent upserts)
- `name` -- Display name
- `email` -- Contact email (persons only)
- `website` -- Company website URL
- `company_id` -- CRM-internal company link (auto-resolved from `company_external_id`)

## Error Handling

All CRM errors use a typed error system defined in `lib/types/twenty-crm-errors.types.ts`:

| Error Code | Description | Retryable |
|-----------|-------------|-----------|
| `AUTH_ERROR` | Invalid API key (401/403) | No |
| `RATE_LIMIT` | Rate limit exceeded (429) | Yes |
| `TIMEOUT` | Request timed out | Yes |
| `NETWORK_ERROR` | Cannot reach server | Yes |
| `NOT_FOUND` | Resource not found (404) | No |
| `SERVER_ERROR` | CRM server error (5xx) | Yes |
| `VALIDATION_ERROR` | Invalid request data (4xx) | No |
| `OPERATION_FAILED` | Max retries exceeded | No |

## Related Files

- `lib/services/twenty-crm-*.ts` -- All five CRM services
- `lib/config/twenty-crm.config.ts` -- Default constants (timeouts, retries, backoff)
- `lib/config/schemas/integrations.schema.ts` -- Zod validation schemas
- `lib/types/twenty-crm-*.types.ts` -- TypeScript type definitions
- `lib/utils/twenty-crm-client.utils.ts` -- Utility functions (idempotency keys, backoff calculation)
- `lib/repositories/integration-mapping.repository.ts` -- Database mapping persistence
