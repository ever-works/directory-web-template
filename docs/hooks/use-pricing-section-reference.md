---
id: use-pricing-section-reference
title: usePricingSection Hook Reference
sidebar_label: usePricingSection
sidebar_position: 96
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePricingSection

The primary orchestration hook for the entire pricing section. Manages plan selection, billing intervals, checkout flows across multiple payment providers (Stripe, LemonSqueezy, Polar), currency formatting, and embedded payment form state.

**Source file:** `template/hooks/use-pricing-section.ts`

## Overview

`usePricingSection` is the largest and most complex pricing hook. It wires together user authentication, payment provider selection, plan configuration, billing interval toggling, checkout session creation, and embedded payment modal management into a single cohesive return object. It supports three payment providers (Stripe, LemonSqueezy, Polar), two billing intervals (monthly/yearly), and both redirect-based and embedded checkout flows.

The hook also supports dynamic pricing from Stripe (fetching products at runtime) and multi-currency pricing through currency-aware variant/price ID resolution.

## Signature

```ts
function usePricingSection(params?: UsePricingSectionParams): UsePricingSectionReturn
```

## Parameters

```ts
interface UsePricingSectionParams {
  onSelectPlan?: (plan: PaymentPlan) => void;
  initialSelectedPlan?: PaymentPlan | null;
  isReview?: boolean;
}
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `onSelectPlan` | `(plan: PaymentPlan) => void` | `undefined` | Callback invoked when a plan is selected |
| `initialSelectedPlan` | `PaymentPlan \| null` | `null` | Pre-select a plan on mount. Falls back to `STANDARD` if paid plans are available, `FREE` otherwise |
| `isReview` | `boolean` | `undefined` | When `true`, disables dynamic Stripe product fetching (for review/preview contexts) |

## Return Value

The hook returns an object conforming to `UsePricingSectionReturn`, which extends both `UsePricingSectionState` and `UsePricingSectionActions` plus additional data fields.

### State Properties

```ts
interface UsePricingSectionState {
  showSelector: boolean;
  billingInterval: PaymentInterval;
  processingPlan: string | null;
  selectedPlan: PaymentPlan | null;
  selectedFlow: PaymentFlow;
  isButton: boolean;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `showSelector` | `boolean` | Whether the flow selector UI is visible |
| `billingInterval` | `PaymentInterval` | Current billing interval (`'monthly'` or `'yearly'`) |
| `processingPlan` | `string \| null` | The plan ID currently being processed for checkout, or `null` |
| `selectedPlan` | `PaymentPlan \| null` | The currently selected plan |
| `selectedFlow` | `PaymentFlow` | The current payment flow type |
| `isButton` | `boolean` | `true` when `selectedFlow` is `'pay_at_end'` |

### Action Methods

```ts
interface UsePricingSectionActions {
  setShowSelector: (show: boolean | ((prev: boolean) => boolean)) => void;
  setBillingInterval: (interval: PaymentInterval) => void;
  setSelectedPlan: (plan: PaymentPlan | null) => void;
  handleFlowChange: () => void;
  handleFlowSelect: (flow: PaymentFlow) => Promise<void>;
  handleSelectPlan: (plan: PaymentPlan) => void;
  handleCheckout: (plan: PricingConfig) => Promise<void>;
  cancelCurrentProcess: () => void;
  calculatePrice: (plan: PricingConfig) => number;
  getSavingsText: (plan: PricingConfig) => string | null;
}
```

| Method | Description |
|--------|-------------|
| `setShowSelector` | Toggle or set the flow selector visibility |
| `setBillingInterval` | Switch between monthly and yearly billing |
| `setSelectedPlan` | Set the selected plan directly |
| `handleFlowChange` | Toggle the flow selector (calls `setShowSelector(prev => !prev)`) |
| `handleFlowSelect` | Select a payment flow with animation |
| `handleSelectPlan` | Select a plan and fire the `onSelectPlan` callback |
| `handleCheckout` | Initiate the full checkout process for a plan |
| `cancelCurrentProcess` | Cancel any in-progress checkout and reset state |
| `calculatePrice` | Calculate the price for a plan, applying annual discount if applicable |
| `getSavingsText` | Get savings text for yearly billing (e.g., "Save $24/year"), or `null` if not yearly |

### Additional Data

| Property | Type | Description |
|----------|------|-------------|
| `user` | `any` | Current authenticated user |
| `config` | `any` | Application configuration |
| `FREE` | `PricingConfig` | Free plan configuration (static or dynamic from Stripe) |
| `STANDARD` | `PricingConfig` | Standard plan configuration |
| `PREMIUM` | `PricingConfig` | Premium plan configuration |
| `provider` | `PaymentProvider` | Active payment provider (`'stripe'`, `'lemonsqueezy'`, or `'polar'`) |
| `freePlanFeatures` | `PlanFeature[]` | Feature list for the free plan |
| `standardPlanFeatures` | `PlanFeature[]` | Feature list for the standard plan |
| `premiumPlanFeatures` | `PlanFeature[]` | Feature list for the premium plan |
| `getPlanConfig` | `(planId: string) => PlanConfig` | Get plan metadata by ID |
| `getActionText` | `(planId: string) => string` | Get CTA text for logged-in users |
| `getNotLoggedInActionText` | `(planId: string) => string` | Get CTA text for anonymous users |
| `isLoading` | `boolean` | Whether a checkout session is being created |
| `error` | `any` | Checkout error, if any |
| `isSuccess` | `boolean` | Whether checkout session creation succeeded |
| `t` | `function` | Translation function for the `pricing` namespace |
| `tBilling` | `function` | Translation function for the `billing` namespace |
| `router` | `AppRouterInstance` | Next.js router instance |
| `loginModal` | `LoginModalStore` | Login modal state and controls |
| `currency` | `string` | Current currency code (e.g., `'USD'`, `'EUR'`) |
| `currencySymbol` | `string` | Currency symbol (e.g., `'$'`, `'\u20ac'`) |
| `formatPrice` | `(amount: number) => string` | Format a price with the current currency symbol |
| `clientSecret` | `string \| null` | Stripe SetupIntent client secret for embedded mode |
| `isReady` | `boolean` | Whether the Stripe SetupIntent is ready |

### Payment Form Modal

The `paymentForm` object manages the embedded payment form modal state:

```ts
paymentForm: {
  isOpen: boolean;
  planForPayment: PricingConfig | null;
  openPaymentForm: (plan: PricingConfig) => void;
  closePaymentForm: () => void;
  onPaymentSuccess: (paymentMethodId: string) => void;
  onPaymentError: (error: Error) => void;
  clientSecret?: string;
  checkoutUrl?: string | null;
  isReady?: boolean;
  isError?: boolean;
}
```

## Implementation Details

### Checkout Flow

The `handleCheckout` method follows this flow:

1. **Authentication check**: If no user is logged in, opens the login modal with a prompt message.
2. **Cancel previous**: If a different plan is already being processed, cancels it first.
3. **Provider routing**: Routes to the appropriate payment provider:
   - **Stripe**: Uses embedded mode (SetupIntent + subscription creation) or redirect mode (checkout session).
   - **LemonSqueezy**: Resolves currency-aware variant IDs from `getLemonSqueezyPriceConfig`, then creates a checkout session. Supports embedded overlay mode.
   - **Polar**: Resolves currency-aware price IDs from `getPolarPriceConfig`, then creates a checkout session. Supports embedded mode.
4. **Error handling**: Logs errors and shows toast notifications on failure.

### Dynamic Pricing (Stripe)

When using Stripe with dynamic pricing enabled, the hook fetches products from the Stripe API at runtime using `useStripeProducts`. Dynamic product data is merged with static config, with dynamic values taking precedence.

### Price Calculation

`calculatePrice` applies annual discounts when the billing interval is yearly:

```
annualPrice = monthlyPrice * 12
discountedPrice = round(annualPrice * (1 - annualDiscount / 100))
```

### Plan Validation

The internal `validateAndMapPlanName` function ensures plan IDs are valid before being passed to billing configuration lookups. It throws an error for unrecognized plan IDs.

## Usage Examples

### Basic pricing section

```tsx
import { usePricingSection } from '@/hooks/use-pricing-section';

function PricingSection() {
  const pricing = usePricingSection();

  return (
    <div>
      <BillingToggle
        interval={pricing.billingInterval}
        onChange={pricing.setBillingInterval}
      />
      {[pricing.FREE, pricing.STANDARD, pricing.PREMIUM]
        .filter(Boolean)
        .map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            features={pricing.getFeaturesByPlan?.(plan.id) ?? []}
            price={pricing.formatPrice(pricing.calculatePrice(plan))}
            savings={pricing.getSavingsText(plan)}
            isProcessing={pricing.processingPlan === plan.id}
            onCheckout={() => pricing.handleCheckout(plan)}
            actionText={
              pricing.user
                ? pricing.getActionText(plan.id)
                : pricing.getNotLoggedInActionText(plan.id)
            }
          />
        ))}
    </div>
  );
}
```

### With embedded payment form

```tsx
function PricingWithEmbeddedPayment() {
  const pricing = usePricingSection();
  const { paymentForm } = pricing;

  return (
    <>
      <PricingCards pricing={pricing} />

      {paymentForm.isOpen && (
        <PaymentModal
          plan={paymentForm.planForPayment}
          clientSecret={paymentForm.clientSecret}
          checkoutUrl={paymentForm.checkoutUrl}
          onSuccess={paymentForm.onPaymentSuccess}
          onError={paymentForm.onPaymentError}
          onClose={paymentForm.closePaymentForm}
        />
      )}
    </>
  );
}
```

### Pre-selected plan from URL

```tsx
function PricingPage() {
  const pricing = usePricingSection({
    initialSelectedPlan: PaymentPlan.PREMIUM,
    onSelectPlan: (plan) => {
      console.log('Plan selected:', plan);
    },
  });

  // The hook also reads `?plan=` from the URL search params
  // to auto-select a plan from external links
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@tanstack/react-query` | Checkout session mutation state |
| `next/navigation` | Router and search params |
| `next-intl` | Translations for pricing and billing |
| `next-themes` | Theme detection for dark mode checkout |
| `sonner` | Toast notifications |
| `@/hooks/use-pricing-features` | Plan features and config |
| `@/hooks/use-payment-flow` | Payment flow selection with animations |
| `@/hooks/use-create-checkout` | Stripe checkout session creation |
| `@/hooks/use-checkout-button` | LemonSqueezy checkout |
| `@/hooks/use-polar-checkout` | Polar checkout |
| `@/hooks/use-selected-checkout-provider` | User's preferred payment provider |
| `@/hooks/use-current-user` | Current user data |
| `@/hooks/use-setup-intent` | Stripe SetupIntent for embedded payments |
| `@/hooks/use-subscription` | Subscription creation |
| `@/hooks/use-payment-availability` | Determine if paid plans should be shown |
| `@/hooks/use-stripe-products` | Dynamic Stripe product fetching |
| `@/hooks/use-login-modal` | Login modal state |
| `@/components/context/currency-provider` | Current currency context |
| `@/lib/config/billing/*` | Currency-aware billing configurations |

## Related Hooks

- [`usePricingFeatures`](/docs/template/hooks/use-pricing-features-reference) -- Plan feature lists consumed by this hook
- [`useSuccessPageFeatures`](/docs/template/hooks/use-success-page-features-reference) -- Success page feature display
- [`useSelectedCheckoutProvider`](/docs/template/hooks/use-selected-checkout-provider-reference) -- Provider selection used by this hook
- [`useCheckout`](/docs/template/hooks/use-checkout-reference) -- Lower-level checkout session management
- [`usePaymentAvailability`](/docs/template/hooks/use-payment-availability-reference) -- Determines if paid plans are available
- [`useSubscription`](/docs/template/hooks/use-subscription-reference) -- Subscription lifecycle management
- [`useCurrency`](/docs/template/hooks/use-currency-reference) -- Currency selection and formatting
