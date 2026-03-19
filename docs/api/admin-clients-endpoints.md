---
id: admin-clients-endpoints
title: Admin Clients API Endpoints
sidebar_label: Admin Clients
sidebar_position: 38
---

# Admin Clients API Endpoints

The Clients API provides endpoints for managing client profiles including creation, updates, advanced search, bulk operations, dashboard analytics, and comprehensive statistics. Clients represent end-user profiles linked to authentication accounts. All endpoints require admin authentication.

## Base Path

```
/api/admin/clients
```

## Route Summary

| Method   | Path                                    | Auth  | Description                          |
| -------- | --------------------------------------- | ----- | ------------------------------------ |
| `GET`    | `/api/admin/clients`                    | Admin | Get paginated clients list           |
| `POST`   | `/api/admin/clients`                    | Admin | Create a new client profile          |
| `GET`    | `/api/admin/clients/stats`              | Admin | Get comprehensive client statistics  |
| `GET`    | `/api/admin/clients/dashboard`          | Admin | Get combined dashboard data          |
| `GET`    | `/api/admin/clients/advanced-search`    | Admin | Advanced multi-filter search         |
| `PUT`    | `/api/admin/clients/bulk`               | Admin | Bulk update client profiles          |
| `DELETE` | `/api/admin/clients/bulk`               | Admin | Bulk delete client profiles          |
| `GET`    | `/api/admin/clients/{clientId}`         | Admin | Get client by ID                     |
| `PUT`    | `/api/admin/clients/{clientId}`         | Admin | Update client profile                |
| `DELETE` | `/api/admin/clients/{clientId}`         | Admin | Delete client profile                |

---

## List Clients

```
GET /api/admin/clients
```

Returns a paginated list of client profiles with basic filtering.

**Query Parameters:**

| Parameter     | Type    | Default | Description                                            |
| ------------- | ------- | ------- | ------------------------------------------------------ |
| `page`        | integer | `1`     | Page number (minimum: 1)                                |
| `limit`       | integer | `10`    | Results per page (1--100)                               |
| `search`      | string  | --      | Search by name or email                                 |
| `status`      | string  | --      | Filter: `active`, `inactive`, `suspended`, `trial`      |
| `plan`        | string  | --      | Filter: `free`, `standard`, `premium`                   |
| `accountType` | string  | --      | Filter: `individual`, `business`, `enterprise`          |
| `provider`    | string  | --      | Filter by authentication provider                       |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client_123abc",
        "displayName": "John Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "company": "Tech Corp Inc",
        "status": "active",
        "plan": "premium",
        "accountType": "business",
        "joinedAt": "2024-01-15T10:30:00.000Z",
        "lastActiveAt": "2024-01-20T14:45:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "totalPages": 5,
    "total": 47,
    "limit": 10
  }
}
```

---

## Create Client

```
POST /api/admin/clients
```

Creates a new client profile. If no user account exists for the provided email, a new user is automatically created with a temporary password. Triggers CRM sync when enabled.

**Request Body:**

| Field            | Type    | Required | Description                                  |
| ---------------- | ------- | -------- | -------------------------------------------- |
| `email`          | string  | Yes      | Client email address                         |
| `displayName`    | string  | No       | Display name (defaults to email prefix)      |
| `username`       | string  | No       | Unique username                              |
| `bio`            | string  | No       | Client biography                             |
| `jobTitle`       | string  | No       | Job title                                    |
| `company`        | string  | No       | Company name                                 |
| `industry`       | string  | No       | Industry sector                              |
| `phone`          | string  | No       | Phone number                                 |
| `website`        | string  | No       | Website URL                                  |
| `location`       | string  | No       | Location                                     |
| `accountType`    | string  | No       | `individual` (default), `business`, `enterprise` |
| `status`         | string  | No       | `active` (default), `inactive`, `suspended`, `trial` |
| `plan`           | string  | No       | `free` (default), `standard`, `premium`      |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "client_789ghi",
    "displayName": "John Doe",
    "email": "john.doe@example.com",
    "status": "active",
    "plan": "premium",
    "accountType": "business",
    "createdAt": "2024-01-20T16:45:00.000Z"
  },
  "message": "Client created successfully"
}
```

---

## Get Client Statistics

```
GET /api/admin/clients/stats
```

Returns comprehensive analytics across all clients, grouped by overview, growth, plans, account types, engagement, demographics, and authentication providers.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalClients": 1247,
      "activeClients": 1156,
      "inactiveClients": 67,
      "suspendedClients": 24,
      "trialClients": 89
    },
    "growth": {
      "newClientsToday": 3,
      "newClientsThisWeek": 18,
      "newClientsThisMonth": 45,
      "growthRate": 3.8
    },
    "plans": {
      "free": 856,
      "standard": 267,
      "premium": 124,
      "conversionRate": 31.4
    },
    "accountTypes": {
      "individual": 789,
      "business": 356,
      "enterprise": 102
    },
    "engagement": {
      "averageSubmissions": 12.5,
      "totalSubmissions": 15587,
      "activeThisWeek": 892,
      "activeThisMonth": 1034
    },
    "demographics": {
      "topCountries": [{ "country": "United States", "count": 456 }],
      "topCompanies": [{ "company": "Tech Corp Inc", "count": 25 }],
      "topIndustries": [{ "industry": "Technology", "count": 234 }]
    },
    "providers": { "google": 567, "github": 234, "email": 446 }
  }
}
```

---

## Dashboard

```
GET /api/admin/clients/dashboard
```

Returns a combined response with a paginated clients list, aggregate statistics, and pagination metadata. Supports all basic filters plus date range parameters.

**Query Parameters (in addition to list parameters):**

| Parameter       | Type   | Description                                |
| --------------- | ------ | ------------------------------------------ |
| `createdAfter`  | string | ISO date or `YYYY-MM-DD` -- created after  |
| `createdBefore` | string | ISO date or `YYYY-MM-DD` -- created before |

---

## Advanced Search

```
GET /api/admin/clients/advanced-search
```

Performs a multi-dimensional search across client profiles. In addition to the basic list filters, supports field-specific searches, numeric ranges, boolean flags, and date ranges. Returns search metadata including applied filters and execution time.

**Additional Query Parameters:**

| Parameter          | Type    | Description                                    |
| ------------------ | ------- | ---------------------------------------------- |
| `sortBy`           | string  | `createdAt`, `updatedAt`, `name`, `email`, `company`, `totalSubmissions` |
| `sortOrder`        | string  | `asc` or `desc`                                |
| `createdAfter`     | string  | ISO date-time filter                           |
| `createdBefore`    | string  | ISO date-time filter                           |
| `emailDomain`      | string  | Filter by email domain (e.g., `example.com`)   |
| `companySearch`    | string  | Search within company names                    |
| `locationSearch`   | string  | Search within locations                        |
| `industrySearch`   | string  | Search within industries                       |
| `minSubmissions`   | integer | Minimum submission count                       |
| `maxSubmissions`   | integer | Maximum submission count                       |
| `emailVerified`    | boolean | Filter by email verification status            |
| `twoFactorEnabled` | boolean | Filter by 2FA status                          |
| `hasAvatar`        | boolean | Filter clients with/without avatar             |
| `hasWebsite`       | boolean | Filter clients with/without website            |
| `hasPhone`         | boolean | Filter clients with/without phone              |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "clients": [{ "id": "client_123abc", "..." : "..." }],
    "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 },
    "searchMetadata": {
      "appliedFilters": { "status": "active", "plan": "premium" },
      "searchTime": 45.2
    }
  }
}
```

---

## Bulk Operations

### Bulk Update

```
PUT /api/admin/clients/bulk
```

Updates multiple client profiles in a single request. Each client object must include an `id` field plus the fields to update. Individual failures do not abort the entire batch.

**Request Body:**

```json
{
  "clients": [
    { "id": "client_123abc", "plan": "premium", "status": "active" },
    { "id": "client_456def", "plan": "standard" }
  ]
}
```

### Bulk Delete

```
DELETE /api/admin/clients/bulk
```

Permanently deletes multiple client profiles. Each object in the array must include an `id` field.

**Request Body:**

```json
{
  "clients": [
    { "id": "client_123abc" },
    { "id": "client_456def" }
  ]
}
```

**Response (200) -- both bulk endpoints:**

```json
{
  "success": true,
  "message": "Bulk update completed: 2 successful, 1 failed",
  "results": [{ "index": 0, "success": true }],
  "errors": [{ "index": 2, "error": "Client not found" }],
  "summary": { "total": 3, "successful": 2, "failed": 1 }
}
```

---

## Get / Update / Delete Client

### Get Client

```
GET /api/admin/clients/{clientId}
```

Returns the complete client profile including display name, company, plan, account type, and activity timestamps.

### Update Client

```
PUT /api/admin/clients/{clientId}
```

Partial update -- only provided fields are modified. Triggers CRM sync when company or profile data changes.

**Request Body (all fields optional):**

```json
{
  "displayName": "John Doe Updated",
  "username": "johndoe_updated",
  "bio": "Senior Developer",
  "jobTitle": "Lead Developer",
  "company": "Tech Corp Inc",
  "status": "active",
  "plan": "premium",
  "accountType": "business"
}
```

### Delete Client

```
DELETE /api/admin/clients/{clientId}
```

Permanently deletes a client profile. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Client deleted successfully" }
```

---

## Validation Rules

| Field         | Rule                                                       |
| ------------- | ---------------------------------------------------------- |
| `email`       | Required for creation; valid email format                  |
| `status`      | Must be `active`, `inactive`, `suspended`, or `trial`      |
| `plan`        | Must be `free`, `standard`, or `premium`                   |
| `accountType` | Must be `individual`, `business`, or `enterprise`          |
| `clients`     | Bulk: non-empty array with `id` required on each object    |

## Error Codes

| Status | Meaning                                                |
| ------ | ------------------------------------------------------ |
| `400`  | Validation error, missing email, user creation failed  |
| `401`  | Authentication required                                 |
| `403`  | Admin privileges required                               |
| `404`  | Client not found                                        |
| `500`  | Internal server error                                   |

## Related Documentation

- [Admin Users API](./admin-users-endpoints.md) -- user account management
- [Admin Roles API](./admin-roles-endpoints.md) -- role and permission management
- [Authentication](../architecture/nextauth-configuration.md) -- session management and guards
