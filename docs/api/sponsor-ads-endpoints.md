---
id: sponsor-ads-endpoints
title: "Sponsor Ads API Endpoints"
sidebar_label: "Sponsor Ads"
sidebar_position: 16
---

# Sponsor Ads API Endpoints

The Sponsor Ads API manages the full lifecycle of sponsored advertisements: creation, payment checkout, renewal, cancellation, and statistics. It integrates with multiple payment providers (Stripe, LemonSqueezy, Polar) for billing.

**Source files:**
- `template/app/api/sponsor-ads/route.ts`
- `template/app/api/sponsor-ads/checkout/route.ts`
- `template/app/api/sponsor-ads/user/route.ts`
- `template/app/api/sponsor-ads/user/[id]/route.ts`
- `template/app/api/sponsor-ads/user/[id]/cancel/route.ts`
- `template/app/api/sponsor-ads/user/[id]/renew/route.ts`
- `template/app/api/sponsor-ads/user/stats/route.ts`

## Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sponsor-ads` | None | Get active sponsor ads (public) |
| POST | `/api/sponsor-ads/checkout` | Session | Create checkout session |
| GET | `/api/sponsor-ads/user` | Session | List user's sponsor ads |
| POST | `/api/sponsor-ads/user` | Session | Submit new sponsor ad |
| GET | `/api/sponsor-ads/user/{id}` | Session | Get single sponsor ad |
| POST | `/api/sponsor-ads/user/{id}/cancel` | Session | Cancel a sponsor ad |
| POST | `/api/sponsor-ads/user/{id}/renew` | Session | Renew a sponsor ad |
| GET | `/api/sponsor-ads/user/stats` | Session | Get user's ad statistics |

---

## GET `/api/sponsor-ads`

Returns active sponsor ads with associated item data for public display. **No authentication required.**

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Max ads to return (1-50) |

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "sponsor": {
        "id": "sp_123",
        "itemSlug": "featured-tool",
        "status": "active",
        "interval": "monthly"
      },
      "item": {
        "name": "Featured Tool",
        "slug": "featured-tool",
        "description": "A great tool",
        "icon_url": "https://example.com/icon.png",
        "category": "productivity"
      }
    }
  ]
}
```

---

## POST `/api/sponsor-ads/checkout`

Creates a payment checkout session for an approved sponsor ad. Supports Stripe, LemonSqueezy, and Polar providers.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sponsorAdId` | string | **Yes** | ID of the approved sponsor ad |
| `successUrl` | string | No | Redirect URL after successful payment |
| `cancelUrl` | string | No | Redirect URL after cancelled payment |

### Security: Open Redirect Prevention

Redirect URLs are validated against the application's origin to prevent open redirect attacks:

```ts
function validateRedirectUrl(url, allowedOrigin) {
  const urlObj = new URL(url, allowedOrigin);
  const allowedUrlObj = new URL(allowedOrigin);
  // Only allow same protocol, hostname, and port
  return urlObj.protocol === allowedUrlObj.protocol &&
    urlObj.hostname === allowedUrlObj.hostname &&
    urlObj.port === allowedUrlObj.port;
}
```

Invalid URLs are silently replaced with safe defaults.

### Response: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_live_abc123",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_live_abc123",
    "provider": "stripe"
  },
  "message": "Checkout session created successfully"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing sponsor ad ID, ad not in `pending_payment` status, or missing price config |
| 401 | Not authenticated |
| 403 | User does not own this sponsor ad |
| 404 | Sponsor ad not found |

---

## GET `/api/sponsor-ads/user`

Returns a paginated list of sponsor ads belonging to the authenticated user.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `limit` | integer | No | 10 | Items per page |
| `status` | string | No | -- | Filter: `"pending"`, `"approved"`, `"rejected"`, `"active"`, `"expired"`, `"cancelled"` |
| `interval` | string | No | -- | Filter by billing interval |
| `search` | string | No | -- | Text search filter |

Query parameters are validated using the `querySponsorAdsSchema` Zod schema.

### Response: 200

```json
{
  "success": true,
  "data": [
    {
      "id": "sp_123",
      "itemSlug": "my-tool",
      "status": "active",
      "interval": "monthly"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

## POST `/api/sponsor-ads/user`

Creates a new sponsor ad submission. The ad starts in a pending state awaiting admin approval.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemSlug` | string | **Yes** | Slug of the item to sponsor |
| `itemName` | string | **Yes** | Display name of the item |
| `itemIconUrl` | string | No | Icon URL |
| `itemCategory` | string | No | Item category |
| `itemDescription` | string | No | Description (max 500 chars) |
| `interval` | `"weekly"` or `"monthly"` | **Yes** | Subscription interval |

### Response: 201 Created

```json
{
  "success": true,
  "data": {
    "id": "sp_new123",
    "status": "pending",
    "interval": "monthly"
  },
  "message": "Sponsor ad submission created successfully. Pending admin approval."
}
```

### 400 -- Duplicate Submission

```json
{
  "success": false,
  "error": "You already have an active sponsor ad"
}
```

---

## GET `/api/sponsor-ads/user/{id}`

Retrieves a single sponsor ad owned by the authenticated user. Returns 404 if the ad does not exist or belongs to another user (to prevent information leakage).

---

## POST `/api/sponsor-ads/user/{id}/cancel`

Cancels a sponsor ad. Only ads with status `pending_payment`, `pending`, or `active` can be cancelled.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cancelReason` | string | No | Reason for cancellation (max 500 chars) |

### Response: 200

```json
{
  "success": true,
  "data": { "id": "sp_123", "status": "cancelled" },
  "message": "Sponsor ad cancelled successfully"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Cannot cancel ad with current status |
| 403 | User does not own this sponsor ad |
| 404 | Sponsor ad not found |

---

## POST `/api/sponsor-ads/user/{id}/renew`

Creates a checkout session to renew an active or expired sponsor ad. Only ads with status `active` or `expired` can be renewed.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `successUrl` | string | No | Redirect URL after payment |
| `cancelUrl` | string | No | Redirect URL on cancellation |

### Response: 200

```json
{
  "success": true,
  "data": {
    "checkoutId": "cs_renewal_abc",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_renewal_abc",
    "provider": "stripe"
  },
  "message": "Renewal checkout session created successfully"
}
```

---

## GET `/api/sponsor-ads/user/stats`

Returns statistics for the authenticated user's sponsor ads including status breakdown, interval distribution, and revenue metrics.

### Response: 200

```json
{
  "success": true,
  "stats": {
    "overview": {
      "total": 15,
      "pendingPayment": 2,
      "pending": 3,
      "active": 5,
      "rejected": 1,
      "expired": 3,
      "cancelled": 1
    },
    "byInterval": {
      "weekly": 8,
      "monthly": 7
    },
    "revenue": {
      "totalRevenue": 45000,
      "weeklyRevenue": 20000,
      "monthlyRevenue": 25000
    }
  }
}
```

Revenue values are in **minor currency units** (for example, cents for USD).

---

## Payment Provider Configuration

The active payment provider is determined by `NEXT_PUBLIC_PAYMENT_PROVIDER` (defaults to `"stripe"`). Each provider requires its own set of price/variant ID environment variables:

| Provider | Weekly Price Env Var | Monthly Price Env Var |
|----------|---------------------|-----------------------|
| Stripe | `STRIPE_SPONSOR_WEEKLY_PRICE_ID` | `STRIPE_SPONSOR_MONTHLY_PRICE_ID` |
| LemonSqueezy | `LEMONSQUEEZY_SPONSOR_WEEKLY_VARIANT_ID` | `LEMONSQUEEZY_SPONSOR_MONTHLY_VARIANT_ID` |
| Polar | `POLAR_SPONSOR_WEEKLY_PRICE_ID` | `POLAR_SPONSOR_MONTHLY_PRICE_ID` |

---

## Related Source Files

| File | Purpose |
|------|---------|
| `template/app/api/sponsor-ads/route.ts` | Public active ads endpoint |
| `template/app/api/sponsor-ads/checkout/route.ts` | Checkout session creation |
| `template/app/api/sponsor-ads/user/route.ts` | User ads list and creation |
| `template/app/api/sponsor-ads/user/[id]/route.ts` | Single ad retrieval |
| `template/app/api/sponsor-ads/user/[id]/cancel/route.ts` | Ad cancellation |
| `template/app/api/sponsor-ads/user/[id]/renew/route.ts` | Ad renewal |
| `template/app/api/sponsor-ads/user/stats/route.ts` | User statistics |
| `template/lib/services/sponsor-ad.service.ts` | Business logic layer |
| `template/lib/validations/sponsor-ad.ts` | Zod validation schemas |
| `template/lib/payment/config/payment-provider-manager.ts` | Payment provider factory |
