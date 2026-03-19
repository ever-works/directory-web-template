---
id: billing-components
title: Billing & Payment Components
sidebar_label: Billing & Payment
sidebar_position: 2
---

# Billing & Payment Components

The billing components provide the user interface for subscription management, payment history, plan expiration warnings, and billing dashboard features. They are split between a top-level `billing/` directory for standalone components and the `settings/billing/` directory for the settings page billing UI.

## Architecture Overview

```
template/components/billing/
  expired-plan-banner.tsx     # Plan expiration warning/expired banner

template/components/settings/billing/
  index.ts                    # Barrel exports for all billing settings components
  billing-stats.tsx           # Statistics dashboard (revenue, subscribers)
  cache-status.tsx            # Billing cache status indicator
  empty-state.tsx             # Empty state components for each billing tab
  payment-card.tsx            # Individual payment transaction card
  search-and-filters.tsx      # Search and filter controls for billing lists
  subscription-actions.tsx    # Subscription management actions (cancel, renew)
  subscription-card.tsx       # Individual subscription display card
  subscription-history-card.tsx # Historical subscription entry card
  tab-navigation.tsx          # Tab switching for billing sections
```

## ExpiredPlanBanner

A versatile banner component that displays subscription expiration warnings with urgency-based styling. Supports both full-size and compact display modes.

```tsx
import { ExpiredPlanBanner } from '@/components/billing/expired-plan-banner';

<ExpiredPlanBanner
  planName="Premium Plan"
  expiresAt={new Date('2025-06-15')}
  isExpired={false}
  daysUntilExpiration={5}
  onRenewClick={() => router.push('/billing')}
  dismissible={true}
/>
```

### ExpiredPlanBannerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `planName` | `string` | required | Display name of the plan |
| `expiresAt` | `Date \| null` | required | Expiration date |
| `isExpired` | `boolean` | required | Whether plan has already expired |
| `daysUntilExpiration` | `number \| null` | required | Days until expiration (negative if expired) |
| `warningMessage` | `string \| null` | - | Custom warning text (uses default if omitted) |
| `onRenewClick` | `() => void` | - | Renew button callback (falls back to Link) |
| `dismissible` | `boolean` | `true` | Allow dismissing the banner |
| `className` | `string` | - | Additional CSS classes |
| `compact` | `boolean` | `false` | Compact inline mode |

### Urgency Levels

The banner automatically applies styling based on urgency:

| Level | Condition | Color Scheme |
|-------|-----------|--------------|
| `critical` | Expired or 1 day remaining | Red |
| `high` | 2-3 days remaining | Orange |
| `medium` | 4-7 days remaining | Amber |
| `low` | 7+ days remaining | Blue (banner hidden) |

### AutoExpiredPlanBanner

A convenience wrapper that automatically reads plan status from the `usePlanStatus` hook:

```tsx
import { AutoExpiredPlanBanner } from '@/components/billing/expired-plan-banner';

<AutoExpiredPlanBanner
  compact={false}
  onRenewClick={handleRenew}
/>
```

This component renders nothing when no warning is needed and automatically determines all display parameters from the user's current plan status.

## Settings Billing Components

### SubscriptionCard

Displays a single active subscription with plan details, status, dates, amount, and auto-renewal controls.

```tsx
import { SubscriptionCard } from '@/components/settings/billing';

<SubscriptionCard subscription={subscriptionInfo} />
```

#### SubscriptionInfo Shape

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Internal subscription ID |
| `planId` | `string` | Plan identifier |
| `planName` | `string` | Display name |
| `status` | `string` | Current status (active, trialing, past_due, cancelled, expired) |
| `startDate` | `string` | ISO date string |
| `endDate` | `string` | ISO date string |
| `nextBillingDate` | `string` | ISO date string |
| `paymentProvider` | `string` | Provider name (e.g., "stripe") |
| `subscriptionId` | `string` | Provider's subscription ID |
| `amount` | `number` | Billing amount |
| `currency` | `string` | Currency code (e.g., "USD") |
| `billingInterval` | `string` | Interval (e.g., "month", "week") |
| `currentPeriodEnd` | `string` (optional) | Current billing period end |

#### Status Configurations

| Status | Color | Icon | Label |
|--------|-------|------|-------|
| `active` | Emerald | CheckCircle | Active |
| `trialing` | Blue | Clock | Trial |
| `past_due` | Orange | AlertCircle | Past Due |
| `cancelled` | Red | AlertCircle | Cancelled |
| `expired` | Red | AlertCircle | Expired |

The card includes an auto-renewal toggle button that uses the `useAutoRenewal` hook to enable/disable automatic renewal through the payment provider's API.

### PaymentCard

Displays an individual payment transaction with amount, date, status, and payment method details.

### SubscriptionHistoryCard

Shows a historical subscription entry with plan name, dates, and final status. Used in the subscription history tab.

### BillingStats

A statistics dashboard showing key billing metrics such as total revenue, active subscribers, and payment success rates. Used in the admin billing overview.

### TabNavigation

Provides tab switching between billing sections:

- **Overview** - Summary statistics and active subscriptions
- **Subscriptions** - List of all subscriptions
- **Payments** - Payment transaction history

### SearchAndFilters

Search and filter controls specific to billing lists, allowing filtering by status, date range, and text search across subscription or payment records.

### SubscriptionActions

Management actions for individual subscriptions:

```tsx
import { SubscriptionActions } from '@/components/settings/billing';

<SubscriptionActions
  subscriptionId="sub_xxx"
  status="active"
  onCancel={handleCancel}
  onRenew={handleRenew}
/>
```

### Empty States

Four specialized empty state components for different billing contexts:

| Component | Usage |
|-----------|-------|
| `SubscriptionEmptyState` | No active subscription found |
| `PaymentsEmptyState` | No payment records |
| `SubscriptionsEmptyState` | No subscription history |
| `OverviewEmptyState` | Empty billing overview |

## Exported API

The `settings/billing/index.ts` barrel file exports:

```typescript
// Core components
export { PaymentCard } from './payment-card';
export { SubscriptionCard } from './subscription-card';
export { SubscriptionHistoryCard } from './subscription-history-card';
export { BillingStats } from './billing-stats';
export { TabNavigation } from './tab-navigation';
export { SearchAndFilters } from './search-and-filters';

// Management
export { SubscriptionActions } from './subscription-actions';

// Empty states
export {
  SubscriptionEmptyState,
  PaymentsEmptyState,
  SubscriptionsEmptyState,
  OverviewEmptyState,
} from './empty-state';
```

## Internationalization

All billing components use `next-intl` for translations:

- `useTranslations('billing')` for billing-specific strings
- `useTranslations('common')` for shared UI strings like "Close"

The `ExpiredPlanBanner` uses translation keys such as `EXPIRED_MESSAGE`, `EXPIRES_TODAY`, `EXPIRES_TOMORROW`, `EXPIRES_IN_DAYS`, `RENEW_SUBSCRIPTION`, and `MANAGE_SUBSCRIPTION`.

## Currency Formatting

The `SubscriptionCard` uses the `formatCurrencyAmount` utility from `@/lib/utils/currency-format` combined with `useLocale()` from `next-intl` to display amounts in the user's locale-appropriate currency format.

```tsx
formatCurrencyAmount(subscription.amount, subscription.currency, locale)
// Example output: "$20.00", "20,00 EUR"
```
