---
id: stripe-products-service
title: "Stripe Products Service Deep Dive"
sidebar_label: "Stripe Products Service"
sidebar_position: 47
---

# Stripe Products Service

## Overview

The Stripe Products Service provides server-side fetching, caching, and transformation of Stripe products and prices into the application's internal pricing format. When dynamic pricing is enabled, products and prices are loaded from the Stripe API instead of using hardcoded environment variables. The service supports multi-currency pricing, sponsor ad products, automatic cache management with a 5-minute TTL, and promise deduplication to prevent concurrent API requests.

## Architecture

The Stripe Products Service acts as a caching proxy between the application's pricing system and the Stripe API. It fetches products and prices, groups them, and transforms them into the internal `PricingPlans` and `PlanConfig` formats used by the pricing UI and checkout flows.

```
Pricing UI / Checkout / API Routes
        |
   stripe-products.service.ts  (cache + transform)
        |
   Stripe API (products + prices)
```

## API Reference

### Types

#### `StripePlanType`

```typescript
type StripePlanType = 'free' | 'standard' | 'premium' | 'sponsor_weekly' | 'sponsor_monthly';
```

#### `StripePrice`

```typescript
interface StripePrice {
  id: string;
  unitAmount: number;     // In cents
  currency: string;
  recurring: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  } | null;
  active: boolean;
}
```

#### `StripeProduct`

```typescript
interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  metadata: {
    plan?: StripePlanType;
    type?: 'subscription' | 'sponsor_ad';
    features?: string;         // JSON array of feature strings
    annualDiscount?: string;   // Percentage discount for annual billing
  };
  prices: StripePrice[];
  active: boolean;
}
```

#### `StripeProductsResponse`

```typescript
interface StripeProductsResponse {
  products: StripeProduct[];
  sponsorAds: { weekly: StripePrice | null; monthly: StripePrice | null };
  cached: boolean;
  cachedAt: string | null;
}
```

### Functions

#### `fetchStripeProducts(): Promise<StripeProductsResponse>`

Fetches all active products and prices from Stripe. Returns cached data if available (5-minute TTL). Uses promise deduplication to prevent concurrent requests.

**Returns:** `StripeProductsResponse` with products array, sponsor ad pricing, and cache metadata.

---

#### `getStripeSponsorAdPricing(): Promise<{ weekly: StripePrice; monthly: StripePrice } | null>`

Returns sponsor ad pricing (weekly and monthly) from Stripe. Returns `null` if either price is not configured.

---

#### `mapStripeProductsToPricingPlans(products: StripeProduct[], currency?: string): Partial<PricingPlans>`

Transforms Stripe products into the internal `PricingPlans` format for the pricing UI. Filters prices by currency and maps monthly/yearly price IDs.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `products` | `StripeProduct[]` | Products from `fetchStripeProducts` |
| `currency` | `string` | ISO currency code (default: `'usd'`) |

**Behavior:**
- Filters prices by the specified currency
- Skips paid plans that have no monthly price in the requested currency (falls back to static config)
- Parses features from JSON metadata
- Calculates annual discount from metadata or from actual price comparison
- Sets `popular: true` for the standard plan

---

#### `buildDynamicStripeConfig(products: StripeProduct[]): Record<'premium' | 'standard' | 'free', PlanConfig>`

Builds a dynamic `STRIPE_CONFIG` from fetched products, replacing the static environment variable-based configuration. Groups prices by currency and maps monthly/yearly price IDs per currency.

**Returns:** A `PlanConfig` per plan (`free`, `standard`, `premium`) with per-currency pricing.

---

#### `getDynamicStripeConfig(): Promise<Record<'premium' | 'standard' | 'free', PlanConfig> | null>`

High-level function that checks if dynamic pricing is enabled, fetches products, and builds the config. Returns `null` if dynamic pricing is disabled or no products are found.

---

#### `isStripeDynamicPricingEnabled(): boolean`

Returns `true` if the `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` environment variable is set to `'true'`.

---

#### `clearStripeProductsCache(): void`

Manually clears the in-memory products cache. Call this when configuration changes.

## Implementation Details

- **5-minute in-memory cache:** Products are cached in a module-level variable with a TTL of 5 minutes (`CACHE_TTL_MS = 300000`). The `isCacheValid` function checks both existence and freshness.
- **Promise deduplication:** When multiple requests arrive while a fetch is in progress, they all await the same promise rather than triggering multiple Stripe API calls. The `pendingFetch` variable stores the in-flight promise.
- **Auto-pagination:** Both products and prices use Stripe's `autoPagingToArray` to handle large catalogs (up to 500 products and 1,000 prices).
- **Product metadata convention:** Products in Stripe must have `metadata.plan` set to one of the `StripePlanType` values. Products without this metadata are silently skipped.
- **Sponsor ad separation:** Products with `plan: 'sponsor_weekly'` or `plan: 'sponsor_monthly'` are extracted separately from subscription products and returned in the `sponsorAds` field.
- **Multi-currency support:** The `buildDynamicStripeConfig` function groups all prices by currency and creates per-currency entries with monthly and yearly price IDs.
- **Annual discount calculation:** If `metadata.annualDiscount` is set, it is used directly. Otherwise, the discount is calculated by comparing the annual price to 12x the monthly price.
- **Currency symbols:** A small mapping (`CURRENCY_SYMBOLS`) maps currency codes to display symbols (USD=$, EUR=euro, GBP=pound, CAD=CA$).

## Database Interactions

This service does **not** interact with the database directly. It communicates exclusively with the Stripe API and provides transformed data to other services.

## Error Handling

- `fetchStripeProducts` returns an empty response (no products, no sponsor ads) on any Stripe API error, with the error logged to console.
- `getStripeClient` returns `null` and logs a warning if `STRIPE_SECRET_KEY` is not configured.
- `mapStripeProductsToPricingPlans` logs a warning and skips plans that have no monthly price in the requested currency.
- JSON parsing of the `features` metadata is wrapped in try/catch; malformed JSON defaults to an empty array.

## Usage Examples

```typescript
import {
  fetchStripeProducts,
  mapStripeProductsToPricingPlans,
  getDynamicStripeConfig,
  isStripeDynamicPricingEnabled,
  clearStripeProductsCache,
} from '@/lib/services/stripe-products.service';

// Check if dynamic pricing is enabled
if (isStripeDynamicPricingEnabled()) {
  // Fetch products (cached for 5 minutes)
  const { products, sponsorAds, cached } = await fetchStripeProducts();

  // Map to pricing plans for a specific currency
  const plans = mapStripeProductsToPricingPlans(products, 'eur');

  // Or get the full dynamic STRIPE_CONFIG
  const config = await getDynamicStripeConfig();
}

// Clear cache after config change
clearStripeProductsCache();
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key for server-side requests |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Set to `'true'` to enable dynamic pricing from Stripe |

**Stripe Product Metadata Requirements:**
| Key | Required | Values |
|-----|----------|--------|
| `plan` | Yes | `'free'`, `'standard'`, `'premium'`, `'sponsor_weekly'`, `'sponsor_monthly'` |
| `type` | No | `'subscription'` or `'sponsor_ad'` |
| `features` | No | JSON array of feature description strings |
| `annualDiscount` | No | Percentage discount for annual billing (e.g., `'20'`) |

## Related Services

- [Subscription Service](./subscription-service-deep-dive.md) -- Uses price IDs from this service for checkout
- [Currency Service](./currency-service.md) -- Provides user currency for multi-currency lookups
- [Sponsor Ad Service](./sponsor-ad-service.md) -- Uses sponsor ad pricing from this service
- [Webhook Subscription Service](./webhook-subscription-service.md) -- Processes payment events for subscriptions
