---
id: use-payment-availability-reference
title: usePaymentAvailability Hook Reference
sidebar_label: usePaymentAvailability
sidebar_position: 61
---

# usePaymentAvailability

## Overview

`usePaymentAvailability` is a React hook that determines whether payment providers are configured and what should be displayed in the UI based on the current environment mode (LIVE vs DEMO). It handles SSR hydration safely by returning a default state on the server and computing the actual availability after client-side hydration.

**Source:** `template/hooks/use-payment-availability.ts`

## Signature

```typescript
function usePaymentAvailability(): PaymentAvailability
```

### Parameters

This hook takes no parameters. It reads payment provider configuration from the `useLayoutTheme` context and environment mode from `isDemoMode()`.

## Return Values

The hook returns a `PaymentAvailability` object:

| Property | Type | Description |
|---|---|---|
| `isPaymentConfigured` | `boolean` | Whether at least one payment provider (Stripe, LemonSqueezy, etc.) is configured. |
| `isDemoMode` | `boolean` | Whether the application is running in demo mode. |
| `shouldShowPaidPlans` | `boolean` | Whether to render paid plan cards (STANDARD, PREMIUM). `true` when payment is configured OR in demo mode. |
| `shouldShowPaymentWarning` | `boolean` | Whether to display a warning that no payment provider is configured. `true` only when no payment is configured AND in demo mode. |
| `configuredProviders` | `string[]` | List of configured payment provider identifiers. |
| `isHydrated` | `boolean` | Whether the hook has completed client-side hydration. `false` during SSR. |

## Type Definitions

### PaymentAvailability

```typescript
interface PaymentAvailability {
  isPaymentConfigured: boolean;
  isDemoMode: boolean;
  shouldShowPaidPlans: boolean;
  shouldShowPaymentWarning: boolean;
  configuredProviders: string[];
  isHydrated: boolean;
}
```

## Implementation Details

### Behavior Matrix

| Environment | Payment Configured | `shouldShowPaidPlans` | `shouldShowPaymentWarning` |
|---|---|---|---|
| LIVE (`DEMO=false`) | No | `false` | `false` |
| LIVE (`DEMO=false`) | Yes | `true` | `false` |
| DEMO (`DEMO=true`) | No | `true` | `true` |
| DEMO (`DEMO=true`) | Yes | `true` | `false` |

### SSR Hydration Strategy

During server-side rendering, the hook returns a default state that shows all plans (`shouldShowPaidPlans: true`) and sets `isDemoMode: true`. This prevents layout shift when the page hydrates on the client. After the component mounts, `useEffect` sets `isHydrated` to `true`, causing the `useMemo` to recompute the actual values based on the real environment configuration.

**Default SSR State:**

```typescript
const DEFAULT_STATE: PaymentAvailability = {
  isPaymentConfigured: false,
  isDemoMode: true,
  shouldShowPaidPlans: true,
  shouldShowPaymentWarning: false,
  configuredProviders: [],
  isHydrated: false
};
```

### Dependencies

- **`useLayoutTheme()`** -- Provides `configuredProviders` from the application's theme/layout context.
- **`isDemoMode()`** -- Utility function from `@/lib/utils` that checks the current environment mode.

## Usage Examples

### Conditional Plan Display

```tsx
import { usePaymentAvailability } from '@/hooks/use-payment-availability';

function PricingPage() {
  const { shouldShowPaidPlans, shouldShowPaymentWarning } = usePaymentAvailability();

  return (
    <div>
      <FreePlanCard />
      {shouldShowPaidPlans && (
        <>
          <StandardPlanCard />
          <PremiumPlanCard />
        </>
      )}
      {shouldShowPaymentWarning && (
        <Alert variant="warning">
          No payment provider configured. Plans shown for demonstration only.
        </Alert>
      )}
    </div>
  );
}
```

### Checking Provider Configuration

```tsx
function PaymentSetupStatus() {
  const { isPaymentConfigured, configuredProviders, isHydrated } = usePaymentAvailability();

  if (!isHydrated) return null; // Wait for hydration

  if (!isPaymentConfigured) {
    return <p>Please configure a payment provider to accept payments.</p>;
  }

  return (
    <p>Active providers: {configuredProviders.join(', ')}</p>
  );
}
```

### Guarding Payment Features

```tsx
function UpgradeButton() {
  const { isPaymentConfigured, isDemoMode } = usePaymentAvailability();

  if (!isPaymentConfigured && !isDemoMode) {
    return null; // Hide upgrade button in LIVE mode without payment
  }

  return (
    <button disabled={!isPaymentConfigured}>
      {isPaymentConfigured ? 'Upgrade Now' : 'Upgrade (Demo)'}
    </button>
  );
}
```

## Related Hooks

- [`useCheckoutButton`](./use-checkout-button-reference.md) -- Handles checkout button behavior for LemonSqueezy.
- [`useCreateCheckoutSession`](./use-create-checkout-reference.md) -- Creates Stripe checkout sessions.
- [`usePlanStatus`](./use-plan-status-reference.md) -- Reads the user's current plan status and expiration details.
- [`useStripeProducts`](./use-stripe-products-reference.md) -- Fetches dynamic Stripe product data.
