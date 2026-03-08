---
id: use-success-page-features-reference
title: useSuccessPageFeatures Hook Reference
sidebar_label: useSuccessPageFeatures
sidebar_position: 94
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# useSuccessPageFeatures

A hook that provides plan features with associated icons and colors for display on checkout success pages.

**Source file:** `template/hooks/use-success-page-features.ts`

## Overview

`useSuccessPageFeatures` extends the base `usePricingFeatures` hook by mapping each plan feature to an appropriate Lucide icon and a Tailwind color class. This enables success pages to show users a visually rich summary of what their selected plan includes. The feature text is sourced directly from `usePricingFeatures` to ensure consistency with pricing pages.

## Signature

```ts
function useSuccessPageFeatures(): {
  getPlanFeaturesWithIcons: (planType: PaymentPlan) => SuccessPageFeature[];
}
```

## Parameters

None. This hook takes no arguments.

## Return Value

| Property | Type | Description |
|----------|------|-------------|
| `getPlanFeaturesWithIcons` | `(planType: PaymentPlan) => SuccessPageFeature[]` | Returns features for a plan with associated icons and colors |

### SuccessPageFeature Interface

```ts
interface SuccessPageFeature {
  icon: any;       // Lucide React icon component
  text: string;    // Feature description text (from usePricingFeatures)
  color: string;   // Tailwind CSS color class (e.g., "text-blue-400")
}
```

### PaymentPlan Enum

```ts
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

## Implementation Details

### Icon Mapping

Each plan has a predefined array of icon/color pairs, indexed positionally to match the features from `usePricingFeatures`:

**Free Plan Icons:**
| Index | Icon | Color |
|-------|------|-------|
| 0 | `FileText` | `text-blue-400` |
| 1 | `ImageIcon` | `text-green-400` |
| 2 | `Globe` | `text-purple-400` |
| 3-4 | `Eye` | `text-orange-400` |
| 5 | `Clock` | `text-gray-400` |
| 6-7 | `Mail` | `text-red-400` |

**Standard Plan Icons:**
| Index | Icon | Color |
|-------|------|-------|
| 0-1 | `FileText` | `text-blue-400` |
| 2 | `ImageIcon` | `text-green-400` |
| 3 | `Shield` | `text-yellow-400` |
| 4 | `Zap` | `text-purple-400` |
| 5 | `Share2` | `text-orange-400` |
| 6 | `BarChart3` | `text-pink-400` |
| 7 | `Mail` | `text-red-400` |
| 8 | `FileText` | `text-cyan-400` |

**Premium Plan Icons:**
| Index | Icon | Color |
|-------|------|-------|
| 0-1 | `TrendingUp` | `text-yellow-400` |
| 2 | `Star` | `text-blue-400` |
| 3 | `Shield` | `text-green-400` |
| 4 | `Video` | `text-purple-400` |
| 5 | `ImageIcon` | `text-orange-400` |
| 6 | `Globe` | `text-pink-400` |
| 7 | `Mail` | `text-cyan-400` |
| 8 | `BarChart3` | `text-red-400` |
| 9 | `Phone` | `text-indigo-400` |
| 10 | `Zap` | `text-green-400` |

Any feature index beyond the predefined list falls back to `FileText` with `text-gray-400`.

### Data Consistency

The hook uses the exact same feature text strings from `usePricingFeatures.getFeaturesByPlan()`. It only adds visual metadata (icon and color). This ensures that feature descriptions on the success page always match those on the pricing page.

## Usage Examples

### Success page feature list

```tsx
import { useSuccessPageFeatures } from '@/hooks/use-success-page-features';
import { PaymentPlan } from '@/lib/constants';

function CheckoutSuccessPage({ plan }: { plan: PaymentPlan }) {
  const { getPlanFeaturesWithIcons } = useSuccessPageFeatures();
  const features = getPlanFeaturesWithIcons(plan);

  return (
    <div className="space-y-3">
      <h2>Your plan includes:</h2>
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div key={index} className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${feature.color}`} />
            <span>{feature.text}</span>
          </div>
        );
      })}
    </div>
  );
}
```

### Conditional rendering by plan

```tsx
function SuccessContent({ planType }: { planType: PaymentPlan }) {
  const { getPlanFeaturesWithIcons } = useSuccessPageFeatures();
  const features = getPlanFeaturesWithIcons(planType);

  return (
    <div>
      <h3>
        {planType === PaymentPlan.PREMIUM && 'Premium'}
        {planType === PaymentPlan.STANDARD && 'Standard'}
        {planType === PaymentPlan.FREE && 'Free'}
        {' '}Plan Features
      </h3>
      <ul>
        {features.map((feature, i) => {
          const Icon = feature.icon;
          return (
            <li key={i} className="flex items-center gap-2 py-1">
              <Icon className={`h-4 w-4 ${feature.color}`} />
              <span className="text-sm">{feature.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `lucide-react` | Icon components (`FileText`, `Shield`, `Zap`, etc.) |
| `usePricingFeatures` | Source of truth for feature text per plan |
| `@/lib/constants` | `PaymentPlan` enum |

## Related Hooks

- [`usePricingFeatures`](/docs/template/hooks/use-pricing-features-reference) -- Base hook providing feature text and plan config
- [`usePricingSection`](/docs/template/hooks/use-pricing-section-reference) -- Full pricing section logic including checkout
