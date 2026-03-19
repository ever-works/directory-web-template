---
id: settings-components
title: Settings Components
sidebar_label: Settings
sidebar_position: 4
---

# Settings Components

The settings components provide the user interface for account configuration, including billing management, location settings, and security controls. They are organized into subdirectories by concern.

## Architecture Overview

```
template/components/settings/
  billing/                       # Billing settings sub-components
    billing-stats.tsx            # Revenue and subscriber statistics
    cache-status.tsx             # Billing data cache indicator
    empty-state.tsx              # Empty state variants for billing tabs
    index.ts                     # Barrel exports
    payment-card.tsx             # Payment transaction card
    search-and-filters.tsx       # Billing list search/filter controls
    subscription-actions.tsx     # Cancel/renew subscription actions
    subscription-card.tsx        # Active subscription card
    subscription-history-card.tsx # Past subscription entry card
    tab-navigation.tsx           # Billing section tab switcher
  LocationSettingsForm.tsx       # Location feature configuration form
  security/
    change-password-form.tsx     # Password change form
    index.ts                     # Security barrel exports
    security-overview.tsx        # Security dashboard with metrics
```

## LocationSettingsForm

Provides the admin interface for configuring location-based features across the directory.

```tsx
import { LocationSettingsForm } from '@/components/settings/LocationSettingsForm';

<LocationSettingsForm />
```

This form manages settings such as:

- Enabling/disabling location features globally
- Map provider selection (Mapbox or Google Maps)
- Whether to require location on directory submissions
- Whether to show exact addresses publicly
- Default map zoom level and center coordinates

## Security Components

### SecurityOverview

A dashboard card displaying key security metrics for the user's account. Uses the `useSecuritySettings` and `useSecurityCache` hooks for data fetching with React Query.

```tsx
import { SecurityOverview } from '@/components/settings/security';

<SecurityOverview />
```

#### Security Metrics Displayed

| Metric | Icon | Status Logic |
|--------|------|--------------|
| Account Status | CheckCircle | Good (secure), Warning (failed attempts), Danger (locked) |
| Two-Factor Authentication | Smartphone | Good (enabled), Warning (disabled) |
| Last Password Change | Clock | Good (under 30d), Warning (30-90d), Danger (over 90d or never) |
| Active Sessions | Shield | Good (5 or fewer), Warning (over 5 devices) |

Each metric uses a `SecurityMetric` sub-component with consistent styling:

```tsx
interface SecurityMetricProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  status: "good" | "warning" | "danger";
  description?: string;
}
```

#### Status Color Mapping

| Status | Background | Text |
|--------|-----------|------|
| `good` | Green 50/900 | Green 600/400 |
| `warning` | Yellow 50/900 | Yellow 600/400 |
| `danger` | Red 50/900 | Red 600/400 |

#### Loading and Error States

The component provides:
- **Skeleton loading**: Renders 4 metric placeholders with animated pulse
- **Error state**: Red-bordered card with error message and retry button
- **Refresh**: Manual refresh button that invalidates the React Query cache

```tsx
// Internal error handling
const { data: settings, isLoading, error, refetch, isRefetching } = useSecuritySettings();
const { invalidateSecuritySettings } = useSecurityCache();
```

#### Password Expiration Alert

When `settings.passwordExpiresAt` is set, an additional blue info banner appears showing the expiration date.

### ChangePasswordForm

Form component for updating the user's password with fields for:

- Current password
- New password
- Confirm new password

Includes validation for password strength requirements and confirmation matching.

## Billing Settings Components

The billing subdirectory contains all settings page billing components. See the [Billing & Payment Components](./billing-components) page for complete documentation of these components, including:

- `SubscriptionCard` - Active subscription display with auto-renewal toggle
- `PaymentCard` - Individual payment transaction display
- `SubscriptionHistoryCard` - Historical subscription entries
- `BillingStats` - Revenue and subscriber metrics
- `TabNavigation` - Section tab switcher
- `SearchAndFilters` - List filtering controls
- `SubscriptionActions` - Cancel/renew management
- Empty state components for each tab

### Barrel Exports

The `settings/billing/index.ts` provides clean imports:

```typescript
import {
  SubscriptionCard,
  PaymentCard,
  BillingStats,
  TabNavigation,
  SearchAndFilters,
  SubscriptionActions,
  SubscriptionEmptyState,
  PaymentsEmptyState,
} from '@/components/settings/billing';
```

### Security Barrel Exports

The `settings/security/index.ts` exports:

```typescript
export { ChangePasswordForm } from './change-password-form';
export { SecurityOverview } from './security-overview';
```

## Hooks Used

The settings components rely on several custom hooks:

| Hook | Source | Purpose |
|------|--------|---------|
| `useSecuritySettings` | `@/hooks/use-security-settings` | Fetch security metrics via React Query |
| `useSecurityCache` | `@/hooks/use-security-settings` | Cache invalidation for security data |
| `useAutoRenewal` | `@/hooks/use-auto-renewal` | Toggle subscription auto-renewal |
| `useLocationSettings` | `@/hooks/use-location-settings` | Read/write location feature settings |

## UI Component Dependencies

Settings components use shared UI primitives from `@/components/ui/`:

| Component | Usage |
|-----------|-------|
| `Card`, `CardContent`, `CardHeader`, `CardTitle` | Section containers |
| `Button` | Action buttons and refresh controls |
| `Skeleton` | Loading placeholder animations |

Icons are sourced from `lucide-react`:
- `Shield`, `Clock`, `Smartphone`, `AlertTriangle`, `CheckCircle`, `RefreshCw` for security metrics
- `Calendar`, `CreditCard` for billing displays

## Integration Example

```tsx
import { SecurityOverview } from '@/components/settings/security';
import { SubscriptionCard, BillingStats, TabNavigation } from '@/components/settings/billing';

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <SecurityOverview />

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'overview' && <BillingStats />}
      {activeTab === 'subscriptions' && (
        <SubscriptionCard subscription={currentSubscription} />
      )}
    </div>
  );
}
```
