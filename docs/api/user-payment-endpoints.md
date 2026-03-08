---
id: user-payment-endpoints
title: "User Payment API Reference"
sidebar_label: "User Payments"
sidebar_position: 55
---

# User Payment API Reference

## Overview

The User Payment endpoints manage currency preferences, payment history, plan status, and subscription details for authenticated users. Currency detection uses CDN/proxy headers (Cloudflare, Vercel, CloudFront, Fastly) to automatically determine the user's currency. Payment and subscription data is sourced from Stripe.

## Endpoints

### GET /api/user/currency

Detects and returns the user's currency preference based on HTTP headers from CDN/proxy providers. Always returns `200 OK` with graceful degradation -- falls back to USD if detection fails.

**Request**

| Parameter | Type   | In    | Description |
|-----------|--------|-------|-------------|
| provider  | string | query | Detection provider: `"cloudflare"`, `"vercel"`, `"cloudfront"`, `"fastly"`, `"generic"`, `"auto"`, `"smart"` (default: `"smart"`) |

**Response**
```typescript
{
  currency: string;     // ISO 4217 code, e.g. "USD", "EUR", "GBP"
  country: string | null; // ISO 3166-1 alpha-2, e.g. "US", "FR", or null if detection failed
  detected: boolean;    // true if detected from headers, false if using fallback
}
```

**Example**
```typescript
const response = await fetch('/api/user/currency?provider=smart');
const { currency, country, detected } = await response.json();
// { currency: "EUR", country: "FR", detected: true }
```

### PUT /api/user/currency

Updates the authenticated user's currency and country preference. Requires a valid session.

**Request**
```typescript
{
  currency: string;       // ISO 4217 code, exactly 3 characters, required
  country?: string | null; // ISO 3166-1 alpha-2, exactly 2 characters, optional
}
```

**Response**
```typescript
{
  currency: string;       // Updated currency code
  country: string | null; // Updated country code or null
}
```

**Example**
```typescript
const response = await fetch('/api/user/currency', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency: 'EUR', country: 'FR' })
});
const data = await response.json();
```

### GET /api/user/payments

Retrieves comprehensive payment history for the authenticated user from Stripe. Returns invoices with plan details, billing intervals, and invoice links, sorted by date (newest first).

**Request**

No parameters required. Authentication via session cookie.

**Response**
```typescript
Array<{
  id: string;                // Stripe invoice ID
  date: string;              // ISO 8601 date
  amount: number;            // In major currency units (e.g. 29.99)
  currency: string;          // Uppercase currency code
  plan: string;              // Plan display name
  planId: string;            // Plan identifier
  status: "Paid" | "Pending" | "Draft" | "Unknown";
  billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  paymentProvider: "stripe";
  subscriptionId: string;    // Associated subscription ID
  description: string;       // e.g. "Premium Plan - monthly billing"
  invoiceUrl: string | null; // Hosted invoice URL
  invoicePdf: string | null; // Invoice PDF download URL
  invoiceNumber: string | null;
  period_end: string | null;   // Billing period end (ISO 8601)
  period_start: string | null; // Billing period start (ISO 8601)
}>
```

**Example**
```typescript
const response = await fetch('/api/user/payments');
const payments = await response.json();
// payments[0] = { id: "in_123...", amount: 29.99, status: "Paid", ... }
```

### GET /api/user/plan-status

Returns the user's current plan with full expiration details, including effective plan (what the user can actually access), warning periods, and feature access status.

**Request**

No parameters required. Authentication via session cookie.

**Response**
```typescript
{
  success: true;
  data: {
    planId: "free" | "standard" | "premium";
    effectivePlan: "free" | "standard" | "premium"; // May differ if expired
    isExpired: boolean;
    expiresAt: string | null;          // ISO 8601 date
    daysUntilExpiration: number | null; // Negative if already expired
    isInWarningPeriod: boolean;        // true if expires within 7 days
    canAccessPlanFeatures: boolean;
    warningMessage: string | null;     // User-facing warning text
    status: string | null;             // Raw subscription status
  };
}
```

**Example**
```typescript
const response = await fetch('/api/user/plan-status');
const { data } = await response.json();

if (data.isInWarningPeriod) {
  showWarning(data.warningMessage);
}

if (!data.canAccessPlanFeatures) {
  redirectToUpgrade();
}
```

### GET /api/user/subscription

Retrieves comprehensive subscription information including current active subscription details and complete subscription history from Stripe.

**Request**

No parameters required. Authentication via session cookie.

**Response**
```typescript
{
  hasActiveSubscription: boolean;
  message?: string;                    // Only when no Stripe customer found
  currentSubscription?: {
    id: string;                        // Stripe subscription ID
    planId: string;                    // Stripe price ID
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid";
    startDate: string;                 // ISO 8601
    endDate: string;
    nextBillingDate: string;
    paymentProvider: "stripe";
    subscriptionId: string;
    amount: number;                    // Major currency units
    currency: string;                  // Uppercase
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
    currentPeriodEnd: string;
    currentPeriodStart: string;
  };
  subscriptionHistory: Array<{
    id: string;
    planId: string;
    planName: string;
    status: "active" | "trialing" | "past_due" | "canceled" | "unpaid" | "incomplete";
    startDate: string;
    endDate: string;
    cancelledAt?: string;
    cancelReason?: string;
    amount: number;
    currency: string;
    billingInterval: "monthly" | "yearly" | "weekly" | "daily";
  }>;
}
```

**Example**
```typescript
const response = await fetch('/api/user/subscription');
const { hasActiveSubscription, currentSubscription } = await response.json();

if (hasActiveSubscription && currentSubscription) {
  console.log(`Plan: ${currentSubscription.planName}, Status: ${currentSubscription.status}`);
}
```

## Authentication

- **GET /api/user/currency**: Public (no auth required) -- detects currency from headers.
- **PUT /api/user/currency**: Requires authenticated session.
- **GET /api/user/payments**: Requires authenticated session.
- **GET /api/user/plan-status**: Requires authenticated session.
- **GET /api/user/subscription**: Requires authenticated session.

## Error Responses

| Status | Description |
|--------|-------------|
| 400 | Invalid currency code, invalid country code format, or malformed JSON payload |
| 401 | Unauthorized -- no authenticated session |
| 500 | Internal server error -- Stripe API failure or database error |

## Rate Limiting

No explicit rate limiting. The currency detection endpoint always returns `200 OK` for graceful degradation. Payment and subscription data is fetched directly from Stripe with a limit of 100 records per request.

## Related Endpoints

- [Config Feature Endpoints](./config-feature-endpoints) -- Check feature availability based on plan
