---
id: pricing-pages
title: Pricing & Checkout Pages
sidebar_label: Pricing Pages
sidebar_position: 19
---

# Pricing & Checkout Pages

The Ever Works Template includes a full-featured pricing page system with multi-provider checkout support (Stripe, LemonSqueezy, Polar), billing interval toggling, dynamic pricing from Stripe products, currency formatting, plan comparison cards, sponsor ad sections, and embedded or redirect-based payment flows.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `usePricingFeatures` | `hooks/use-pricing-features.ts` | Plan configs, feature lists, and action text getters |
| `usePricingSection` | `hooks/use-pricing-section.ts` | Orchestrates all pricing state, checkout, and payment logic |
| `PricingSection` | `components/pricing/pricing-section.tsx` | Full pricing page UI with plan cards and checkout flow |
| `PlanCard` | `components/pricing/plan-card.tsx` | Individual plan display card |
| `PaymentFormModal` | `components/payment/stripe-payment-modal.tsx` | Embedded payment form modal |
| `PaymentFlowSelectorModal` | `components/payment/` | Flow selection modal (pay now vs. pay at end) |

## Plan Configuration

The system supports three plan tiers configured through `usePricingFeatures`:

| Plan | Action Text (Logged In) | Action Text (Not Logged In) |
|---|---|---|
| `free` | "Get Started Free" | "Submit for Free" |
| `standard` | "Upgrade to Standard" | "Subscribe Now" |
| `premium` | "Go Premium" | "Subscribe Now" |

### Plan Config Interface

```tsx
interface PlanConfig {
  name: string;      // Localized plan name
  period: string;    // Billing period label
  description: string; // Plan description
}
```

### Feature Lists

Each plan has a typed feature list:

```tsx
interface PlanFeature {
  included: boolean;  // Whether the feature is included
  text: string;       // Localized feature description
}
```

| Plan | Feature Count | Notable Inclusions |
|---|---|---|
| Free | 9 features | Submit product, basic description, one image, website link |
| Standard | 9 features | All free features, verified badge, priority review, monthly stats |
| Premium | 11 features | All standard features, sponsored position, homepage featured, unlimited gallery |

## The `usePricingSection` Hook

This comprehensive hook orchestrates the entire pricing page logic:

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

const pricing = usePricingSection({
  onSelectPlan: (plan) => console.log('Selected:', plan),
  initialSelectedPlan: PaymentPlan.STANDARD,
  isReview: false
});
```

### State

| Property | Type | Description |
|---|---|---|
| `showSelector` | `boolean` | Whether payment flow selector is visible |
| `billingInterval` | `PaymentInterval` | Current billing interval (monthly/yearly) |
| `processingPlan` | `string \| null` | ID of plan currently being processed |
| `selectedPlan` | `PaymentPlan \| null` | Currently selected plan |
| `selectedFlow` | `PaymentFlow` | Payment flow type (pay now vs. pay at end) |
| `isButton` | `boolean` | Whether the selected flow uses button mode |

### Actions

| Method | Description |
|---|---|
| `setBillingInterval(interval)` | Switch between monthly and yearly billing |
| `handleSelectPlan(plan)` | Select a plan and notify parent via callback |
| `handleCheckout(plan)` | Initiate checkout for a given plan configuration |
| `calculatePrice(plan)` | Calculate price based on billing interval and annual discount |
| `getSavingsText(plan)` | Get yearly savings text (e.g., "Save $24/year") |
| `cancelCurrentProcess()` | Cancel in-progress checkout and reset state |
| `formatPrice(amount)` | Format amount with currency symbol |

### Price Calculation

The hook calculates prices based on the billing interval:

```tsx
const calculatePrice = (plan: PricingConfig): number => {
  if (billingInterval !== PaymentInterval.YEARLY || !plan.annualDiscount) {
    return plan.price;
  }
  const annualPrice = plan.price * 12;
  const discountMultiplier = 1 - plan.annualDiscount / 100;
  return Math.round(annualPrice * discountMultiplier);
};
```

## Payment Providers

The system supports three payment providers, selected per-configuration or per-user preference:

| Provider | Checkout Hook | Embedded Support |
|---|---|---|
| Stripe | `useCreateCheckoutSession` | Yes (SetupIntent) |
| LemonSqueezy | `useCheckoutButton` | Yes (overlay) |
| Polar | `usePolarCheckout` | Yes (embedded URL) |

### Provider Selection

```tsx
// Provider is determined by: user setting > config default
const paymentProvider = usePaymentProvider(getActiveProvider, config.pricing);
```

### Checkout Flow

When a user clicks a plan's action button:

1. Verify the user is logged in (open login modal if not)
2. Cancel any existing checkout process
3. Determine the payment provider
4. Get the currency-aware price ID or variant ID
5. Open embedded payment form or redirect to provider checkout

```tsx
const handleCheckout = async (plan: PricingConfig) => {
  if (!user?.id) {
    loginModal.onOpen('Please sign in to continue with your purchase.');
    return;
  }

  if (paymentProvider === PaymentProvider.LEMONSQUEEZY) {
    await lemonsqueezyHook.handleSubmitWithParams({ variantId, metadata, embedded });
  } else if (paymentProvider === PaymentProvider.POLAR) {
    await polarHook.createCheckoutSession(priceId, user, plan, billingInterval);
  } else if (paymentProvider === PaymentProvider.STRIPE) {
    await stripeHook.createCheckoutSession(plan, user, billingInterval);
  }
};
```

## Dynamic Pricing (Stripe)

When Stripe is the active provider and dynamic pricing is enabled, the hook fetches live product data:

```tsx
const isDynamicPricingEnabled = paymentProvider === PaymentProvider.STRIPE
  && isStripeDynamicPricingEnabled();

const { data: stripeProductsData } = useStripeProducts({
  enabled: isDynamicPricingEnabled && !isReview
});

// Merge: dynamic values override static, but keep static as fallback
const { FREE, STANDARD, PREMIUM } = useMemo(() => {
  if (isDynamicPricingEnabled && stripeProductsData?.products?.length) {
    const dynamicPlans = mapStripeProductsToPricingPlans(stripeProductsData.products, currency);
    return {
      FREE: dynamicPlans.FREE ?? staticPlans.FREE,
      STANDARD: dynamicPlans.STANDARD ?? staticPlans.STANDARD,
      PREMIUM: dynamicPlans.PREMIUM ?? staticPlans.PREMIUM
    };
  }
  return staticPlans;
}, [isDynamicPricingEnabled, stripeProductsData, staticPlans, currency]);
```

## Currency Support

The pricing system supports multi-currency display:

```tsx
const { currency } = useCurrencyContext();
const currencySymbol = getCurrencySymbol(currency);
const formatPrice = (amount: number) => formatAmountWithSymbol(amount, currency);
```

Currency-aware variant IDs are resolved through provider-specific config functions:

| Provider | Config Function |
|---|---|
| LemonSqueezy | `getLemonSqueezyPriceConfig(planName, currency, interval)` |
| Polar | `getPolarPriceConfig(planName, currency, interval)` |

## Payment Form Modal

The embedded payment form supports all three providers:

```tsx
<PaymentFormModal
  isOpen={paymentForm.isOpen}
  onClose={paymentForm.closePaymentForm}
  onSuccess={paymentForm.onPaymentSuccess}
  onError={paymentForm.onPaymentError}
  planName={paymentForm.planForPayment?.name}
  planPrice={formatPrice(calculatePrice(paymentForm.planForPayment))}
  amount={calculatePrice(paymentForm.planForPayment)}
  currency={currency}
  clientSecret={clientSecret}
  checkoutUrl={paymentForm.checkoutUrl}
  provider={provider}
  theme={theme}
/>
```

## Pricing Section Component

The `PricingSection` component renders the full pricing page:

```tsx
<PricingSection
  onSelectPlan={(plan) => handlePlanSelect(plan)}
  isReview={false}
  initialSelectedPlan={PaymentPlan.STANDARD}
/>
```

### Visual Features

| Feature | Description |
|---|---|
| Billing interval toggle | Animated slider between Monthly and Yearly |
| Plan cards grid | Responsive 1-column (mobile) to 3-column (desktop) layout |
| Popular badge | Standard plan is marked as "popular" with glow effects |
| Savings badges | Green pills showing yearly savings when applicable |
| Trust indicators | Icons for "No Hidden Fees", "Instant Activation", "Premium Support" |
| Sponsor ads section | Animated radar circles with pricing for sponsored placement |
| Continue section | Shown after plan selection with call-to-action |

### Conditional Rendering

The component conditionally shows paid plans based on payment availability:

```tsx
const { shouldShowPaidPlans } = usePaymentAvailability();

// Grid adapts: 3-column for paid plans, 1-column for free-only
<div className={cn(
  'grid gap-6',
  shouldShowPaidPlans ? 'grid-cols-1 md:grid-cols-3 max-w-6xl' : 'grid-cols-1 max-w-md'
)}>
```

## Internationalization

All user-facing strings use `next-intl` with two translation namespaces:

| Namespace | Usage |
|---|---|
| `pricing` | Plan names, features, page content, sponsor section |
| `billing` | Monthly/Yearly labels, processing states, error messages |

## Key Files

| File | Path |
|---|---|
| Pricing Features Hook | `hooks/use-pricing-features.ts` |
| Pricing Section Hook | `hooks/use-pricing-section.ts` |
| Pricing Section Component | `components/pricing/pricing-section.tsx` |
| Plan Card Component | `components/pricing/plan-card.tsx` |
| Payment Form Modal | `components/payment/stripe-payment-modal.tsx` |
| Payment Constants | `lib/constants.ts` |
| Pricing Config Type | `lib/content.ts` |
