---
id: use-selected-checkout-provider-reference
title: useSelectedCheckoutProvider Hook Reference
sidebar_label: useSelectedCheckoutProvider
sidebar_position: 84
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSelectedCheckoutProvider

A client-side hook that provides access to the user-selected checkout/payment provider. Manages provider selection, validation against configured providers, and fallback logic.

**Source file:** `template/hooks/use-selected-checkout-provider.ts`

## Overview

`useSelectedCheckoutProvider` exposes the checkout provider selection that users configure through the Settings modal. It wraps the `LayoutThemeContext` to provide a clean API for components that initiate payment flows. The hook handles scenarios where the user's selected provider is no longer configured (e.g., API keys were removed) by falling back to the first available configured provider.

This is a client component hook (marked with `'use client'`).

## Signature

```ts
function useSelectedCheckoutProvider(): {
  checkoutProvider: CheckoutProvider;
  setCheckoutProvider: (provider: CheckoutProvider) => void;
  configuredProviders: CheckoutProvider[];
  getActiveProvider: () => CheckoutProvider | null;
  isProviderConfigured: (provider: CheckoutProvider) => boolean;
  isCurrentProviderConfigured: () => boolean;
  getFallbackProvider: () => CheckoutProvider | null;
}
```

## Parameters

None. This hook takes no arguments.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `checkoutProvider` | `CheckoutProvider` | The user's currently selected checkout provider |
| `setCheckoutProvider` | `(provider: CheckoutProvider) => void` | Update the selected provider |
| `configuredProviders` | `CheckoutProvider[]` | Array of all providers that have valid configuration (API keys set) |
| `getActiveProvider` | `() => CheckoutProvider \| null` | Returns the selected provider if configured, otherwise the first configured provider, or `null` |
| `isProviderConfigured` | `(provider: CheckoutProvider) => boolean` | Check if a specific provider has valid configuration |
| `isCurrentProviderConfigured` | `() => boolean` | Check if the currently selected provider is configured |
| `getFallbackProvider` | `() => CheckoutProvider \| null` | Get the first configured provider, or `null` if none are configured |

### CheckoutProvider Type

```ts
type CheckoutProvider = "stripe" | "lemonsqueezy" | "polar" | "solidgate";
```

## Implementation Details

### Provider Resolution (getActiveProvider)

The `getActiveProvider` method implements a two-step resolution:

1. **Check current selection**: If the user's `checkoutProvider` is in the `configuredProviders` list, return it.
2. **Fallback**: Otherwise, return the first item from `configuredProviders`, or `null` if no providers are configured.

This ensures the system always uses a valid provider even if the user's selection becomes invalid (e.g., after an admin removes API keys for that provider).

### State Management

The provider selection is persisted through the `LayoutThemeContext`, which manages it alongside other layout settings. Changes via `setCheckoutProvider` are immediately reflected in the context and persist across page navigations.

## Usage Examples

### Routing checkout to the active provider

```tsx
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function CheckoutButton({ plan }) {
  const { getActiveProvider } = useSelectedCheckoutProvider();

  const handleCheckout = async () => {
    const provider = getActiveProvider();

    switch (provider) {
      case 'stripe':
        await initiateStripeCheckout(plan);
        break;
      case 'lemonsqueezy':
        await initiateLemonSqueezyCheckout(plan);
        break;
      case 'polar':
        await initiatePolarCheckout(plan);
        break;
      default:
        console.error('No payment provider configured');
    }
  };

  return <button onClick={handleCheckout}>Subscribe</button>;
}
```

### Provider selector in settings

```tsx
import { useSelectedCheckoutProvider } from '@/hooks/use-selected-checkout-provider';

function PaymentProviderSettings() {
  const {
    checkoutProvider,
    setCheckoutProvider,
    configuredProviders,
    isProviderConfigured,
  } = useSelectedCheckoutProvider();

  const allProviders = ['stripe', 'lemonsqueezy', 'polar', 'solidgate'] as const;

  return (
    <div>
      <h3>Payment Provider</h3>
      <div className="space-y-2">
        {allProviders.map((provider) => (
          <label key={provider} className="flex items-center gap-2">
            <input
              type="radio"
              name="provider"
              value={provider}
              checked={checkoutProvider === provider}
              disabled={!isProviderConfigured(provider)}
              onChange={() => setCheckoutProvider(provider)}
            />
            <span>{provider}</span>
            {!isProviderConfigured(provider) && (
              <span className="text-sm text-muted">(not configured)</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}
```

### Validation before checkout

```tsx
function PricingCard({ plan }) {
  const {
    getActiveProvider,
    isCurrentProviderConfigured,
    getFallbackProvider,
  } = useSelectedCheckoutProvider();

  const handleClick = () => {
    if (!isCurrentProviderConfigured()) {
      const fallback = getFallbackProvider();
      if (!fallback) {
        toast.error('No payment provider is configured.');
        return;
      }
      toast.info(`Using ${fallback} as payment provider.`);
    }

    const provider = getActiveProvider();
    if (provider) {
      startCheckout(provider, plan);
    }
  };

  return <button onClick={handleClick}>Get {plan.name}</button>;
}
```

### Checking provider availability

```tsx
function PaymentMethodIcons() {
  const { isProviderConfigured } = useSelectedCheckoutProvider();

  return (
    <div className="flex gap-2">
      {isProviderConfigured('stripe') && <StripeIcon />}
      {isProviderConfigured('lemonsqueezy') && <LemonSqueezyIcon />}
      {isProviderConfigured('polar') && <PolarIcon />}
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `@/components/context/LayoutThemeContext` | Provides `checkoutProvider`, `setCheckoutProvider`, and `configuredProviders` state |

## Related Hooks

- [`usePricingSection`](/docs/template/hooks/use-pricing-section-reference) -- Consumes this hook for provider-aware checkout
- [`useCheckout`](/docs/template/hooks/use-checkout-reference) -- Checkout session creation
- [`usePaymentAvailability`](/docs/template/hooks/use-payment-availability-reference) -- Determines if paid plans should be shown
- [`usePaymentMethods`](/docs/template/hooks/use-payment-methods-reference) -- Manages saved payment methods
