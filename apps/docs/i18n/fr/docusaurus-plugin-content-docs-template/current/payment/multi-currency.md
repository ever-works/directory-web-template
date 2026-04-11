---
id: multi-currency
title: Intégration multi-devises
sidebar_label: Multi-devises
sidebar_position: 5
---

# Intégration multi-devises

This document explains how the multi-currency system is integrated into the application and how it works with payment providers (Stripe, LemonSqueezy, and Polar).

## Architecture

The multi-currency system works at multiple levels:

1. **Base Configuration** (`lib/types.ts`): Default configuration with multi-currency support
2. **ConfigProvider** (`app/[locale]/config.tsx`): Enriches the config with the user's currency
3. **Checkout Hooks**: Use multi-currency configs to get the correct price IDs

## Data Flow

```
CurrencyProvider (user currency)
    ↓
ConfigProvider (enriches config.pricing with currency)
    ↓
usePricingSection / useCreateCheckoutSession
    ↓
getStripePriceConfig / getLemonSqueezyPriceConfig (currency + plan)
    ↓
Correct Price ID for the user's currency
```

## Modified Files

### 1. `app/[locale]/config.tsx`
- Uses `useCurrencyContext()` to get the user's currency
- Automatically generates a pricing config based on currency if no config is provided
- Uses `getDefaultPricingConfigWithCurrency()` to create a multi-currency config

### 2. `hooks/use-create-checkout.ts`
- Uses `useCurrencyContext()` to get the currency
- Calls `getStripePriceConfig()` to get the correct price ID based on currency
- Falls back to `plan.stripePriceId` if multi-currency config is not available

### 3. `hooks/use-pricing-section.ts`
- Uses `useCurrencyContext()` to get the currency
- Calls `getLemonSqueezyPriceConfig()` for LemonSqueezy
- Uses currency-based price IDs at checkout time

## Usage

### For Developers

The system works automatically. No modifications are needed in existing components.

**Usage example in a component:**

```tsx
import { useConfig } from '@/app/[locale]/config';
import { useCurrencyContext } from '@/components/context/currency-provider';

function PricingComponent() {
  const config = useConfig();
  const { currency } = useCurrencyContext();
  
  // config.pricing is automatically enriched with the user's currency
  // Price IDs are based on the user's currency
  const standardPlan = config.pricing?.plans.STANDARD;
  
  // Currency symbol is automatically updated
  const currencySymbol = config.pricing?.currency; // €, £, $, etc.
}
```

### For Checkout Hooks

Checkout hooks automatically use multi-currency configs:

```tsx
// In useCreateCheckoutSession (Stripe)
const currencyPriceConfig = getStripePriceConfig(planName, currency, interval);
const priceId = currencyPriceConfig?.priceId || plan.stripePriceId;

// In usePricingSection (LemonSqueezy)
const currencyVariantConfig = getLemonSqueezyPriceConfig(planName, currency, interval);
const variantId = currencyVariantConfig?.priceId || plan.lemonVariantId;
```

## Environment Variables Configuration

For the system to work, you must configure environment variables for each currency in:

- `lib/config/billing/stripe.config.ts`: `NEXT_PUBLIC_STRIPE_*_PRICE_ID_*` variables
- `lib/config/billing/lemonsqueezy.config.ts`: `NEXT_PUBLIC_LEMONSQUEEZY_*_PRICE_ID_*` variables

**Example for Stripe:**
```env
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=price_xxx
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=price_yyy
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_GBP=price_zzz
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_CAD=price_aaa
```

## Supported Currencies

Supported currencies are defined in `lib/config/billing/types.ts`:

- USD, EUR, GBP, CAD (configured in billing configs)
- Other ISO 4217 currencies (fallback to USD)

## Fallback

If a currency is not supported or if multi-currency configs are not available:

1. The system uses `plan.stripePriceId` / `plan.lemonVariantId` (static config)
2. Default currency is USD
3. Default symbol is $

## Testing

To test the multi-currency system:

1. Change the user's currency via `/api/user/currency`
2. Verify that price IDs change according to the currency
3. Test checkout with different currencies

## Important Notes

- Price IDs are resolved **at checkout time**, not at display time
- The pricing config in `content/config.yml` takes priority over the default config
- Multi-currency configs are only used if environment variables are configured

## Integration with Payment Providers

The multi-currency system works seamlessly with all payment providers:

- **Stripe**: Uses `getStripePriceConfig()` to get currency-specific price IDs
- **LemonSqueezy**: Uses `getLemonSqueezyPriceConfig()` to get currency-specific variant IDs
- **Polar**: Supports multi-currency through product configuration

For detailed provider-specific configuration, see:
- [Stripe Configuration](./stripe)
- [LemonSqueezy Configuration](./lemonsqueezy)
- [Polar Configuration](./polar)