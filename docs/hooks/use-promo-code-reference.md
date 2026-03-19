---
id: use-promo-code-reference
title: "usePromoCode Reference"
sidebar_label: "usePromoCode"
sidebar_position: 49
---

# usePromoCode

## Overview

`usePromoCode` provides utilities for managing promotional codes -- copying codes to the clipboard, tracking usage and copy statistics, checking expiration, and generating human-readable discount text. Statistics are persisted in `localStorage` and analytics events are sent via `gtag` when available. The file also exports a companion `usePromoCodes` hook for managing collections of promo codes with filtering and best-discount selection.

## Import

```typescript
import { usePromoCode, usePromoCodes } from "@/hooks/use-promo-code";
```

## API Reference

### `usePromoCode` Parameters

The hook accepts a single optional options object:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `trackCopies` | `boolean` | No | `true` | Whether to track copy events in the stats counter and `localStorage`. |
| `trackClicks` | `boolean` | No | `true` | Whether to track usage/click events in the stats counter and `localStorage`. |
| `onCodeCopied` | `(code: string) => void` | No | `undefined` | Callback invoked after a code is successfully copied to the clipboard. |
| `onCodeUsed` | `(code: string) => void` | No | `undefined` | Callback invoked when `useCode` is called for a code. |

### `usePromoCode` Return Value

| Property | Type | Description |
|----------|------|-------------|
| `stats` | `PromoCodeStats` | Current statistics for promo code interactions. |
| `copyCode` | `(code: string) => Promise<boolean>` | Copies the given code to the clipboard. Uses the Clipboard API with a `document.execCommand("copy")` fallback for older browsers. Returns `true` on success. |
| `useCode` | `(code: string, url?: string) => void` | Tracks a code usage event. If a `url` is provided, opens it in a new tab with `noopener,noreferrer`. |
| `isExpired` | `(promoCode: PromoCode) => boolean` | Returns `true` if the promo code's `expires_at` date is in the past. Returns `false` if no expiration is set. |
| `getDiscountText` | `(promoCode: PromoCode) => string` | Returns a formatted discount string such as `"25% OFF"`, `"$10 OFF"`, or `"FREE SHIPPING"`. |
| `clearStats` | `() => void` | Resets all statistics to zero and removes them from `localStorage`. |

### `PromoCodeStats` Type

```typescript
interface PromoCodeStats {
  copies: number;
  clicks: number;
  lastCopied?: Date;
  lastUsed?: Date;
}
```

### `PromoCode` Type

```typescript
interface PromoCode {
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed" | "free_shipping";
  discount_value?: number;
  expires_at?: string;
  terms?: string;
  url?: string;
}
```

---

### `usePromoCodes` Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `promoCodes` | `PromoCode[]` | Yes | Array of promo code objects to manage. |

### `usePromoCodes` Return Value

Includes all properties from `usePromoCode` plus:

| Property | Type | Description |
|----------|------|-------------|
| `activePromoCodes` | `PromoCode[]` | Promo codes that have not expired. |
| `expiredPromoCodes` | `PromoCode[]` | Promo codes that have expired. |
| `getBestDiscount` | `() => PromoCode \| null` | Returns the promo code with the highest discount value. Compares within the same discount type (percentage vs. fixed). Returns `null` if no active codes exist. |
| `hasActivePromoCodes` | `boolean` | `true` if at least one active (non-expired) promo code exists. |
| `totalPromoCodes` | `number` | Total number of promo codes passed to the hook (active and expired). |

## Usage Examples

### Basic Usage

```typescript
import { usePromoCode } from "@/hooks/use-promo-code";

function PromoCodeCard({ promo }: { promo: PromoCode }) {
  const { copyCode, getDiscountText, isExpired } = usePromoCode();

  if (isExpired(promo)) {
    return <div className="opacity-50">Expired: {promo.code}</div>;
  }

  return (
    <div className="flex items-center gap-4 rounded border p-4">
      <span className="font-bold text-green-600">
        {getDiscountText(promo)}
      </span>
      <code className="bg-muted px-2 py-1 rounded">{promo.code}</code>
      <button
        onClick={async () => {
          const success = await copyCode(promo.code);
          if (success) alert("Copied!");
        }}
      >
        Copy
      </button>
    </div>
  );
}
```

### Advanced Usage

```typescript
import { usePromoCode } from "@/hooks/use-promo-code";
import { useState } from "react";

function PromoCodeWidget({ promo }: { promo: PromoCode }) {
  const [copied, setCopied] = useState(false);
  const { copyCode, useCode, stats, getDiscountText } = usePromoCode({
    trackCopies: true,
    trackClicks: true,
    onCodeCopied: (code) => {
      console.log(`Copied: ${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    onCodeUsed: (code) => {
      console.log(`Used: ${code}`);
    },
  });

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">{getDiscountText(promo)}</div>
      {promo.description && <p>{promo.description}</p>}
      <div className="flex items-center gap-2">
        <code className="bg-muted px-3 py-1.5 rounded text-sm">
          {promo.code}
        </code>
        <button onClick={() => copyCode(promo.code)}>
          {copied ? "Copied!" : "Copy Code"}
        </button>
        {promo.url && (
          <button onClick={() => useCode(promo.code, promo.url)}>
            Use Code
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {stats.copies} copies | {stats.clicks} uses
      </p>
    </div>
  );
}
```

### Managing Multiple Promo Codes

```typescript
import { usePromoCodes } from "@/hooks/use-promo-code";

function PromoCodeList({ promoCodes }: { promoCodes: PromoCode[] }) {
  const {
    activePromoCodes,
    expiredPromoCodes,
    getBestDiscount,
    hasActivePromoCodes,
    getDiscountText,
    copyCode,
  } = usePromoCodes(promoCodes);

  const bestDeal = getBestDiscount();

  return (
    <div>
      {bestDeal && (
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <span className="font-bold">Best Deal: </span>
          {getDiscountText(bestDeal)} with code{" "}
          <code>{bestDeal.code}</code>
        </div>
      )}

      <h3>Active Codes ({activePromoCodes.length})</h3>
      {activePromoCodes.map((promo) => (
        <div key={promo.code} className="flex items-center gap-2 py-2">
          <span>{getDiscountText(promo)}</span>
          <code>{promo.code}</code>
          <button onClick={() => copyCode(promo.code)}>Copy</button>
        </div>
      ))}

      {expiredPromoCodes.length > 0 && (
        <>
          <h3 className="mt-4 text-muted-foreground">
            Expired ({expiredPromoCodes.length})
          </h3>
          {expiredPromoCodes.map((promo) => (
            <div key={promo.code} className="opacity-50 py-1">
              <code>{promo.code}</code> - Expired
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

## Integration Patterns

`usePromoCode` persists statistics to `localStorage` under the key `"promo-code-stats"` and rehydrates them on mount. Analytics events (`promo_code_copied` and `promo_code_used`) are fired through `window.gtag` when available, making the hook compatible with Google Analytics / Google Tag Manager setups. The `copyCode` function uses the modern Clipboard API and falls back to `document.execCommand("copy")` for older browsers. The `usePromoCodes` wrapper builds on `usePromoCode` and adds collection-level utilities for filtering active/expired codes and finding the best discount.

## Best Practices

- **Use `usePromoCodes` when displaying a list** of promo codes and `usePromoCode` when working with individual codes in isolation.
- **Provide `onCodeCopied` for user feedback** -- show a toast or temporary "Copied!" state so the user knows the action succeeded.
- **Check `isExpired` before rendering promo codes** to prevent users from trying to use expired codes. Visually distinguish expired codes with reduced opacity or a strike-through.
- **Use `getDiscountText` for consistent formatting** rather than building discount strings manually, ensuring uniform display across the application.
- **Call `clearStats` when appropriate** (e.g., in an admin panel or user settings) to reset tracking data.

## Related Hooks

- [useToast](./use-toast-reference.md) -- Show toast notifications when promo codes are copied or applied.
- [useAnalytics](./use-analytics-reference.md) -- The hook fires gtag events automatically, but use `useAnalytics` for custom tracking beyond the built-in events.
