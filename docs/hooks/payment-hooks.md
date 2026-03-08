---
id: payment-hooks
title: Payment & Subscription Hooks Reference
sidebar_label: Payment Hooks
sidebar_position: 3
---

# Payment & Subscription Hooks Reference

The template provides a comprehensive set of hooks for managing the full payment lifecycle across multiple providers (Stripe, LemonSqueezy, Polar, Solidgate). These hooks abstract provider-specific details behind a consistent API.

## useSubscription

Core subscription management hook supporting create, update, cancel, reactivate, and billing portal operations.

```typescript
import { useSubscription } from '@/hooks/use-subscription';

const {
  // Mutations
  createSubscription,          // useMutation instance
  updateSubscription,          // useMutation instance
  updateSubscriptionById,      // useMutation instance
  cancelSubscription,          // useMutation instance
  cancelSubscriptionById,      // useMutation instance
  reactivateSubscription,      // useMutation instance
  createBillingPortalSession,  // useMutation instance

  // Loading states
  isCreating, isUpdating, isUpdatingById,
  isCancelling, isCancellingById, isReactivating,

  // Error states
  createError, updateError, cancelError, reactivateError,

  // Success states
  isCreateSuccess, isUpdateSuccess, isCancelSuccess, isReactivateSuccess,

  // Billing portal
  isCreateBillingPortalSessionPending,

  // Reset functions
  resetCreate, resetUpdate, resetCancel, resetReactivate,
} = useSubscription();
```

**Provider-aware:** The billing portal endpoint is automatically selected based on the active provider (Stripe or Polar).

**Cache invalidation:** All mutations invalidate `['subscriptions']`, `['user-subscription']`, and `['billing']` query keys.

**Additional exports:**
- `useUserSubscription()` -- Fetches current user's subscription data
- `useSubscriptionById(id)` -- Fetches a specific subscription
- `useSubscriptionManager()` -- Optimistic update wrapper for subscription operations

## useCreateCheckoutSession

Creates Stripe checkout sessions with multi-currency support.

```typescript
import { useCreateCheckoutSession } from '@/hooks/use-create-checkout';

const {
  createCheckoutSession, // (plan, user, billingInterval) => Promise<string>
  isLoading,             // boolean
  error,                 // string | null
  isError,               // boolean
  isSuccess,             // boolean
  reset,                 // () => void
  canRetry,              // boolean
  failureCount,          // number
} = useCreateCheckoutSession();
```

**Key features:**
- Currency-aware price ID resolution via `getStripePriceConfig(planName, currency, interval)`
- Validates plan IDs against `PaymentPlan` enum (free, standard, premium)
- Automatic redirect to Stripe checkout URL on success
- Redirects to `/auth/signin` on authentication errors
- Retry logic: up to 2 retries with exponential backoff, skips auth errors

**Additional export:** `useCheckoutSessionCache()` for manual cache management.

## useBillingData

Fetches billing history and invoice data for the current user.

```typescript
import { useBillingData } from '@/hooks/use-billing-data';

const {
  billingData,     // BillingData object
  invoices,        // Invoice[]
  isLoading,
  error,
  refetch,
} = useBillingData();
```

## usePaymentFlow

Orchestrates the complete payment flow from plan selection to checkout.

```typescript
import { usePaymentFlow } from '@/hooks/use-payment-flow';

const {
  currentStep,     // 'select' | 'configure' | 'checkout' | 'success'
  selectedPlan,
  billingInterval,
  setBillingInterval,
  startCheckout,   // (plan) => void
  goBack,          // () => void
  isProcessing,
} = usePaymentFlow();
```

## usePaymentMethods

Manages saved payment methods for the authenticated user.

```typescript
import { usePaymentMethods } from '@/hooks/use-payment-methods';

const {
  paymentMethods,   // PaymentMethod[]
  defaultMethod,    // PaymentMethod | null
  isLoading,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultMethod,
} = usePaymentMethods();
```

## usePromoCode

Promo code validation and application during checkout.

```typescript
import { usePromoCode } from '@/hooks/use-promo-code';

const {
  promoCode,        // string
  setPromoCode,     // (code: string) => void
  discount,         // DiscountInfo | null
  isValidating,
  isValid,
  error,
  validateCode,     // () => Promise<void>
  clearPromo,       // () => void
} = usePromoCode();
```

## Provider-Specific Hooks

### LemonSqueezy

```typescript
import { useLemonsqueezyCheckouts } from '@/hooks/use-lemonsqueezy-checkouts';
import { useLemonsqueezySubscription } from '@/hooks/use-lemonsqueezy-subscription';
import { useLemonsqueezyQueries } from '@/hooks/use-lemonsqueezy-queries';
import { useLemonsqueezyUpdate } from '@/hooks/use-lemonsqueezy-update';
```

### Polar

```typescript
import { usePolarCheckout } from '@/hooks/use-polar-checkout';
import { usePolarSubscription } from '@/hooks/use-polar-subscription';
```

### Provider Selection

```typescript
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

const {
  selectedProvider,    // SupportedProvider
  getActiveProvider,   // () => SupportedProvider
  setProvider,         // (provider: SupportedProvider) => void
} = useSelectedCheckoutProvider();
```

```typescript
import { useProviderPayment } from '@/hooks/use-provider-payment';

const {
  createCheckout,      // provider-agnostic checkout creation
  isLoading,
  provider,            // current active provider
} = useProviderPayment();
```

## Plan & Access Control Hooks

| Hook | Purpose | Key Returns |
|------|---------|-------------|
| `usePlanGuard` | Route protection by plan level | `{ hasAccess, requiredPlan, currentPlan }` |
| `usePlanStatus` | Current plan status check | `{ plan, isActive, isTrial, expiresAt }` |
| `useAutoRenewal` | Auto-renewal toggle | `{ isAutoRenew, toggleAutoRenew }` |
| `usePaymentAvailability` | Check if payments are configured | `{ isAvailable, providers }` |
| `useStripeProducts` | Fetch Stripe product catalog | `{ products, isLoading }` |
| `useSetupIntent` | Create Stripe SetupIntent | `{ clientSecret, isLoading }` |
| `usePortal` | Billing portal session | `{ openPortal, isLoading }` |

## Pricing Display Hooks

```typescript
import { usePricingFeatures } from '@/hooks/use-pricing-features';
import { usePricingSection } from '@/hooks/use-pricing-section';
import { useCurrency } from '@/hooks/use-currency';
import { useSuccessPageFeatures } from '@/hooks/use-success-page-features';
```

These hooks manage the pricing page display including feature comparison tables, interval toggling, currency formatting, and post-checkout success pages.
