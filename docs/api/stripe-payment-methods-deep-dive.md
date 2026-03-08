---
id: stripe-payment-methods-deep-dive
title: Stripe Payment Methods Deep Dive
sidebar_label: Stripe Payment Methods
sidebar_position: 3
---

# Stripe Payment Methods Deep Dive

This page covers payment method listing, setup intents for saving cards, default method management, and card validation.

## Overview

The payment methods system provides two key capabilities: listing a user's saved payment methods with default status, and creating setup intents that allow users to save new payment methods for future use without an immediate charge.

## Route Table

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Session required | List all payment methods for the user |
| `POST` | `/api/stripe/setup-intent` | Session required | Create a setup intent for saving a new payment method |

## Listing Payment Methods (GET)

### How It Works

The list endpoint performs these steps:

1. Authenticates the user via `auth()`
2. Resolves the user's Stripe customer ID via `getUserStripeCustomerId()`
3. Retrieves the customer to determine the default payment method
4. Lists all `card` type payment methods (up to 100)
5. Formats and sorts results (default first, then by creation date)

### Key Implementation

```typescript
// Retrieve customer for default payment method detection
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// List all card-type payment methods
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Format with default status
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Sort: default first, then by newest
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Success Response (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Present when no payment methods found
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Unix timestamp
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Example: User with Payment Methods

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### Example: No Payment Methods

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Creating a Setup Intent (POST)

Setup intents allow users to save a payment method for future use without being charged immediately. This is used when a user wants to add a card before subscribing, or manage multiple payment methods.

### How It Works

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### Success Response (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix timestamp
}
```

### Frontend Usage

On the client side, the `client_secret` is used to confirm the setup intent with Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## Default Payment Method Management

The default payment method is determined from the Stripe customer's `invoice_settings.default_payment_method`. When creating a subscription, the payment method is automatically set as the default:

```typescript
// During subscription creation
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

The `is_default` flag in the payment methods list response allows the frontend to display the default card badge.

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 401 | `Unauthorized` | No authenticated session |
| 404 | `Customer not found` | Stripe customer was deleted |
| 400 | Stripe error | Invalid request to Stripe API |
| 500 | `Failed to list payment methods` | Internal error |
| 500 | `Failed to create setup intent` | Setup intent creation failed |

Stripe-specific errors are detected and handled:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## Security Considerations

- All endpoints require authenticated sessions
- The list endpoint only returns payment methods belonging to the authenticated user's Stripe customer
- Card numbers are never stored or returned -- only the last 4 digits and brand are exposed
- The `client_secret` from setup intents should only be passed to the Stripe.js frontend SDK
- Customer IDs are resolved server-side and cannot be overridden by client requests

## Configuration Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | For frontend Stripe.js initialization |

## Related Pages

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Stripe Subscription Deep Dive](./stripe-subscription-deep-dive.md)
- [Stripe Webhook Deep Dive](./stripe-webhook-deep-dive.md)
- [Payment Provider Architecture](./payment-provider-architecture.md)
