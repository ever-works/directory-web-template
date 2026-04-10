---
id: configuration
title: Configuration des paiements
sidebar_label: Configuration Guide
sidebar_position: 6
---

# Configuration des paiements

This guide explains how to configure the different payment providers supported by the application.

## Table of Contents

- [Overview](#overview)
- [Supported Providers](#supported-providers)
- [Common Configuration](#common-configuration)
- [Stripe](#stripe)
- [LemonSqueezy](#lemonsqueezy)
- [Polar](#polar)
- [Solidgate](#solidgate)
- [Multi-Currency](#multi-currency)
- [Trials and Setup Fees](#trials-and-setup-fees)
- [Provider Selection](#provider-selection)
- [Troubleshooting](#troubleshooting)

---

## Overview

The application supports multiple payment providers for subscriptions:

| Provider     | Type          | Multi-Currency | Trials |
|--------------|---------------|----------------|--------|
| Stripe       | Subscription  | ✅ Yes         | ✅ Yes |
| LemonSqueezy | Subscription  | ✅ Yes         | ✅ Yes |
| Polar        | Subscription  | ❌ No          | ❌ No  |
| Solidgate    | Subscription  | ⚠️ Partial    | ❌ No  |

### Available Plans

- **Free** - Free, basic features
- **Standard** - Intermediate plan with more visibility
- **Premium** - Complete plan with all features

---

## Supported Providers

### Architecture

```
lib/
├── config/
│   └── billing/
│       ├── index.ts              # Exports
│       ├── types.ts              # Common types
│       ├── stripe.config.ts      # Stripe multi-currency config
│       ├── lemonsqueezy.config.ts # LemonSqueezy multi-currency config
│       └── solidgate.config.ts   # Solidgate config (WIP)
├── payment/
│   └── lib/
│       └── providers/
│           ├── stripe-provider.ts
│           ├── lemonsqueezy-provider.ts
│           ├── polar-provider.ts
│           └── solidgate-provider.ts  # (WIP)
└── utils/
    └── payment-provider.ts       # Provider selection
```

---

## Common Configuration

### Displayed Prices (for UI)

These variables define the prices displayed in the user interface:

```bash
# Prices in dollars (or main currency) - for display only
NEXT_PUBLIC_PRODUCT_PRICE_FREE=0
NEXT_PUBLIC_PRODUCT_PRICE_STANDARD=10
NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM=20
```

### Trials (Trial Period)

```bash
# Trial amount IDs (initial fees during the trial period)
NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID=price_xxx
NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID=price_xxx

# Enable/disable trials with authorized amount
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

---

## Stripe

### Prerequisites

1. Create an account on [Stripe Dashboard](https://dashboard.stripe.com)
2. Retrieve the API keys (Settings → API keys)
3. Configure the webhook

### Basic Environment Variables

```bash
# ============================================
# STRIPE - Basic Configuration
# ============================================

# API Keys (required)
STRIPE_SECRET_KEY=sk_live_xxx           # Secret key (server)
STRIPE_PUBLISHABLE_KEY=pk_live_xxx      # Publishable key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx  # Publishable key (client)

# Webhook (required for events)
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Product Configuration (Legacy - USD only)

```bash
# Simple prices (for backward compatibility, USD only)
NEXT_PUBLIC_STRIPE_FREE_PRICE=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

### Multi-Currency Configuration (Recommended)

#### Standard Plan

```bash
# ============================================
# STRIPE STANDARD PLAN
# ============================================

# Product ID
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=prod_xxx

# Monthly prices by currency
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_xxx

# Yearly prices by currency
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_YEARLY_PRICE_ID_CAD=price_xxx

# Setup fees / Trial amounts by currency
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_CAD=price_xxx
```

#### Premium Plan

```bash
# ============================================
# STRIPE PREMIUM PLAN
# ============================================

# Product ID
NEXT_PUBLIC_STRIPE_PREMIUM_PRODUCT_ID=prod_xxx

# Monthly prices by currency
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_CAD=price_xxx

# Yearly prices by currency
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID_CAD=price_xxx

# Setup fees / Trial amounts by currency
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_EUR=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_GBP=price_xxx
NEXT_PUBLIC_STRIPE_PREMIUM_SETUP_FEE_ID_CAD=price_xxx
```

### Creating Prices in Stripe

1. Go to **Products** → Create a product
2. Add prices for each currency:
   - Click on "Add another price"
   - Select the currency (EUR, GBP, CAD)
   - Set the equivalent amount
3. Copy each `price_xxx` into the corresponding variables

### Stripe Webhook

Configure the webhook in Stripe Dashboard:

- **URL**: `https://your-domain.com/api/stripe/webhook`
- **Events to listen**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

---

## LemonSqueezy

### Prerequisites

1. Create an account on [LemonSqueezy](https://lemonsqueezy.com)
2. Create a Store
3. Create products and variants

### Environment Variables

```bash
# ============================================
# LEMONSQUEEZY - Basic Configuration
# ============================================

# API (required)
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx

# Webhook
LEMONSQUEEZY_WEBHOOK_SECRET=xxx
LEMONSQUEEZY_WEBHOOK_URL=https://your-domain.com/api/lemonsqueezy/webhook

# Test mode
LEMONSQUEEZY_TEST_MODE=false
```

### Variant Configuration (Legacy)

```bash
# Simple variants
NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID=xxx

# Variants with setup fee (for trials)
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_WITH_SETUP_VARIANT_ID=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_WITH_SETUP_VARIANT_ID=xxx
```

### Multi-Currency Configuration

#### Standard Plan

```bash
# ============================================
# LEMONSQUEEZY STANDARD PLAN
# ============================================

# Product ID
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_PRODUCT_ID=xxx

# Monthly prices by currency
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_MONTHLY_PRICE_ID_CAD=xxx

# Yearly prices by currency
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_YEARLY_PRICE_ID_CAD=xxx

# Setup fees by currency
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_SETUP_FEE_ID_CAD=xxx
```

#### Premium Plan

```bash
# ============================================
# LEMONSQUEEZY PREMIUM PLAN
# ============================================

# Product ID
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_PRODUCT_ID=xxx

# Monthly prices by currency
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_MONTHLY_PRICE_ID_CAD=xxx

# Yearly prices by currency
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_YEARLY_PRICE_ID_CAD=xxx

# Setup fees by currency
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_USD=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_EUR=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_GBP=xxx
NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_SETUP_FEE_ID_CAD=xxx
```

---

## Polar

### Prerequisites

1. Create an account on [Polar](https://polar.sh)
2. Create an organization
3. Create subscription plans

### Environment Variables

```bash
# ============================================
# POLAR - Configuration
# ============================================

# API (required)
POLAR_ACCESS_TOKEN=xxx
POLAR_ORGANIZATION_ID=xxx

# Webhook
POLAR_WEBHOOK_SECRET=xxx

# Sandbox mode (true for testing, false for production)
POLAR_SANDBOX=true

# API URL (optional, default: api.polar.sh)
POLAR_API_URL=https://api.polar.sh

# Plan IDs
NEXT_PUBLIC_POLAR_FREE_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID=xxx
NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID=xxx

# Trial amounts (optional)
NEXT_PUBLIC_POLAR_PREMIUM_TRIAL_AMOUNT_ID=xxx
```

---

## Solidgate

:::warning Work in Progress
The Solidgate integration is currently under development. Some features may not be fully functional yet.
:::

### Prerequisites

1. Create an account on [Solidgate](https://solidgate.com)
2. Retrieve API credentials from the merchant portal
3. Configure the webhook endpoint

### Environment Variables

```bash
# ============================================
# SOLIDGATE - Configuration (WIP)
# ============================================

# API Credentials (required)
SOLIDGATE_MERCHANT_ID=xxx
SOLIDGATE_SECRET_KEY=xxx
SOLIDGATE_PUBLIC_KEY=xxx

# Webhook
SOLIDGATE_WEBHOOK_SECRET=xxx

# Environment (test or live)
SOLIDGATE_ENVIRONMENT=test
```

### Product Configuration

```bash
# ============================================
# SOLIDGATE PLANS (WIP)
# ============================================

# Product IDs
NEXT_PUBLIC_SOLIDGATE_STANDARD_PRODUCT_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_PRODUCT_ID=xxx

# Price IDs (USD only for now)
NEXT_PUBLIC_SOLIDGATE_STANDARD_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_STANDARD_YEARLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_MONTHLY_PRICE_ID=xxx
NEXT_PUBLIC_SOLIDGATE_PREMIUM_YEARLY_PRICE_ID=xxx
```

### Current Limitations

| Feature          | Status         | Notes                              |
|------------------|----------------|------------------------------------|
| Basic Payments   | ✅ Implemented | One-time and subscription payments |
| Multi-Currency   | ⚠️ Partial    | Currently USD only                 |
| Trial Periods    | ❌ Not yet     | Planned for future release         |
| Webhooks         | ⚠️ Partial    | Basic events only                  |
| Refunds          | ❌ Not yet     | Planned for future release         |

### Webhook Configuration

Configure the webhook in Solidgate Dashboard:

- **URL**: `https://your-domain.com/api/solidgate/webhook`
- **Events to listen** (currently supported):
  - `order.completed`
  - `subscription.activated`
  - `subscription.cancelled`

### Roadmap

The following features are planned for the Solidgate integration:

1. **Phase 1** (Current): Basic subscription payments in USD
2. **Phase 2**: Multi-currency support (EUR, GBP, CAD)
3. **Phase 3**: Trial periods and setup fees
4. **Phase 4**: Full webhook event handling
5. **Phase 5**: Refund management

---

## Multi-Currency

### Supported Currencies

| Code | Currency         | Symbol |
|------|------------------|--------|
| USD  | US Dollar        | $      |
| EUR  | Euro             | €      |
| GBP  | British Pound    | £      |
| CAD  | Canadian Dollar  | CA$    |

### How It Works

1. The user's currency is automatically detected (geolocation, preferences)
2. The system selects the `price_id` corresponding to the currency
3. If the currency is not configured, fallback to USD

### Usage Code

```typescript
import { getStripePriceConfig } from '@/lib/config/billing';
import { useCurrencyContext } from '@/components/context/currency-provider';

function CheckoutButton({ plan }: { plan: 'standard' | 'premium' }) {
  const { currency } = useCurrencyContext();
  
  // Automatically retrieves the correct price ID for the currency
  const priceConfig = getStripePriceConfig(plan, currency, 'monthly');
  
  return (
    <button onClick={() => createCheckout(priceConfig?.priceId)}>
      Subscribe for {priceConfig?.symbol}{price}
    </button>
  );
}
```

---

## Trials and Setup Fees

### Concept

- **Trial**: Free or discounted trial period
- **Setup Fee**: Initial fees charged at the beginning of the trial

### Configuration

```bash
# Enable trials with authorized amount
NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT=true
```

### Important: Currency Consistency

:::caution
All prices in a checkout session must be in the same currency.
:::

If you use trials with setup fees, you must create a setup fee for each currency:

```bash
# ❌ ERROR: Setup fee in USD + Main price in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_USD=price_xxx  # USD
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP

# ✅ CORRECT: Both in GBP
NEXT_PUBLIC_STRIPE_STANDARD_SETUP_FEE_ID_GBP=price_xxx  # GBP
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_xxx  # GBP
```

---

## Provider Selection

### Priority

1. **User-selected provider** (Settings)
2. **Default provider** (configuration)
3. **Fallback**: Stripe

### Default Provider Configuration

In the site configuration file:

```typescript
// In the site config
pricing: {
  provider: PaymentProvider.STRIPE  // or LEMONSQUEEZY, POLAR
}
```

### Usage Code

```typescript
import { determinePaymentProvider } from '@/lib/utils/payment-provider';
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentComponent() {
  const { getActiveProvider } = useSelectedCheckoutProvider();
  const config = useConfig();
  
  const provider = determinePaymentProvider(
    getActiveProvider(),
    config.pricing?.provider
  );
  
  // provider = 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate'
}
```

---

## Troubleshooting

### Error: Currency mismatch

```
Error: This price has currency=gbp, but other items use currency=usd
```

**Cause**: The main price and setup fee are in different currencies.

**Solution**: Create setup fees for each supported currency.

### Error: Invalid price ID

```
Error: Invalid price ID
```

**Cause**: The `price_id` does not exist or is not configured.

**Solution**: Verify that the environment variable contains a valid ID.

### Webhook is not receiving events

1. Check the webhook URL in the provider dashboard
2. Verify that `WEBHOOK_SECRET` is correct
3. Test with the provider's debugging tools

### Prices are not displaying correctly

1. Check `NEXT_PUBLIC_PRODUCT_PRICE_*` for displayed values
2. Verify that `price_id` values match the correct currencies
3. Restart the development server after modifying `.env` files

---

## Deployment Checklist

### Stripe

- [ ] Production API keys configured
- [ ] Webhook configured with production URL
- [ ] All production `price_id` values created
- [ ] Setup fees created for each currency (if trials enabled)
- [ ] Test a payment in production

### LemonSqueezy

- [ ] `LEMONSQUEEZY_TEST_MODE=false`
- [ ] Production API keys
- [ ] Webhook configured
- [ ] Production variants created

### Polar

- [ ] `POLAR_SANDBOX=false`
- [ ] Production access token
- [ ] Correct organization ID
- [ ] Plans created

### Solidgate (WIP)

:::warning
Not recommended for production until implementation is complete.
:::

- [ ] `SOLIDGATE_ENVIRONMENT=live`
- [ ] Production API credentials
- [ ] Webhook configured with production URL
- [ ] Product and price IDs created
- [ ] Test payment flow thoroughly

---

## Support

For more help:
- [Stripe Documentation](https://stripe.com/docs)
- [LemonSqueezy Documentation](https://docs.lemonsqueezy.com)
- [Polar Documentation](https://docs.polar.sh)
- [Solidgate Documentation](https://docs.solidgate.com)