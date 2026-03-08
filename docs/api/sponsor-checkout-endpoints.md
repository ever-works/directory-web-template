---
id: sponsor-checkout-endpoints
title: "Sponsor Ads & Checkout API Reference"
sidebar_label: "Sponsor Ads & Checkout"
sidebar_position: 59
---

# Sponsor Ads & Checkout API Reference

## Overview

The Sponsor Ads endpoints manage the full lifecycle of sponsored advertisement placements on directory items. This includes browsing active ads, submitting new sponsor requests, managing user-owned ads, processing payments through multiple providers (Stripe, LemonSqueezy, Polar), and handling cancellations and renewals. The checkout flow supports weekly and monthly billing intervals.

## Endpoints

### GET /api/sponsor-ads

Returns a list of currently active sponsor ads with their associated item data for public display.

**Request**

| Parameter | Type    | In    | Description                                      |
| --------- | ------- | ----- | ------------------------------------------------ |
| limit     | integer | query | Max sponsor ads to return (default: 10, max: 50) |

**Response**

```typescript
{
  success: true;
  data: Array<{
    sponsor: {
      id: string;
      itemSlug: string;
      status: string;
      interval: string;
    };
    item: {
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      category: string;
    } | null;
  }>;
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads?limit=5");
const { data: sponsoredItems } = await response.json();
```

### GET /api/sponsor-ads/user

Returns a paginated list of sponsor ads submitted by the authenticated user.

**Request**

| Parameter | Type    | In    | Description                                                                             |
| --------- | ------- | ----- | --------------------------------------------------------------------------------------- |
| page      | integer | query | Page number (default: 1)                                                                |
| limit     | integer | query | Items per page (default: 10)                                                            |
| status    | string  | query | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| interval  | string  | query | Filter: `"weekly"`, `"monthly"`                                                         |
| search    | string  | query | Search term                                                                             |

**Response**

```typescript
{
  success: true;
  data: Array<SponsorAd>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads/user?status=active&page=1");
const { data, pagination } = await response.json();
```

### POST /api/sponsor-ads/user

Creates a new sponsor ad submission for the authenticated user. The submission starts in a pending state awaiting admin approval.

**Request**

```typescript
{
  itemSlug: string;          // Slug of the item to sponsor (required)
  itemName: string;          // Name of the item (required)
  itemIconUrl?: string;      // Icon URL
  itemCategory?: string;     // Category of the item
  itemDescription?: string;  // Description (max 500 chars)
  interval: "weekly" | "monthly"; // Billing interval (required)
}
```

**Response**

```typescript
{
  success: true;
  data: SponsorAd;
  message: "Sponsor ad submission created successfully. Pending admin approval.";
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads/user", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    itemSlug: "my-awesome-tool",
    itemName: "My Awesome Tool",
    interval: "monthly",
  }),
});
```

### GET /api/sponsor-ads/user/stats

Returns statistics for the authenticated user's sponsor ads including counts by status, interval distribution, and revenue metrics.

**Request**

No parameters required. Authentication via session cookie.

**Response**

```typescript
{
  success: true;
  stats: {
    overview: {
      total: number;
      pendingPayment: number;
      pending: number;
      active: number;
      rejected: number;
      expired: number;
      cancelled: number;
    }
    byInterval: {
      weekly: number;
      monthly: number;
    }
    revenue: {
      totalRevenue: number; // In minor currency units (cents)
      weeklyRevenue: number;
      monthlyRevenue: number;
    }
  }
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads/user/stats");
const { stats } = await response.json();
console.log(
  `Active ads: ${stats.overview.active}, Total revenue: ${stats.revenue.totalRevenue}`,
);
```

### GET `/api/sponsor-ads/user/{id}`

Returns a single sponsor ad owned by the authenticated user.

**Request**

| Parameter | Type   | In   | Description              |
| --------- | ------ | ---- | ------------------------ |
| id        | string | path | Sponsor ad ID (required) |

**Response**

```typescript
{
  success: true;
  data: SponsorAd;
}
```

### POST /api/sponsor-ads/checkout

Creates a checkout session for an approved sponsor ad. The sponsor ad must be in `pending_payment` status and owned by the authenticated user.

**Request**

```typescript
{
  sponsorAdId: string;      // ID of the approved sponsor ad (required)
  successUrl?: string;      // Redirect URL after successful payment
  cancelUrl?: string;       // Redirect URL after cancelled payment
}
```

**Response**

```typescript
{
  success: true;
  data: {
    checkoutId: string; // Provider checkout session ID
    checkoutUrl: string; // URL to redirect user to for payment
    provider: string; // "stripe", "lemonsqueezy", or "polar"
  }
  message: "Checkout session created successfully";
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sponsorAdId: "ad-123",
    successUrl: "https://myapp.com/sponsor/success?sponsorAdId=ad-123",
    cancelUrl: "https://myapp.com/sponsor?cancelled=true",
  }),
});

const { data } = await response.json();
window.location.href = data.checkoutUrl; // Redirect to payment
```

### POST `/api/sponsor-ads/user/{id}/cancel`

Cancels a sponsor ad owned by the authenticated user. Can only cancel ads with `pending_payment`, `pending`, or `active` status.

**Request**

```typescript
{
  cancelReason?: string;   // Optional reason for cancellation (max 500 chars)
}
```

**Response**

```typescript
{
  success: true;
  data: SponsorAd; // The cancelled sponsor ad
  message: "Sponsor ad cancelled successfully";
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/cancel", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ cancelReason: "No longer needed" }),
});
```

### POST `/api/sponsor-ads/user/{id}/renew`

Creates a checkout session to renew an active or expired sponsor ad. Only ads with `active` or `expired` status can be renewed.

**Request**

```typescript
{
  successUrl?: string;     // Redirect URL after successful payment
  cancelUrl?: string;      // Redirect URL after cancelled payment
}
```

**Response**

```typescript
{
  success: true;
  data: {
    checkoutId: string;
    checkoutUrl: string;
    provider: string;
  }
  message: "Renewal checkout session created successfully";
}
```

**Example**

```typescript
const response = await fetch("/api/sponsor-ads/user/ad-123/renew", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    successUrl:
      "https://myapp.com/sponsor/success?sponsorAdId=ad-123&renewal=true",
  }),
});
const { data } = await response.json();
window.location.href = data.checkoutUrl;
```

## Authentication

| Endpoint                                 | Auth Required                         |
| ---------------------------------------- | ------------------------------------- |
| GET /api/sponsor-ads                     | Public                                |
| GET /api/sponsor-ads/user                | Session required                      |
| POST /api/sponsor-ads/user               | Session required                      |
| GET /api/sponsor-ads/user/stats          | Session required                      |
| `GET /api/sponsor-ads/user/{id}`         | Session required (ownership verified) |
| POST /api/sponsor-ads/checkout           | Session required (ownership verified) |
| `POST /api/sponsor-ads/user/{id}/cancel` | Session required (ownership verified) |
| `POST /api/sponsor-ads/user/{id}/renew`  | Session required (ownership verified) |

All user-specific endpoints verify ownership -- attempting to access another user's sponsor ad returns `404` (for GET) or `403` (for actions).

## Error Responses

| Status | Description                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------- |
| 400    | Invalid input, duplicate submission, non-cancellable/non-renewable status, missing price configuration, or malformed JSON |
| 401    | Unauthorized -- no authenticated session                                                                                  |
| 403    | Forbidden -- user does not own the sponsor ad                                                                             |
| 404    | Sponsor ad not found                                                                                                      |
| 500    | Internal server error -- payment provider failure or database error                                                       |

## Rate Limiting

No explicit rate limiting. Redirect URLs in checkout and renewal endpoints are validated against the application domain to prevent open redirect vulnerabilities. The active payment provider is determined by the `NEXT_PUBLIC_PAYMENT_PROVIDER` environment variable (defaults to Stripe).

## Related Endpoints

- [User Payment Endpoints](./user-payment-endpoints) -- User payment history and subscription management
