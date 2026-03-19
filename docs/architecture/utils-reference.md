---
id: utils-reference
title: "Utilities Reference"
sidebar_label: "Utils Reference"
sidebar_position: 24
---

# Utilities Reference

The template provides utility functions across two directories: `utils/` for general-purpose helpers and `lib/utils/` for framework-integrated utilities. This reference documents every utility module, its exports, and usage patterns.

## Directory Structure

```
utils/                              # General-purpose utilities
├── date.ts                         # Date formatting
├── pagination.ts                   # Pagination helpers
└── profile-button.utils.ts         # Profile UI helpers

lib/utils/                          # Framework-integrated utilities
├── index.ts                        # cn() class name merger
├── api-error.ts                    # Safe API error responses
├── bot-detection.ts                # User-Agent bot detection
├── checkout-utils.ts               # Payment checkout helpers
├── client-auth.ts                  # Client-side auth utilities
├── currency-format.ts              # Currency formatting
├── custom-navigation.ts            # Navigation helpers
├── database-check.ts               # Database connectivity check
├── email-validation.ts             # ReDoS-safe email validation
├── error-handler.ts                # Error handling utilities
├── featured-items.ts               # Featured item sorting/filtering
├── footer-utils.ts                 # Footer content utilities
├── image-domains.ts                # Image domain whitelist
├── pagination-validation.ts        # Server-side pagination validation
├── payment-provider.ts             # Payment provider detection
├── plan-expiration.utils.ts        # Plan expiration calculations
├── rate-limit.ts                   # In-memory rate limiter
├── request-body.ts                 # Request body parsing
├── server-url.ts                   # Server URL resolution
├── settings.ts                     # Settings helpers
├── slug.ts                         # URL slug utilities
├── url-cleaner.ts                  # URL cleaning and validation
├── url-filter-sync.ts              # URL/filter state synchronization
├── twenty-crm-client.utils.ts      # Twenty CRM client utils
└── twenty-crm-validation.ts        # Twenty CRM validation
```

## Date Utilities (`utils/date.ts`)

### formatDate

Formats a date with long month, day, and year.

```typescript
formatDate(new Date('2024-01-15'), 'en-US')
// "January 15, 2024"

formatDate(new Date('2024-01-15'), 'fr-FR')
// "15 janvier 2024"
```

### formatDateTime

Formats a date with long month, day, year, hour, and minute.

```typescript
formatDateTime(new Date('2024-01-15T14:30:00'), 'en-US')
// "January 15, 2024, 02:30 PM"
```

### formatDateShort

Formats with short month. Returns `'-'` for null/undefined values.

```typescript
formatDateShort('2024-01-15')      // "Jan 15, 2024"
formatDateShort(null)               // "-"
formatDateShort(undefined)          // "-"
```

## Pagination (`utils/pagination.ts`)

### clampAndScrollToTop

Clamps a page number to valid range and scrolls the window to top.

```typescript
import { clampAndScrollToTop } from '@/utils/pagination';

// Clamp page to valid range and scroll to top
clampAndScrollToTop(5, totalPages, setCurrentPage);
```

| Parameter | Type | Description |
|---|---|---|
| `newPage` | `number` | Requested page number |
| `total` | `number` | Total number of pages |
| `setPage` | `(page: number) => void` | State setter function |

Behavior: Clamps to range `[1, total]`, handles `NaN` by defaulting to 1, and performs smooth scroll to top.

## Profile Button Utilities (`utils/profile-button.utils.ts`)

### formatDisplayName

Intelligently formats display names based on length:

```typescript
formatDisplayName('')               // "User"
formatDisplayName('John')           // "John"
formatDisplayName('John Doe')       // "John Doe"
formatDisplayName('John Michael Doe Smith')  // "John Michael..."
```

### getInitials

Extracts initials from a name:

```typescript
getInitials('John Doe')             // "JD"
getInitials('Alice')                // "A"
getInitials('')                     // "U"
```

### getProfilePath

Builds a URL-safe profile path:

```typescript
getProfilePath({ username: 'johndoe' })
// "/client/profile/johndoe"

getProfilePath({ email: 'john@example.com' })
// "/client/profile/john"

getProfilePath(null)
// "/client/profile/profile"
```

### getThemeColors

Returns current theme colors for UI overlays:

```typescript
const colors = getThemeColors();
// { background, cardBg, cardShadow, border, spinnerBorder, titleColor, textColor }
```

## Class Name Merger (`lib/utils/index.ts`)

### cn

Combines Tailwind CSS classes with conflict resolution:

```typescript
import { cn } from '@/lib/utils';

cn('px-4 py-2', 'px-6')           // "py-2 px-6" (px-6 wins)
cn('text-red-500', isActive && 'text-blue-500')  // Conditional classes
cn('flex items-center', className) // Merge with prop classes
```

Uses `clsx` for conditional classes and `tailwind-merge` for conflict resolution.

## API Error Handling (`lib/utils/api-error.ts`)

### safeErrorResponse

Creates error responses that prevent information leakage in production:

```typescript
import { safeErrorResponse } from '@/lib/utils/api-error';

try {
  // handler logic
} catch (error) {
  return safeErrorResponse(error, 'Failed to process request', 500);
}
```

| Environment | Response Contains |
|---|---|
| Development | Actual `error.message` |
| Production | Generic `fallbackMessage` only |

Full error details are always logged server-side regardless of environment.

### safeErrorMessage

Extracts a safe error message string without creating a Response:

```typescript
const message = safeErrorMessage(error, 'Operation failed');
```

## Email Validation (`lib/utils/email-validation.ts`)

### isValidEmail

ReDoS-safe email validation using manual parsing (no vulnerable regex):

```typescript
import { isValidEmail } from '@/lib/utils/email-validation';

isValidEmail('user@example.com')     // true
isValidEmail('invalid')              // false
isValidEmail('')                     // false (length < 5)
```

Validation rules:
- Length between 5 and 254 characters
- Local part: 1-64 characters, alphanumeric + permitted special characters
- Domain: valid structure with at least one dot
- Each domain label: 1-63 characters, starts/ends with alphanumeric

### isValidEmailRegex

Alternative regex-based validation (also ReDoS-safe):

```typescript
isValidEmailRegex('user@example.com')  // true
```

## Currency Formatting (`lib/utils/currency-format.ts`)

### formatCurrency

Formats minor-unit amounts (cents) to localized currency strings:

```typescript
formatCurrency(1000, 'USD')          // "$10.00"
formatCurrency(1000, 'JPY')          // "JP1,000" (no decimals)
formatCurrency(9600, 'EUR', 'de-DE') // "96,00 EUR"
```

### formatCurrencyAmount

Formats major-unit amounts (dollars) to localized currency strings:

```typescript
formatCurrencyAmount(10, 'USD')      // "$10.00"
formatCurrencyAmount(96, 'EUR')      // "EUR96.00"
```

### getCurrencySymbol

Returns the symbol for a currency code:

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "EUR"
getCurrencySymbol('GBP')  // "GBP"
getCurrencySymbol('JPY')  // "JPY"
getCurrencySymbol('INR')  // "INR"
```

Supports 22 currencies including USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF, INR, BRL, MXN, KRW, and more.

## Slug Utilities (`lib/utils/slug.ts`)

### slugify

Converts text to URL-friendly slugs:

```typescript
slugify('Hello World')              // "hello-world"
slugify('Rock & Roll')              // "rock-and-roll"
slugify('  Multiple   Spaces  ')    // "multiple-spaces"
slugify('')                         // ""
```

### deslugify

Converts slugs back to readable text:

```typescript
deslugify('hello-world')            // "hello world"
deslugify('rock-and-roll')          // "rock & roll"
```

## URL Utilities (`lib/utils/url-cleaner.ts`)

### cleanUrl

Cleans and normalizes URL strings:

```typescript
cleanUrl('"https://example.com"')   // "https://example.com"
cleanUrl('example.com')             // "https://example.com"
cleanUrl('HTTP://Example.COM')      // "http://Example.COM"
```

### isValidAbsoluteUrl

Validates that a URL is absolute with protocol and hostname:

```typescript
isValidAbsoluteUrl('https://example.com')  // true
isValidAbsoluteUrl('example.com')          // false
isValidAbsoluteUrl('')                     // false
```

### getBaseUrl

Returns the normalized application base URL with fallback chain:

```
Priority: NEXT_PUBLIC_APP_URL -> VERCEL_URL -> https://demo.ever.works
```

### buildUrl

Constructs full URLs from path segments:

```typescript
buildUrl('/api/items')               // "https://yourdomain.com/api/items"
buildUrl('api/items')                // "https://yourdomain.com/api/items"
```

## Rate Limiting (`lib/utils/rate-limit.ts`)

### ratelimit

In-memory rate limiter for API endpoints:

```typescript
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  `api:${clientIP}`,  // Unique key
  100,                // Max requests
  60 * 1000           // Window: 1 minute
);

if (!result.success) {
  return new Response('Too Many Requests', {
    status: 429,
    headers: { 'Retry-After': String(result.retryAfter) }
  });
}
```

Return type:

```typescript
interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // Seconds until reset (only when limited)
}
```

### resetRateLimit / getRateLimitStatus

```typescript
resetRateLimit('api:192.168.1.1');     // Clear rate limit for key

const status = getRateLimitStatus('api:192.168.1.1', 100);
// { remaining: 95, resetTime: 1706000000000 }
```

The store is automatically cleaned every 5 minutes.

## Pagination Validation (`lib/utils/pagination-validation.ts`)

### validatePaginationParams

Server-side pagination parameter validation for API routes:

```typescript
import { validatePaginationParams } from '@/lib/utils/pagination-validation';

const result = validatePaginationParams(url.searchParams);

if ('error' in result) {
  return NextResponse.json({ error: result.error }, { status: 400 });
}

const { page, limit } = result;
```

Validation rules:
- `page`: Must be a positive integer (default: 1)
- `limit`: Must be between 1 and 100 (default: 10)

## Bot Detection (`lib/utils/bot-detection.ts`)

### isBot

Detects bots by User-Agent string:

```typescript
import { isBot } from '@/lib/utils/bot-detection';

isBot('Mozilla/5.0 (compatible; Googlebot/2.1)')  // true
isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64)') // false
isBot('')                                           // true (empty = bot)
```

Detected categories: search engines, social media crawlers, performance tools, automation frameworks, HTTP clients.

## Featured Items (`lib/utils/featured-items.ts`)

### sortItemsWithFeatured

Places featured items at the beginning of a list, sorted by featured order:

```typescript
const sorted = sortItemsWithFeatured(allItems, featuredItems);
// Featured items first (by order), then remaining items
```

### isItemFeatured / getFeaturedItemData

```typescript
const featured = isItemFeatured('my-item', featuredItems);  // boolean
const data = getFeaturedItemData('my-item', featuredItems);  // FeaturedItem | undefined
```

### filterActiveFeaturedItems

Removes expired featured items based on `featuredUntil` date.

### isFeaturedItemExpiring

Checks if a featured item expires within 7 days.

## Server URL (`lib/utils/server-url.ts`)

### getFrontendUrl

Resolves the frontend URL from the current request context:

```typescript
const url = await getFrontendUrl();
```

Resolution order:
1. `window.location.origin` (client-side)
2. `x-forwarded-host` / `host` headers (server-side, validated against config)
3. Configured `WEB_URL` fallback

## Summary Table

| Module | Key Exports | Category |
|---|---|---|
| `utils/date` | `formatDate`, `formatDateTime`, `formatDateShort` | Formatting |
| `utils/pagination` | `clampAndScrollToTop` | UI Helpers |
| `utils/profile-button.utils` | `formatDisplayName`, `getInitials`, `getProfilePath` | UI Helpers |
| `lib/utils/index` | `cn` | Styling |
| `lib/utils/api-error` | `safeErrorResponse`, `safeErrorMessage` | Error Handling |
| `lib/utils/bot-detection` | `isBot` | Security |
| `lib/utils/currency-format` | `formatCurrency`, `formatCurrencyAmount`, `getCurrencySymbol` | Formatting |
| `lib/utils/email-validation` | `isValidEmail`, `isValidEmailRegex` | Validation |
| `lib/utils/featured-items` | `sortItemsWithFeatured`, `filterActiveFeaturedItems` | Data |
| `lib/utils/pagination-validation` | `validatePaginationParams` | Validation |
| `lib/utils/rate-limit` | `ratelimit`, `resetRateLimit` | Security |
| `lib/utils/server-url` | `getFrontendUrl` | Infrastructure |
| `lib/utils/slug` | `slugify`, `deslugify` | Formatting |
| `lib/utils/url-cleaner` | `cleanUrl`, `getBaseUrl`, `buildUrl` | Infrastructure |
