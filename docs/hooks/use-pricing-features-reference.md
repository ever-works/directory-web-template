---
id: use-pricing-features-reference
title: usePricingFeatures Hook Reference
sidebar_label: usePricingFeatures
sidebar_position: 95
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# usePricingFeatures

A hook that provides internationalized plan features, plan configuration, and action text for the pricing page. Serves as the single source of truth for plan feature lists across the application.

**Source file:** `template/hooks/use-pricing-features.ts`

## Overview

`usePricingFeatures` centralizes all pricing plan feature definitions, plan metadata (name, period, description), and call-to-action button text. All text is internationalized through `next-intl`, using the `'pricing'` translation namespace. This hook is consumed by the pricing page components, plan cards, and the success page features hook.

## Signature

```ts
function usePricingFeatures(): PricingFeatures
```

## Parameters

None. This hook takes no arguments. It internally uses `useTranslations('pricing')` for i18n.

## Return Value

```ts
interface PricingFeatures {
  freePlanFeatures: PlanFeature[];
  standardPlanFeatures: PlanFeature[];
  premiumPlanFeatures: PlanFeature[];
  getFeaturesByPlan: (planType: PaymentPlan) => PlanFeature[];
  getPlanConfig: (planType: PaymentPlan) => PlanConfig;
  getActionText: (planType: PaymentPlan) => string;
  getNotLoggedInActionText: (planType: PaymentPlan) => string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `freePlanFeatures` | `PlanFeature[]` | Features for the free plan (9 items) |
| `standardPlanFeatures` | `PlanFeature[]` | Features for the standard plan (9 items) |
| `premiumPlanFeatures` | `PlanFeature[]` | Features for the premium plan (11 items) |
| `getFeaturesByPlan` | `(planType: PaymentPlan) => PlanFeature[]` | Returns features for any plan by type |
| `getPlanConfig` | `(planType: PaymentPlan) => PlanConfig` | Returns plan metadata (name, period, description) |
| `getActionText` | `(planType: PaymentPlan) => string` | CTA text for logged-in users |
| `getNotLoggedInActionText` | `(planType: PaymentPlan) => string` | CTA text for non-authenticated users |

### Supporting Types

```ts
type PlanFeature = {
  readonly included: boolean;
  readonly text: string;
};

interface PlanConfig {
  name: string;
  period: string;
  description: string;
}
```

## Implementation Details

### Feature Lists

Each plan has a curated list of `PlanFeature` objects with an `included` flag and translated text:

- **Free plan** (9 features): 7 included features (submit product, basic description, one image, website link, standard placement, search results, review time) and 2 excluded features (no featured, email support).
- **Standard plan** (9 features): All included (all free features, extended description, five images, verified badge, priority review, social sharing, monthly stats, priority email support, free modifications).
- **Premium plan** (11 features): All included (all standard features, sponsored position, homepage featured, sponsored badge, unlimited description, unlimited gallery, learn more button, newsletter mention, detailed analytics, phone support, unlimited submissions).

### Translation Keys

All feature text uses `next-intl` translation keys under the `pricing` namespace. Examples:

| Plan | Key Pattern | Example Key |
|------|-------------|-------------|
| Free | `FREE_PLAN_FEATURES.*` | `FREE_PLAN_FEATURES.SUBMIT_PRODUCT_SERVICE` |
| Standard | `STANDARD_PLAN_FEATURES.*` | `STANDARD_PLAN_FEATURES.VERIFIED_BADGE` |
| Premium | `PREMIUM_PLAN_FEATURES.*` | `PREMIUM_PLAN_FEATURES.UNLIMITED_GALLERY` |
| Config | `PLANS.{PLAN}.{FIELD}` | `PLANS.STANDARD.NAME` |
| Actions | Top-level keys | `GET_STARTED_FREE`, `UPGRADE_TO_STANDARD`, `GO_PREMIUM` |

### Action Text Mapping

| Plan | Logged-in CTA | Not logged-in CTA |
|------|--------------|-------------------|
| `free` | `GET_STARTED_FREE` | `SUBMIT_FOR_FREE` |
| `standard` | `UPGRADE_TO_STANDARD` | `SUBSCRIBE_NOW` |
| `premium` | `GO_PREMIUM` | `SUBSCRIBE_NOW` |

### getFeaturesByPlan

Returns the appropriate feature array based on the `PaymentPlan` value. Defaults to `freePlanFeatures` for unrecognized plan types.

## Usage Examples

### Pricing page with plan cards

```tsx
import { usePricingFeatures } from '@/hooks/use-pricing-features';
import { PaymentPlan } from '@/lib/constants';

function PricingPage() {
  const {
    freePlanFeatures,
    standardPlanFeatures,
    premiumPlanFeatures,
    getPlanConfig,
    getActionText,
  } = usePricingFeatures();

  const plans = [
    { type: PaymentPlan.FREE, features: freePlanFeatures },
    { type: PaymentPlan.STANDARD, features: standardPlanFeatures },
    { type: PaymentPlan.PREMIUM, features: premiumPlanFeatures },
  ];

  return (
    <div className="grid grid-cols-3 gap-6">
      {plans.map(({ type, features }) => {
        const config = getPlanConfig(type);
        return (
          <PlanCard
            key={type}
            name={config.name}
            description={config.description}
            period={config.period}
            features={features}
            actionText={getActionText(type)}
          />
        );
      })}
    </div>
  );
}
```

### Dynamic feature lookup

```tsx
function PlanFeatureList({ planType }: { planType: PaymentPlan }) {
  const { getFeaturesByPlan } = usePricingFeatures();
  const features = getFeaturesByPlan(planType);

  return (
    <ul>
      {features.map((feature, index) => (
        <li key={index} className="flex items-center gap-2">
          {feature.included ? (
            <CheckIcon className="text-green-500" />
          ) : (
            <XIcon className="text-gray-400" />
          )}
          <span>{feature.text}</span>
        </li>
      ))}
    </ul>
  );
}
```

### CTA button with auth awareness

```tsx
function PlanActionButton({ planType, isLoggedIn }: {
  planType: PaymentPlan;
  isLoggedIn: boolean;
}) {
  const { getActionText, getNotLoggedInActionText } = usePricingFeatures();

  const text = isLoggedIn
    ? getActionText(planType)
    : getNotLoggedInActionText(planType);

  return <button className="btn-primary">{text}</button>;
}
```

## Requirements

| Dependency | Purpose |
|------------|---------|
| `next-intl` | `useTranslations` for internationalized text |
| `@/components/pricing/plan-card` | `PlanFeature` type definition |
| `@/lib/constants` | `PaymentPlan` enum |

## Related Hooks

- [`useSuccessPageFeatures`](/template/hooks/use-success-page-features-reference) -- Adds icons/colors to these features for success pages
- [`usePricingSection`](/template/hooks/use-pricing-section-reference) -- Consumes this hook for the full pricing section
