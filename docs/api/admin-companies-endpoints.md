---
id: admin-companies-endpoints
title: Admin Companies API Endpoints
sidebar_label: Admin Companies
sidebar_position: 32
---

# Admin Companies API Endpoints

The Admin Companies API provides management endpoints for company records. Companies represent organizations associated with listed items. The API supports full CRUD operations with Zod-based validation, domain/slug uniqueness enforcement, and optional CRM synchronization on updates.

## Route Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/companies` | Admin | List companies (paginated, searchable) |
| `POST` | `/api/admin/companies` | Admin | Create a new company |
| `GET` | `/api/admin/companies/{id}` | Admin | Get a single company by UUID |
| `PUT` | `/api/admin/companies/{id}` | Admin | Update a company |
| `DELETE` | `/api/admin/companies/{id}` | Admin | Permanently delete a company |

## Authentication

All company endpoints verify the session has admin privileges:

```typescript
const session = await auth();
if (!session?.user?.isAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## Endpoints

### GET `/api/admin/companies`

Returns a paginated list of companies with search and status filtering. Also returns global counts of active and inactive companies regardless of filters applied.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | `1` | Page number (must be >= 1) |
| `limit` | integer | `10` | Items per page (1--100) |
| `q` | string | -- | Search by name or domain (case-insensitive) |
| `status` | string | -- | Filter: `"active"` or `"inactive"` |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corporation",
        "website": "https://acme.com",
        "domain": "acme.com",
        "slug": "acme-corporation",
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10,
    "activeCount": 40,
    "inactiveCount": 7
  }
}
```

The `meta.activeCount` and `meta.inactiveCount` values reflect global totals and are not affected by the `q` or `status` filters. This allows the UI to show tab counts alongside filtered results.

### POST `/api/admin/companies`

Creates a new company record. Request data is validated with Zod schema (`createCompanySchema`). Domain and slug values are normalized to lowercase. Uniqueness is checked for both `domain` and `slug` before insertion.

**Request Body:**

```json
{
  "name": "Acme Corporation",
  "website": "https://acme.com",
  "domain": "acme.com",
  "slug": "acme-corporation",
  "status": "active"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Company name (1--255 characters) |
| `website` | string (URI) | No | Full website URL |
| `domain` | string | No | Normalized domain (max 255 characters) |
| `slug` | string | No | URL-friendly identifier (`^[a-z0-9-]+$`, max 255) |
| `status` | string | No | `"active"` or `"inactive"` (default: `"active"`) |

**Validation:** Uses Zod schema validation. On failure, returns detailed field-level errors:

```json
{
  "error": "Validation error",
  "details": [
    { "field": "name", "message": "Company name is required" }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-20T16:45:00.000Z",
    "updatedAt": "2024-01-20T16:45:00.000Z"
  }
}
```

### GET `/api/admin/companies/{id}`

Retrieves a single company by its UUID.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Company unique identifier |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation",
    "website": "https://acme.com",
    "domain": "acme.com",
    "slug": "acme-corporation",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:45:00.000Z"
  }
}
```

### PUT `/api/admin/companies/{id}`

Updates an existing company. Supports partial updates -- only provided fields are changed. Validated with `updateCompanySchema`. Domain and slug uniqueness is re-verified when those fields change. After a successful update, the company data is optionally synced to a CRM system.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Company unique identifier |

**Request Body:**

```json
{
  "name": "Acme Corporation Updated",
  "website": "https://acme.com",
  "status": "active"
}
```

All fields are optional. Only supplied fields will be updated.

**CRM Synchronization:**

When `TWENTY_CRM_ENABLED` is not set to `"false"`, the updated company is automatically synced to the Twenty CRM system. This sync is non-blocking -- if it fails, the API still returns success for the database update:

```typescript
const syncService = createTwentyCrmSyncServiceFromEnv();
const companyPayload = mapCompanyToTwentyCompany(company);
await syncService.upsertCompany(companyPayload);
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Acme Corporation Updated",
    "status": "active",
    "updatedAt": "2024-01-20T16:30:00.000Z"
  }
}
```

### DELETE `/api/admin/companies/{id}`

Permanently deletes a company. This is a hard delete -- the record is removed from the database. Associated item-company links are removed via CASCADE constraints.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string (UUID) | Company unique identifier |

**Response (200):**

```json
{
  "success": true,
  "message": "Company deleted successfully"
}
```

:::caution
Company deletion is permanent and cannot be undone. All item associations for the deleted company will be removed through database CASCADE rules.
:::

## Validation Rules

Company data is validated using Zod schemas defined in `lib/validations/company.ts`:

| Field | Rule |
|-------|------|
| `name` | Required, 1--255 characters |
| `website` | Optional, must be valid URI format |
| `domain` | Optional, max 255 characters, normalized to lowercase |
| `slug` | Optional, max 255 characters, lowercase alphanumeric and hyphens only |
| `status` | Optional, must be `"active"` or `"inactive"` |

## Error Codes

| Status | Error | Cause |
|--------|-------|-------|
| `400` | Validation error | Zod schema validation failure (includes field details) |
| `400` | Invalid page parameter | Page is not a positive integer |
| `400` | Invalid limit parameter | Limit outside 1--100 range |
| `401` | Unauthorized | Missing or non-admin session |
| `404` | Company not found | No company with the given UUID |
| `409` | Company with domain already exists | Domain uniqueness violation |
| `409` | Company with slug already exists | Slug uniqueness violation |
| `500` | Failed to create/update/delete company | Server or database error |

## Related Documentation

- [Admin Endpoints Overview](./admin-endpoints.md)
- [Response Patterns](./response-patterns.md)
- [Request Validation](./request-validation.md)
