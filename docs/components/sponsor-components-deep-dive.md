---
id: sponsor-components-deep-dive
title: Sponsor Components Deep Dive
sidebar_label: Sponsor Deep Dive
sidebar_position: 41
---

# Sponsor Components Deep Dive

The `components/sponsor-ads/` directory implements a complete sponsored listing system. It includes ad display cards, a multi-step creation form, a context provider for fetching active sponsors, and visual badge indicators. Sponsors pay for premium visibility and their items rotate in designated ad slots.

## Architecture Overview

```
components/sponsor-ads/
  index.ts                  # Barrel exports for all components and context
  sponsor-ads-context.tsx   # React context + provider for active sponsor data
  sponsor-card.tsx          # Ad display card with rotation and two variants
  sponsor-form.tsx          # Multi-step sponsor creation form
  sponsor-badge.tsx         # "Sponsored" indicator badge
  sidebar-sponsor.tsx       # Sidebar-positioned sponsor ad slot
```

## SponsorAdsContext

The context provider fetches active sponsor ads via the `useActiveSponsorAds` hook and makes them available throughout the component tree.

```ts
interface SponsorAdsContextValue {
  sponsors: SponsorWithItem[];
  isLoading: boolean;
  isError: boolean;
}

interface SponsorWithItem {
  id: string;
  itemSlug: string;
  interval: "weekly" | "monthly";
  status: "active" | "pending" | "expired";
  startDate: string;
  endDate: string;
  item: ItemData | null;  // Server-side joined item data
}
```

### Provider Setup

```tsx
import { SponsorAdsProvider } from "@/components/sponsor-ads";

<SponsorAdsProvider limit={10}>
  <ListingPage />
</SponsorAdsProvider>
```

The `useSponsorAdsContext()` hook returns an empty state when used outside the provider rather than throwing, enabling graceful degradation.

## SponsorCard

Displays a sponsored item with automatic time-based rotation when multiple sponsors are active.

```ts
interface SponsorCardProps {
  sponsors: SponsorWithItem[];
  rotationInterval?: number;  // Milliseconds, default 5000 (5 seconds)
  className?: string;
  variant?: 'default' | 'compact';
}
```

### Default Variant

A full card with gradient background, animated icon container (ping animation on hover, scale and rotate transforms), item name with animated underline reveal, category badge, description, tags, and sponsor badge. Includes a decorative SVG grid pattern overlay.

### Compact Variant

A minimal row layout showing icon, name, sponsor badge, and external link icon. Suitable for sidebar placements and narrow containers.

### Rotation Behavior

When multiple valid sponsors exist, the component cycles through them using `setInterval`:

```tsx
useEffect(() => {
  if (validSponsors.length <= 1) return;
  const interval = setInterval(() => {
    setCurrentIndex((prev) => (prev + 1) % validSponsors.length);
  }, rotationInterval);
  return () => clearInterval(interval);
}, [validSponsors.length, rotationInterval]);
```

Dot indicators allow manual selection. Each dot is a `<button>` with `aria-label` for accessibility.

## SponsorForm

A three-step form for creating new sponsor ad requests.

### Step 1: Select Item

Uses `SearchableSelect` to let users choose from their submitted items. Each option displays the item icon, name, and category.

### Step 2: Select Duration

Two pricing cards (weekly and monthly) with visual selection state. The monthly option shows a "Save 25%" badge. Prices are formatted using `formatCurrencyAmount()`.

```ts
interface SponsorPricingConfig {
  weeklyPrice: number;
  monthlyPrice: number;
  currency: string;
}
```

### Step 3: Summary and Submit

Appears only when an item and duration are selected. Shows a summary card with item icon, name, selected plan, and total price. An amber notice box explains the approval process. Submission calls `POST /api/sponsor-ads/user`.

### Props

```ts
interface SponsorFormProps {
  items: ItemData[];          // User's available items
  locale: string;             // Current locale for redirect
  onSuccess?: (sponsorAdId: string) => void;
  pricingConfig: SponsorPricingConfig;
}
```

### Usage

```tsx
import { SponsorForm } from "@/components/sponsor-ads";

<SponsorForm
  items={userItems}
  locale="en"
  pricingConfig={{ weeklyPrice: 999, monthlyPrice: 2999, currency: "USD" }}
  onSuccess={(id) => router.push(`/client/sponsorships/${id}`)}
/>
```

## SponsorBadge

A small "Sponsored" indicator in two variants:

- **default**: Full badge with icon and text
- **compact**: Text-only badge for tight spaces

Available in sizes `sm`, `md`, and `lg`, with an optional `showIcon` prop.

## SidebarSponsor

A pre-configured sidebar placement that consumes the sponsor context and renders a `SponsorCard` with the compact variant. Designed for the item detail page sidebar.

## API Integration

### Creating a Sponsor Ad

```
POST /api/sponsor-ads/user
Body: { itemSlug: string, interval: "weekly" | "monthly" }
Response: { data: { id: string, status: "pending" } }
```

New ads are created with `status: "pending"` and require admin approval before becoming active.

### Fetching Active Sponsors

The `useActiveSponsorAds` hook calls `GET /api/sponsor-ads/active` with React Query. The server-side endpoint joins sponsor records with item data, eliminating the need for client-side data merging.

## Configuration

Sponsor ad pricing is configured at the page level and passed to `SponsorForm`. The admin panel manages:

- Approval/rejection of pending sponsor requests
- Active sponsor monitoring and renewal
- Pricing tier configuration

Environment variables do not directly affect sponsor components, but the checkout provider setting determines which payment gateway processes sponsor payments.

## Internationalization

All form labels, button text, and status messages use `next-intl` with the `sponsor` namespace:

- `sponsor.SELECT_ITEM_TITLE`, `sponsor.SELECT_ITEM_DESCRIPTION`
- `sponsor.SELECT_DURATION_TITLE`, `sponsor.SEARCH_PLACEHOLDER`
- `sponsor.SUMMARY_TITLE`, `sponsor.APPROVAL_NOTICE`
- `sponsor.SUBMIT_FOR_REVIEW`, `sponsor.SUBMITTING`

## Accessibility

- Rotation dot indicators use `<button>` elements with `aria-label="Show sponsor N"`.
- The pricing card selection uses button elements with clear visual focus states.
- The form validates selection before enabling the submit button.
- Loading and error states in the context provide appropriate feedback.
- All cards are wrapped in `<Link>` elements for keyboard-navigable item detail access.
- The submit button shows a loading spinner and disables during submission.

## Related Documentation

- [Sponsor Ads Feature](/docs/template/features/sponsor-ads) -- Full sponsor system overview
- [Billing Components](/docs/template/components/billing-components) -- Payment processing
- [Shared Card Components](/docs/template/components/shared-card-components) -- Listing integration
- [Admin Components](/docs/template/components/admin-components) -- Sponsor approval management
