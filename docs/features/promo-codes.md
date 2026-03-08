---
id: promo-codes
title: Promo Code System
sidebar_label: Promo Codes
sidebar_position: 14
---

# Promo Code System

The Ever Works Template includes a comprehensive promo code system for displaying promotional discounts, coupon codes, and special offers on item listing pages. The system supports multiple discount types, expiration tracking, clipboard copying, analytics integration, and responsive UI variants.

## Architecture Overview

| Component | Path | Purpose |
|---|---|---|
| `PromoCodeComponent` | `components/promo-code/promo-code.tsx` | UI component for displaying promo codes |
| `usePromoCode` | `hooks/use-promo-code.ts` | Hook for single promo code management |
| `usePromoCodes` | `hooks/use-promo-code.ts` | Hook for managing multiple promo codes |
| `PromoCode` type | `lib/content` | Type definition for promo code data |

## Discount Types

The system supports three discount types:

| Type | Display | Example |
|---|---|---|
| `percentage` | `X% OFF` | "25% OFF" |
| `fixed` | `$X OFF` | "$10 OFF" |
| `free_shipping` | `FREE SHIPPING` | "FREE SHIPPING" |

## The `usePromoCode` Hook

### Interface

```tsx
interface UsePromoCodeOptions {
  trackCopies?: boolean;    // Track copy events (default: true)
  trackClicks?: boolean;    // Track click events (default: true)
  onCodeCopied?: (code: string) => void;
  onCodeUsed?: (code: string) => void;
}

interface UsePromoCodeReturn {
  stats: PromoCodeStats;
  copyCode: (code: string) => Promise<boolean>;
  useCode: (code: string, url?: string) => void;
  isExpired: (promoCode: PromoCode) => boolean;
  getDiscountText: (promoCode: PromoCode) => string;
  clearStats: () => void;
}
```

### Usage

```tsx
import { usePromoCode } from '@/hooks/use-promo-code';

function PromoDisplay({ promoCode }) {
  const { copyCode, useCode, isExpired, getDiscountText } = usePromoCode({
    onCodeCopied: (code) => console.log(`Copied: ${code}`),
    onCodeUsed: (code) => console.log(`Used: ${code}`)
  });

  if (isExpired(promoCode)) {
    return <span>This code has expired</span>;
  }

  return (
    <div>
      <span>{getDiscountText(promoCode)}</span>
      <code>{promoCode.code}</code>
      <button onClick={() => copyCode(promoCode.code)}>Copy</button>
      <button onClick={() => useCode(promoCode.code, promoCode.url)}>Use Code</button>
    </div>
  );
}
```

## Statistics Tracking

The hook tracks copy and click statistics, persisted in `localStorage`:

```tsx
interface PromoCodeStats {
  copies: number;       // Number of times codes have been copied
  clicks: number;       // Number of times codes have been used/clicked
  lastCopied?: Date;    // Timestamp of last copy
  lastUsed?: Date;      // Timestamp of last use
}
```

Statistics are automatically saved and restored across sessions:

```tsx
const { stats, clearStats } = usePromoCode();

console.log(`Total copies: ${stats.copies}`);
console.log(`Total clicks: ${stats.clicks}`);

// Reset all statistics
clearStats();
```

## Analytics Integration

The hook automatically fires Google Analytics events when available:

| Event | Category | Trigger |
|---|---|---|
| `promo_code_copied` | `engagement` | When a code is copied to clipboard |
| `promo_code_used` | `conversion` | When a code is activated/clicked |

```tsx
// Automatic analytics tracking (no setup required)
if (typeof window !== "undefined" && window.gtag) {
  window.gtag("event", "promo_code_copied", {
    event_category: "engagement",
    event_label: code,
  });
}
```

## Managing Multiple Promo Codes

The `usePromoCodes` hook extends `usePromoCode` for collections:

```tsx
import { usePromoCodes } from '@/hooks/use-promo-code';

function PromoCodeList({ promoCodes }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    totalPromoCodes,
    copyCode,
    isExpired,
    getDiscountText
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      <h3>{totalPromoCodes} promo codes ({activePromoCodes.length} active)</h3>
      {bestDeal && <div>Best deal: {getDiscountText(bestDeal)}</div>}
      {activePromoCodes.map(code => (
        <PromoCodeComponent key={code.code} promoCode={code} />
      ))}
    </div>
  );
}
```

### Best Discount Algorithm

The `getBestDiscount()` function selects the best available discount:
1. Filters to active (non-expired) codes only
2. Compares percentage discounts by value (higher is better)
3. Compares fixed discounts by value (higher is better)
4. Free shipping codes are always considered competitive

## PromoCode Component

The `PromoCodeComponent` renders a styled promo code card with three variants:

### Variants

| Variant | Description |
|---|---|
| `default` | Full-sized card with description, terms, copy button, and use button |
| `compact` | Inline badge with code and copy icon |
| `featured` | Enhanced default with ring highlight and larger shadow |

### Usage

```tsx
import { PromoCodeComponent } from '@/components/promo-code/promo-code';

// Default variant
<PromoCodeComponent promoCode={code} />

// Compact inline variant
<PromoCodeComponent promoCode={code} variant="compact" />

// Featured with all options
<PromoCodeComponent
  promoCode={code}
  variant="featured"
  showDescription={true}
  showTerms={true}
  onCodeCopied={(code) => console.log(`Copied: ${code}`)}
/>
```

### Component Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `promoCode` | `PromoCode` | required | The promo code data object |
| `className` | `string?` | `undefined` | Additional CSS classes |
| `variant` | `"default" \| "compact" \| "featured"` | `"default"` | Display variant |
| `showDescription` | `boolean` | `true` | Show the code description |
| `showTerms` | `boolean` | `true` | Show terms and conditions |
| `onCodeCopied` | `(code: string) => void` | `undefined` | Callback when code is copied |

## Clipboard Support

The copy function includes a fallback for older browsers:

```tsx
const copyCode = async (code: string): Promise<boolean> => {
  try {
    // Modern Clipboard API
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand
    const textArea = document.createElement("textarea");
    textArea.value = code;
    document.body.appendChild(textArea);
    textArea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textArea);
    return result;
  }
};
```

## Internationalization

The component uses `next-intl` for all user-facing strings:

| Translation Key | Usage |
|---|---|
| `common.EXPIRES` | Expiration date label |
| `common.EXPIRED` | Expired badge text |
| `common.PROMO_CODE` | Code field label |
| `common.COPIED` | Copy confirmation text |
| `common.COPY` | Copy button text |
| `common.USE_CODE` | Use code button text |
| `common.TERMS` | Terms label |

## Key Files

| File | Path |
|---|---|
| Promo Code Component | `components/promo-code/promo-code.tsx` |
| Promo Code Hooks | `hooks/use-promo-code.ts` |
| PromoCode Type | `lib/content` (exported type) |
