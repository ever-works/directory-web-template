---
id: promo-code-components
title: Promo Code Components
sidebar_label: Promo Code Components
sidebar_position: 40
---

# Promo Code Components

The `components/promo-code/` directory provides the UI for displaying and interacting with promotional codes attached to directory items. The system supports multiple discount types, expiration handling, clipboard integration, and external redirect URLs.

## Architecture Overview

```
components/promo-code/
  promo-code.tsx    # Main PromoCodeComponent with three variants
  index.ts          # Barrel export
```

Promo codes are defined in the content repository as part of an item's data. The `PromoCode` type from `@/lib/content` provides the data shape, and the component handles presentation, copy-to-clipboard, expiration checks, and redirect behavior.

## PromoCode Data Shape

```ts
interface PromoCode {
  code: string;              // The actual promo code text (e.g., "SAVE20")
  discount_type: "percentage" | "fixed" | "free_shipping";
  discount_value?: number;   // Numeric value (e.g., 20 for 20%)
  description?: string;      // Human-readable description
  terms?: string;            // Terms and conditions text
  expires_at?: string;       // ISO date string
  url?: string;              // External URL to apply the code
}
```

## Component Props

```ts
interface PromoCodeProps {
  promoCode: PromoCode;
  className?: string;
  variant?: "default" | "compact" | "featured";
  showDescription?: boolean;  // Default: true
  showTerms?: boolean;        // Default: true
  onCodeCopied?: (code: string) => void;
}
```

## Variants

### Default

A full-width card with a gradient background (`from-white via-green-50/30 to-emerald-50/50`), discount icon, code display in a monospaced block, copy button, and optional "Use Code" redirect button. A decorative radial gradient pattern and hover shadow animation provide visual polish.

### Compact

An inline pill-style element suitable for embedding within item cards or lists. Shows the discount icon, code text, and a copy/check icon. Scales up slightly on hover (`hover:scale-105`).

```tsx
<PromoCodeComponent promoCode={promo} variant="compact" showDescription={false} showTerms={false} />
```

### Featured

Identical to the default variant but with an additional ring highlight (`ring-2 ring-green-400/30 shadow-lg`) and elevated shadow, designed for promoted or high-value codes.

## Usage Examples

```tsx
import { PromoCodeComponent } from "@/components/promo-code";

// Full card display on item detail page
<PromoCodeComponent
  promoCode={item.promo_code}
  variant="default"
  onCodeCopied={(code) => analytics.track("promo_copied", { code })}
/>

// Compact inline display in a listing card
<PromoCodeComponent
  promoCode={item.promo_code}
  variant="compact"
  showDescription={false}
  showTerms={false}
/>

// Featured display in a promotional section
<PromoCodeComponent promoCode={item.promo_code} variant="featured" />
```

## Discount Type Display

The component automatically selects the appropriate icon and formats the discount text:

| Type | Icon | Display Text |
|---|---|---|
| `percentage` | `FiPercent` | "20% OFF" |
| `fixed` | `FiDollarSign` | "$10 OFF" |
| `free_shipping` | `FiTruck` | "FREE SHIPPING" |

When no `discount_value` is provided, the header falls back to showing "PROMO CODE" as the label.

## Clipboard Integration

The copy function uses the modern `navigator.clipboard.writeText()` API with a fallback for older browsers that creates a temporary `<textarea>` element:

```ts
const copyToClipboard = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(promoCode.code);
    setCopied(true);
    onCodeCopied?.(promoCode.code);
    setTimeout(() => setCopied(false), 2000);
  } catch {
    // Fallback: textarea + execCommand("copy")
    const textArea = document.createElement("textarea");
    textArea.value = promoCode.code;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
}, [promoCode.code, onCodeCopied]);
```

After copying, the button icon switches from `FiCopy` to `FiCheck` for 2 seconds, and the `onCodeCopied` callback fires.

## Expiration Handling

The component checks `promoCode.expires_at` against the current date at render time:

```ts
const isExpired = promoCode.expires_at
  ? new Date(promoCode.expires_at) < new Date()
  : false;
```

Expired codes receive:
- `opacity-50 grayscale` visual treatment on the entire card
- Disabled copy and redirect buttons (`disabled:cursor-not-allowed`)
- An "Expired" badge in the header area (default/featured variants only)

Non-expired codes with an expiration date display "Expires [formatted date]" alongside a clock icon (`FiClock`).

## External Redirect

When `promoCode.url` is provided, a "Use Code" button appears alongside the copy button. Clicking it opens the URL in a new tab via `window.open(url, "_blank", "noopener,noreferrer")`. The button uses the theme primary color to visually distinguish it from the green copy action.

## Content Repository Configuration

Promo codes are configured in item YAML/JSON files within the content repository:

```yaml
promo_code:
  code: "SAVE20"
  discount_type: "percentage"
  discount_value: 20
  description: "Save 20% on your first purchase"
  terms: "Valid for new customers only. One use per account."
  expires_at: "2025-12-31"
  url: "https://example.com/checkout?promo=SAVE20"
```

Items without a `promo_code` field simply do not render the component.

## Internationalization

The component uses `next-intl` translations via `useTranslations()` for all user-facing strings:

| Key | Default Text |
|---|---|
| `common.EXPIRES` | "Expires" |
| `common.EXPIRED` | "Expired" |
| `common.PROMO_CODE` | "Promo Code" |
| `common.COPIED` | "Copied!" |
| `common.COPY` | "Copy" |
| `common.USE_CODE` | "Use Code" |
| `common.TERMS` | "Terms" |

## Styling Details

The component uses a green color scheme with emerald accents:
- Light mode: `from-white via-green-50/30 to-emerald-50/50` background
- Dark mode: `dark:from-gray-900 dark:via-green-900/10 dark:to-emerald-900/20`
- Border: `border-green-200/60 dark:border-green-700/40`
- Copy button: `bg-green-600 hover:bg-green-700 text-white`
- Redirect button: Uses theme primary colors

The code text is rendered in a `<code>` element with `font-mono font-bold tracking-wider` for clear readability.

## Accessibility

- The copy button provides visual feedback via icon swap and is disabled when expired.
- The redirect button uses `noopener,noreferrer` for security.
- The `<label>` element with "Promo Code" provides semantic context for the code display.
- All interactive elements have focus-visible styles via the button component.
- Color contrast meets WCAG AA standards in both light and dark modes.
- The compact variant button uses a `<button>` element (not a `<div>`) for keyboard accessibility.

## Related Documentation

- [Promo Codes Feature](/docs/template/features/promo-codes) -- Full promo code system documentation
- [Item Detail Components](/docs/template/components/item-detail-components) -- Where promo codes are displayed
- [Shared Card Components](/docs/template/components/shared-card-components) -- Compact variant in listings
