---
id: user-endpoints
title: User Endpoints
sidebar_label: User
sidebar_position: 21
---

# User Endpoints

The user API provides endpoints for managing authenticated user preferences, subscription details, payment history, and profile location settings. All endpoints require session-based authentication.

## Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/user/currency` | GET | Public | Detect user currency from headers |
| `/api/user/currency` | PUT | User | Update currency preference |
| `/api/user/payments` | GET | User | Get payment history from Stripe |
| `/api/user/plan-status` | GET | User | Get plan status with expiration info |
| `/api/user/subscription` | GET | User | Get subscription details |
| `/api/user/profile/location` | GET | User | Get saved location settings |
| `/api/user/profile/location` | PATCH | User | Update location settings |

## Currency Detection and Preferences

### Detect Currency

```
GET /api/user/currency
```

Detects the user's currency based on HTTP headers from CDN/proxy providers. This endpoint uses graceful degradation -- it always returns 200 OK with a valid currency code, falling back to USD if detection fails. No authentication is required.

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `provider` | string | `"smart"` | Detection provider: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` |

**Success Response (200):**

```json
{
  "currency": "EUR",
  "country": "FR",
  "detected": true
}
```

| Field | Type | Description |
|---|---|---|
| `currency` | string | ISO 4217 currency code (3 characters), defaults to `"USD"` |
| `country` | string or null | ISO 3166-1 alpha-2 country code, null if detection failed |
| `detected` | boolean | Whether detection succeeded or value is a fallback |

When detection fails, the response still returns 200 with `"USD"` and `detected: false`.

**Source:** `template/app/api/user/currency/route.ts`

### Update Currency Preference

```
PUT /api/user/currency
```

Updates the authenticated user's preferred currency and country. Validated using Zod with the `SUPPORTED_CURRENCIES` list from `lib/config/billing`.

**Authentication:** Required

**Request Body:**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `currency` | string | Yes | ISO 4217 currency code (exactly 3 characters, uppercase) |
| `country` | string or null | No | ISO 3166-1 alpha-2 country code (exactly 2 characters) |

**Success Response (200):**

```json
{
  "currency": "EUR",
  "country": "FR"
}
```

| Status | Condition |
|---|---|
| 400 | Invalid JSON, unsupported currency code, or invalid country format |
| 401 | User not authenticated |
| 500 | Failed to persist the update |

**Source:** `template/app/api/user/currency/route.ts`

## Payment History

### Get Payment History

```
GET /api/user/payments
```

Retrieves the authenticated user's complete payment history from Stripe. Fetches invoices and subscriptions, enriches them with plan metadata, and returns a sorted list of payment records.

**Authentication:** Required

**Success Response (200):**

```json
[
  {
    "id": "in_1234567890abcdef",
    "date": "2024-01-15T10:30:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "plan": "Premium Plan",
    "planId": "pro",
    "status": "Paid",
    "billingInterval": "monthly",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "description": "Premium Plan - monthly billing",
    "invoiceUrl": "https://invoice.stripe.com/i/acct_123/test_abc",
    "invoicePdf": "https://pay.stripe.com/invoice/acct_123/test_abc/pdf",
    "invoiceNumber": "INV-2024-001",
    "period_end": "2024-02-15T10:30:00.000Z",
    "period_start": "2024-01-15T10:30:00.000Z"
  }
]
```

Key processing details:

- Filters to only `"paid"` and `"open"` invoices
- Converts amounts from cents to major currency units (divides by 100)
- Sorts by date, newest first
- Maps status to human-readable values: `"Paid"`, `"Pending"`, `"Draft"`, `"Unknown"`
- Returns an empty array `[]` if no Stripe customer exists

**Source:** `template/app/api/user/payments/route.ts`

## Plan Status

### Get Plan Status

```
GET /api/user/plan-status
```

Returns comprehensive plan status information including expiration details. Used by the frontend to display plan warnings and gate features behind plan checks.

**Authentication:** Required

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "planId": "premium",
    "effectivePlan": "premium",
    "isExpired": false,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "daysUntilExpiration": 45,
    "isInWarningPeriod": false,
    "canAccessPlanFeatures": true,
    "warningMessage": null,
    "status": "active"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `planId` | string | The user's subscribed plan: `"free"`, `"standard"`, `"premium"` |
| `effectivePlan` | string | The plan the user can actually access (may differ if expired) |
| `isExpired` | boolean | Whether the subscription has expired |
| `expiresAt` | string or null | Expiration date in ISO format |
| `daysUntilExpiration` | integer or null | Days until expiration (negative if already expired) |
| `isInWarningPeriod` | boolean | True if subscription expires within 7 days |
| `canAccessPlanFeatures` | boolean | Whether the user can access their plan's features |
| `warningMessage` | string or null | User-facing warning message if applicable |
| `status` | string or null | Raw subscription status |

Uses `subscriptionService.getUserPlanWithExpiration()` from `lib/services/subscription.service`.

**Source:** `template/app/api/user/plan-status/route.ts`

## Subscription Details

### Get Subscription Status

```
GET /api/user/subscription
```

Retrieves detailed subscription information from Stripe including the current active subscription and complete subscription history.

**Authentication:** Required

**Success Response (200) -- Active Subscription:**

```json
{
  "hasActiveSubscription": true,
  "currentSubscription": {
    "id": "sub_1234567890abcdef",
    "planId": "price_1234567890abcdef",
    "planName": "Premium Plan",
    "status": "active",
    "startDate": "2024-01-15T10:30:00.000Z",
    "endDate": "2024-02-15T10:30:00.000Z",
    "nextBillingDate": "2024-02-15T10:30:00.000Z",
    "paymentProvider": "stripe",
    "subscriptionId": "sub_1234567890abcdef",
    "amount": 29.99,
    "currency": "USD",
    "billingInterval": "monthly"
  },
  "subscriptionHistory": [
    {
      "id": "sub_1234567890abcdef",
      "planId": "price_1234567890abcdef",
      "planName": "Premium Plan",
      "status": "active",
      "startDate": "2024-01-15T10:30:00.000Z",
      "endDate": "2024-02-15T10:30:00.000Z",
      "amount": 29.99,
      "currency": "USD",
      "billingInterval": "monthly"
    }
  ]
}
```

Active subscriptions are identified by `status === "active"` or `status === "trialing"`. History entries may include `cancelledAt` and `cancelReason` for cancelled subscriptions.

**Source:** `template/app/api/user/subscription/route.ts`

## Profile Location

### Get Location Settings

```
GET /api/user/profile/location
```

Returns the authenticated user's saved default location and privacy preference.

**Authentication:** Required (client profile)

**Success Response (200):**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

**Source:** `template/app/api/user/profile/location/route.ts`

### Update Location Settings

```
PATCH /api/user/profile/location
```

Updates the authenticated user's default location and privacy preference. Validated using the `updateLocationSchema` from `lib/validations/user-location`.

**Request Body:**

```json
{
  "defaultLatitude": 48.8566,
  "defaultLongitude": 2.3522,
  "defaultCity": "Paris",
  "defaultCountry": "FR",
  "locationPrivacy": "city"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `defaultLatitude` | number or null | No | Latitude coordinate |
| `defaultLongitude` | number or null | No | Longitude coordinate |
| `defaultCity` | string or null | No | City name |
| `defaultCountry` | string or null | No | Country code |
| `locationPrivacy` | string | No | Privacy level: `"private"`, `"city"`, `"exact"` |

Both latitude and longitude must be provided together.

**Source:** `template/app/api/user/profile/location/route.ts`
