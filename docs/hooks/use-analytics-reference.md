---
id: use-analytics-reference
title: useAnalytics Hook Reference
sidebar_label: useAnalytics
sidebar_position: 38
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useAnalytics

Provides a stable, memoized interface for tracking events, conversions, and user actions through the analytics provider. Wraps the `@/lib/analytics` module with React-friendly `useCallback` wrappers for optimal performance in component trees.

**Source:** `template/hooks/use-analytics.ts`

## Return Values

```ts
const {
  trackEvent,        // (eventName: string, properties?: EventProperties) => void
  trackConversion,   // (conversionName: string, properties?: EventProperties) => void
  trackUserAction,   // (action: string, properties?: EventProperties) => void
  identifyUser,      // (userId: string, properties?: EventProperties) => void
  setUserProperties, // (properties: EventProperties) => void
} = useAnalytics();
```

### Type

```ts
type EventProperties = Record<string, any>;
```

## Methods

### trackEvent

Sends a general-purpose analytics event with the exact `eventName` provided.

```ts
trackEvent(eventName: string, properties?: EventProperties): void
```

**Example:**

```tsx
const { trackEvent } = useAnalytics();

trackEvent('button_clicked', { buttonId: 'submit', page: 'checkout' });
trackEvent('page_viewed', { path: '/pricing', referrer: document.referrer });
trackEvent('search_performed', { query: 'react hooks', results: 42 });
```

### trackConversion

Tracks a conversion event. The event name is automatically prefixed with `conversion_` and enriched with a `conversion_type` and `timestamp` property.

```ts
trackConversion(conversionName: string, properties?: EventProperties): void
```

The actual event sent to the analytics provider is:

```ts
{
  eventName: `conversion_${conversionName}`,
  properties: {
    ...properties,
    conversion_type: conversionName,
    timestamp: new Date().toISOString(),
  }
}
```

**Example:**

```tsx
const { trackConversion } = useAnalytics();

trackConversion('signup_completed', { plan: 'pro', source: 'landing_page' });
trackConversion('purchase_completed', { amount: 99.99, currency: 'USD' });
trackConversion('trial_started', { plan: 'enterprise' });
```

### trackUserAction

Tracks a user interaction. The event name is automatically prefixed with `user_action_` and enriched with `action_type` and `timestamp` properties.

```ts
trackUserAction(action: string, properties?: EventProperties): void
```

The actual event sent:

```ts
{
  eventName: `user_action_${action}`,
  properties: {
    ...properties,
    action_type: action,
    timestamp: new Date().toISOString(),
  }
}
```

**Example:**

```tsx
const { trackUserAction } = useAnalytics();

trackUserAction('profile_updated', { fields: ['name', 'email'] });
trackUserAction('theme_changed', { from: 'light', to: 'dark' });
trackUserAction('filter_applied', { category: 'productivity', tags: ['free'] });
```

### identifyUser

Associates the current session with a user identity. Call this after authentication to link subsequent events to the user.

```ts
identifyUser(userId: string, properties?: EventProperties): void
```

**Example:**

```tsx
const { identifyUser } = useAnalytics();

// After successful login
identifyUser(user.id, {
  name: user.name,
  email: user.email,
  plan: user.subscription?.plan,
  createdAt: user.createdAt,
});
```

### setUserProperties

Updates properties on the currently identified user without sending an event.

```ts
setUserProperties(properties: EventProperties): void
```

**Example:**

```tsx
const { setUserProperties } = useAnalytics();

// After plan upgrade
setUserProperties({
  plan: 'enterprise',
  upgraded_at: new Date().toISOString(),
});
```

## Usage: Page View Tracking

```tsx
function PageTracker({ pageName }: { pageName: string }) {
  const { trackEvent } = useAnalytics();
  const pathname = usePathname();

  useEffect(() => {
    trackEvent('page_viewed', {
      page: pageName,
      path: pathname,
      timestamp: new Date().toISOString(),
    });
  }, [pathname, pageName, trackEvent]);

  return null;
}
```

## Usage: Checkout Conversion Funnel

```tsx
function CheckoutFlow() {
  const { trackConversion, trackUserAction } = useAnalytics();

  const handleAddToCart = (item) => {
    trackUserAction('add_to_cart', { itemId: item.id, price: item.price });
  };

  const handleCheckoutStart = () => {
    trackConversion('checkout_started', { cartTotal: calculateTotal() });
  };

  const handlePurchaseComplete = (orderId) => {
    trackConversion('purchase_completed', {
      orderId,
      total: calculateTotal(),
      items: cartItems.length,
    });
  };

  // ...
}
```

## Usage: Auth Flow Tracking

```tsx
function AuthProvider({ children }) {
  const { identifyUser, setUserProperties, trackConversion } = useAnalytics();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, {
        name: user.name,
        email: user.email,
        role: user.role,
      });
    }
  }, [user, identifyUser]);

  const handleSignUp = async (formData) => {
    const newUser = await createAccount(formData);
    identifyUser(newUser.id, { name: newUser.name, email: newUser.email });
    trackConversion('signup_completed', { method: 'email' });
  };

  return children;
}
```

## Performance

All returned functions are wrapped in `useCallback` with empty dependency arrays, ensuring stable references across re-renders. This makes them safe to include in dependency arrays of `useEffect`, `useMemo`, and other hooks without causing unnecessary re-executions.

## Configuration

The hook delegates to the `analytics` singleton from `@/lib/analytics`. This module must be initialized with your analytics provider (e.g., PostHog, Mixpanel, or a custom implementation) before the hook is used.

The analytics module exposes the following interface that `useAnalytics` wraps:

| Analytics Method | Hook Method |
|-----------------|-------------|
| `analytics.track()` | `trackEvent`, `trackConversion`, `trackUserAction` |
| `analytics.identify()` | `identifyUser` |
| `analytics.setUserProperties()` | `setUserProperties` |

## Error Handling

The hook does not throw errors. If the analytics provider is not initialized or encounters an error, the underlying `analytics` module handles failures silently to prevent analytics issues from breaking the UI.

## Related Hooks

- [`useGeoAnalytics`](/docs/template/hooks/data-hooks) - Geolocation-specific analytics
- [`useCurrentUser`](/docs/template/hooks/use-current-user-reference) - User data for `identifyUser`
- [`useFeatureFlag`](/docs/template/hooks/use-feature-flags-reference) - Feature flags via analytics provider
