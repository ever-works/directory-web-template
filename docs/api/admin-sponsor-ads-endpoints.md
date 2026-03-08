---
id: admin-sponsor-ads-endpoints
title: Admin Sponsor Ads API Endpoints
sidebar_label: Admin Sponsor Ads
sidebar_position: 39
---

# Admin Sponsor Ads API Endpoints

The Sponsor Ads API provides endpoints for managing sponsored advertisements including listing, viewing, approving, rejecting, and cancelling ads. Sponsor ads progress through a lifecycle of `pending_payment`, `pending`, `active`, `rejected`, `expired`, and `cancelled` statuses. All endpoints require admin authentication.

## Base Path

```
/api/admin/sponsor-ads
```

## Route Summary

| Method   | Path                                        | Auth  | Description                          |
| -------- | ------------------------------------------- | ----- | ------------------------------------ |
| `GET`    | `/api/admin/sponsor-ads`                    | Admin | Get paginated sponsor ads list       |
| `GET`    | `/api/admin/sponsor-ads/{id}`               | Admin | Get sponsor ad by ID                 |
| `DELETE` | `/api/admin/sponsor-ads/{id}`               | Admin | Delete sponsor ad permanently        |
| `POST`   | `/api/admin/sponsor-ads/{id}/approve`       | Admin | Approve and activate a sponsor ad    |
| `POST`   | `/api/admin/sponsor-ads/{id}/reject`        | Admin | Reject a sponsor ad                  |
| `POST`   | `/api/admin/sponsor-ads/{id}/cancel`        | Admin | Cancel a sponsor ad                  |

---

## List Sponsor Ads

```
GET /api/admin/sponsor-ads
```

Returns a paginated list of sponsor ads with optional filtering by status and billing interval. Also returns aggregate statistics for the admin dashboard. Query parameters are validated with Zod.

**Query Parameters:**

| Parameter   | Type    | Default     | Description                                                          |
| ----------- | ------- | ----------- | -------------------------------------------------------------------- |
| `page`      | integer | `1`         | Page number (minimum: 1)                                              |
| `limit`     | integer | `10`        | Results per page (1--100)                                             |
| `status`    | string  | --          | Filter: `pending_payment`, `pending`, `rejected`, `active`, `expired`, `cancelled` |
| `interval`  | string  | --          | Filter: `weekly` or `monthly`                                         |
| `search`    | string  | --          | Search sponsor ads by text                                            |
| `sortBy`    | string  | `createdAt` | Sort field: `createdAt`, `updatedAt`, `startDate`, `endDate`, `status`|
| `sortOrder` | string  | `desc`      | Sort direction: `asc` or `desc`                                       |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "ad_123abc",
      "title": "Premium Tool Spotlight",
      "description": "Featured placement for premium tools",
      "status": "active",
      "interval": "monthly",
      "startDate": "2024-01-20T00:00:00.000Z",
      "endDate": "2024-02-20T00:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 25,
    "active": 8,
    "pending": 5,
    "expired": 10,
    "cancelled": 2
  }
}
```

---

## Get Sponsor Ad

```
GET /api/admin/sponsor-ads/{id}
```

Returns a specific sponsor ad with full details including the associated user information.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "title": "Premium Tool Spotlight",
    "status": "active",
    "interval": "monthly",
    "user": {
      "id": "user_456def",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

## Delete Sponsor Ad

```
DELETE /api/admin/sponsor-ads/{id}
```

Permanently deletes a sponsor ad. This action cannot be undone.

**Response (200):**

```json
{ "success": true, "message": "Sponsor ad deleted successfully" }
```

---

## Approve Sponsor Ad

```
POST /api/admin/sponsor-ads/{id}/approve
```

Approves and activates a sponsor ad. Ads in `pending` status can be approved directly. For ads in `pending_payment` status, set `forceApprove` to `true` to approve without payment confirmation.

**Request Body (optional):**

| Field          | Type    | Required | Description                                         |
| -------------- | ------- | -------- | --------------------------------------------------- |
| `forceApprove` | boolean | No       | Set to `true` to approve without payment (for `pending_payment` status) |

**Example:**

```json
{
  "forceApprove": true
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "active",
    "startDate": "2024-01-20T00:00:00.000Z",
    "endDate": "2024-02-20T00:00:00.000Z"
  },
  "message": "Sponsor ad approved and activated successfully"
}
```

**Error Responses:**

| Status | Error                    | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| `400`  | `PAYMENT_NOT_RECEIVED`   | Ad has `pending_payment` status; use `forceApprove` |
| `400`  | `Cannot approve...`      | Ad status does not allow approval                |
| `404`  | `Sponsor ad not found`   | No ad with the given ID exists                   |

---

## Reject Sponsor Ad

```
POST /api/admin/sponsor-ads/{id}/reject
```

Rejects a pending sponsor ad with a mandatory reason. Only ads in `pending` or `pending_payment` status can be rejected. The rejection reason is validated with Zod (`rejectSponsorAdSchema`).

**Request Body:**

| Field             | Type   | Required | Description                              |
| ----------------- | ------ | -------- | ---------------------------------------- |
| `rejectionReason` | string | Yes      | Reason for rejection (10--500 characters)|

**Example:**

```json
{
  "rejectionReason": "The ad content does not meet our quality standards. Please revise and resubmit."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "rejected",
    "rejectionReason": "The ad content does not meet our quality standards."
  },
  "message": "Sponsor ad rejected successfully"
}
```

---

## Cancel Sponsor Ad

```
POST /api/admin/sponsor-ads/{id}/cancel
```

Cancels a sponsor ad that is in `pending`, `pending_payment`, or `active` status. An optional cancellation reason can be provided. Validated with Zod (`cancelSponsorAdSchema`).

**Request Body (optional):**

| Field          | Type   | Required | Description                             |
| -------------- | ------ | -------- | --------------------------------------- |
| `cancelReason` | string | No       | Reason for cancellation (max 500 chars) |

**Example:**

```json
{
  "cancelReason": "Client requested cancellation due to budget changes."
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "ad_123abc",
    "status": "cancelled",
    "cancelReason": "Client requested cancellation due to budget changes."
  },
  "message": "Sponsor ad cancelled successfully"
}
```

---

## Status Lifecycle

Sponsor ads follow this status lifecycle:

```
pending_payment --> pending --> active --> expired
                       |          |
                       v          v
                   rejected   cancelled
```

- **`pending_payment`** -- Created by user, awaiting payment confirmation.
- **`pending`** -- Payment received, awaiting admin review.
- **`active`** -- Approved and currently running.
- **`rejected`** -- Declined by admin with a reason.
- **`expired`** -- Reached end date automatically.
- **`cancelled`** -- Cancelled by admin or user.

---

## Validation Rules

| Field             | Rule                                                   |
| ----------------- | ------------------------------------------------------ |
| `status`          | Must be a valid sponsor ad status                      |
| `interval`        | Must be `weekly` or `monthly`                          |
| `rejectionReason` | Required for reject; 10--500 characters                |
| `cancelReason`    | Optional for cancel; max 500 characters                |
| `forceApprove`    | Boolean; only relevant for `pending_payment` status    |
| `sortBy`          | Must be `createdAt`, `updatedAt`, `startDate`, `endDate`, or `status` |
| `sortOrder`       | Must be `asc` or `desc`                                |

## Error Codes

| Status | Meaning                                                |
| ------ | ------------------------------------------------------ |
| `400`  | Validation error, invalid status transition, payment not received |
| `401`  | Authentication required                                 |
| `403`  | Admin privileges required                               |
| `404`  | Sponsor ad not found                                    |
| `500`  | Internal server error                                   |

## Related Documentation

- [Admin Users API](./admin-users-endpoints.md) -- user account management
- [Admin Clients API](./admin-clients-endpoints.md) -- client profile management
- [Authentication](../features/authentication.md) -- session management and guards
