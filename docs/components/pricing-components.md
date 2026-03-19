---
id: pricing-components
title: Pricing Components
sidebar_label: Pricing Components
sidebar_position: 34
---

# Pricing Components

The pricing page components live in `components/pricing/` and render a plan selection interface with billing interval toggles, feature comparison, and payment flow options.

## File Structure

```
components/pricing/
  pricing-section.tsx   # Main PricingSection orchestrator
  plan-card.tsx         # Individual plan card component
```

## PricingSection

The main orchestrator component that renders the complete pricing page layout.

### Props

```ts
interface PricingSectionProps {
    onSelectPlan?: (plan: PaymentPlan) => void;
    isReview?: boolean;
    initialSelectedPlan?: PaymentPlan;
}
```

`PricingSection` delegates its state management to the `usePricingSection` hook, which handles plan selection, billing intervals, and payment flow logic. The component renders:

1. A header with title and description
2. A billing interval toggle (monthly/yearly)
3. Three plan cards (Free, Standard, Premium) in a responsive grid
4. An optional sponsor/ads section below the plans

### Usage

```tsx
import { PricingSection } from "@/components/pricing/pricing-section";

function PricingPage() {
    return (
        <PricingSection
            onSelectPlan={(plan) => console.log("Selected:", plan)}
            isReview={false}
        />
    );
}
```

---

## PlanCard

A single pricing plan card displaying the plan title, price, feature list, and action button.

### Props

```ts
interface PlanCardProps {
    plan?: PaymentPlan;
    title: string;
    price: string;
    priceUnit?: string;
    features: readonly PlanFeature[];
    isPopular?: boolean;
    isSelected: boolean;
    onSelect?: (plan: PaymentPlan) => void;
    actionText: string;
    actionVariant?: "default" | "outline-solid";
    actionHref?: string;
    children?: ReactNode;
    isButton?: boolean;
    onClick?: () => void;
    isLoading?: boolean;
    className?: string;
    selectedFlow?: PaymentFlow;
    onFlowChange?: (flow: PaymentFlow) => void;
    onOpenModal?: () => void;
}
```

### PlanFeature Type

```ts
type PlanFeature = {
    readonly included: boolean;
    readonly text: string;
};
```

Features render as a list with green checkmarks for included items and red X marks for excluded items. Excluded items also display with a line-through style.

### Visual Differentiation

The card applies different styles based on the plan title:

| Plan | Card Style | Button Style |
|---|---|---|
| Free | Standard border and shadow | Transparent with border |
| Standard / Popular | Scaled up with gradient border overlay, "Most Popular" badge | Gradient primary background |
| Premium | Standard border and shadow | Transparent with border |

The Standard/Popular card uses CSS pseudo-elements (`::before`, `::after`) to create gradient border and overlay effects that reference `--theme-primary-*` CSS custom properties.

### Payment Flow Toggle

Paid plans (Standard and Premium) can display a `ToggleGroup` allowing users to switch between "Pay Now" and "Pay Later" flows:

```ts
const PAYMENT_FLOW_OPTIONS = [
    { value: PaymentFlow.PAY_AT_START, label: "Pay Now" },
    { value: PaymentFlow.PAY_AT_END, label: "Pay Later" },
];
```

An info button next to the toggle can open a modal via `onOpenModal`.

### Action Button

The footer renders a `Button` component from `@/components/ui/button`. When `isButton` is true, clicking navigates to `actionHref` via Next.js router. Otherwise, the `onClick` callback fires. Loading state displays a spinning indicator with "Processing..." text.

### Card Structure

```
article.relative.flex.flex-col
  div  -- "Most Popular" badge (Standard/popular plans only)
  header  -- Title, payment flow toggle, price, optional children
  section  -- Feature list with check/x icons
  footer  -- Action button (pinned to bottom via mt-auto)
```

### Responsive Layout

Plan cards are typically displayed in a three-column grid by the parent `PricingSection`. The Standard card uses `scale-105 z-10` to visually elevate it above its siblings, with a `mt-6` offset to align with the badge.

---

## Key Dependencies

- `@/components/ui/button` -- The shared Button component
- `@/components/ui/toggle-group` -- For payment flow selection
- `@/lib/constants` -- `PaymentPlan` and `PaymentFlow` enums
- `lucide-react` -- `Check`, `X`, `Info` icons
- `next/navigation` -- Router for action button navigation
