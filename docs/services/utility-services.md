---
id: utility-services
title: "Utility Services"
sidebar_label: "Utility Services"
sidebar_position: 16
---

# Utility Services

The template includes a collection of utility functions and services spread across `lib/utils/` and `utils/` directories. These cover class name merging, date formatting, URL handling, slug generation, rate limiting, email validation, and pagination.

## Directory Structure

| File | Purpose |
|------|---------|
| `lib/utils/index.ts` | Tailwind class name merging (`cn`) |
| `lib/utils/slug.ts` | URL slug generation and reversal |
| `lib/utils/email-validation.ts` | ReDoS-safe email validation |
| `lib/utils/rate-limit.ts` | In-memory rate limiting |
| `lib/utils/url-cleaner.ts` | URL validation, cleaning, and construction |
| `lib/utils/pagination-validation.ts` | Shared pagination parameter validation |
| `lib/utils/currency-format.ts` | Currency display formatting |
| `lib/utils/error-handler.ts` | Centralized error handling |
| `lib/utils/api-error.ts` | Structured API error responses |
| `utils/date.ts` | Date and datetime formatting |
| `utils/pagination.ts` | Pagination helpers |
| `lib/helpers.ts` | Language and locale helpers |

## Class Name Utility

The `cn` function at `lib/utils/index.ts` combines `clsx` for conditional classes and `tailwind-merge` to handle Tailwind CSS class conflicts:

```ts
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Usage:

```tsx
<div className={cn(
  'px-4 py-2 rounded-lg',
  isActive && 'bg-blue-500 text-white',
  className // external override
)} />
```

The `twMerge` step ensures that if `className` contains `bg-red-500`, it correctly overrides `bg-blue-500` instead of both being applied.

## Slug Utilities

The `lib/utils/slug.ts` file provides bidirectional slug conversion:

### slugify

Converts a string to a URL-safe slug:

```ts
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with hyphens
    .replace(/&/g, '-and-')      // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')    // Remove non-word characters
    .replace(/\-\-+/g, '-')     // Replace multiple hyphens
    .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens
}
```

### deslugify

Converts a slug back to a human-readable string:

```ts
export function deslugify(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }
  return slug.replace(/-and-/g, '&').replace(/-/g, ' ').trim();
}
```

Example:

```ts
slugify('Hello World & Friends')  // 'hello-world-and-friends'
deslugify('hello-world-and-friends')  // 'hello world & friends'
```

## Date Formatting

The `utils/date.ts` file provides locale-aware date formatting functions:

### formatDate

Formats a date in long format (e.g., "January 7, 2026"):

```ts
export function formatDate(date: Date, locale: string = 'en-US') {
  return new Date(date).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
```

### formatDateTime

Formats a date with time (e.g., "January 7, 2026, 02:30 PM"):

```ts
export function formatDateTime(date: Date, locale: string = 'en-US') {
  return new Date(date).toLocaleString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

### formatDateShort

Formats a date in short format (e.g., "Jan 7, 2026") with null safety:

```ts
export function formatDateShort(
  date: Date | string | null | undefined,
  locale: string = 'en-US'
): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
```

## Rate Limiting

The `lib/utils/rate-limit.ts` file provides an in-memory rate limiter for API routes:

### Basic Usage

```ts
import { ratelimit } from '@/lib/utils/rate-limit';

const result = await ratelimit(
  userIp,     // unique key
  10,          // max requests
  60000        // window in milliseconds (1 minute)
);

if (!result.success) {
  return Response.json(
    { error: 'Too many requests', retryAfter: result.retryAfter },
    { status: 429 }
  );
}
```

### RateLimitResult Interface

```ts
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;  // seconds until reset (only when limited)
}
```

### Additional Functions

```ts
// Reset the rate limit for a key
resetRateLimit(key: string): void

// Check status without incrementing
getRateLimitStatus(key: string, limit: number): {
  remaining: number;
  resetTime: number | null;
}
```

The store automatically cleans up expired entries every 5 minutes.

## URL Utilities

The `lib/utils/url-cleaner.ts` file provides URL cleaning and construction:

### cleanUrl

Normalizes a URL by removing quotes, whitespace, and ensuring proper protocol:

```ts
export function cleanUrl(url: string): string {
  let cleaned = url.trim().replace(/^["']|["']$/g, '');
  const protocolMatch = cleaned.match(/^([a-z]+):\/\//i);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    const rest = cleaned.substring(protocolMatch[0].length);
    return `${protocol}://${rest}`;
  } else {
    return `https://${cleaned}`;
  }
}
```

### isValidAbsoluteUrl

Validates that a string is a valid absolute URL:

```ts
export function isValidAbsoluteUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return !!urlObj.protocol && !!urlObj.hostname;
  } catch {
    return false;
  }
}
```

### getBaseUrl

Returns the application base URL with a fallback chain:

1. `NEXT_PUBLIC_APP_URL` environment variable
2. `VERCEL_URL` environment variable (with `https://` prefix)
3. Hardcoded fallback: `https://demo.ever.works`

### buildUrl

Constructs a full URL from a path:

```ts
export function buildUrl(path: string, baseUrl?: string): string {
  const base = baseUrl ? cleanUrl(baseUrl) : getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
```

## Email Validation

The `lib/utils/email-validation.ts` file provides security-focused email validation that prevents ReDoS (Regular Expression Denial of Service) attacks:

```ts
export function isValidEmail(email: string): boolean {
  // Fast-fail checks: type, length (5-254 chars)
  // Validates @ position and local/domain part lengths
  // Checks character validity per part
  // Validates domain structure (at least one dot, parts 1-63 chars)
  // Ensures domain parts start/end with alphanumeric
}
```

A regex-based alternative is also available:

```ts
export function isValidEmailRegex(email: string): boolean {
  const secureEmailRegex = /^[a-zA-Z0-9.!#$%&'*+\-/=?^_`{|}~]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return secureEmailRegex.test(email);
}
```

## Pagination Validation

The `lib/utils/pagination-validation.ts` file provides shared pagination validation:

```ts
export function validatePaginationParams(
  searchParams: URLSearchParams
): PaginationParams | PaginationError {
  const page = pageParam ? parseInt(pageParam, 10) : 1;
  const limit = limitParam ? parseInt(limitParam, 10) : 10;

  if (isNaN(page) || page < 1) {
    return { error: 'Invalid page parameter.', status: 400 };
  }
  if (isNaN(limit) || limit < 1 || limit > 100) {
    return { error: 'Invalid limit parameter.', status: 400 };
  }
  return { page, limit };
}
```

Usage in an API route:

```ts
const pagination = validatePaginationParams(searchParams);
if ('error' in pagination) {
  return Response.json(pagination, { status: pagination.status });
}
const { page, limit } = pagination;
```

## Language and Locale Helpers

The `lib/helpers.ts` file provides locale-to-country mapping for 21 supported languages:

```ts
export const LANGUAGE_COUNTRY_CODES = {
  en: 'US', fr: 'FR', es: 'ES', zh: 'CN',
  de: 'DE', ar: 'SA', he: 'IL', ru: 'RU',
  uk: 'UA', pt: 'BR', it: 'IT', ja: 'JP',
  ko: 'KR', nl: 'NL', pl: 'PL', tr: 'TR',
  vi: 'VN', th: 'TH', hi: 'IN', id: 'ID', bg: 'BG',
};

export function getCountryCode(languageCode: LanguageCode = 'en'): string {
  return LANGUAGE_COUNTRY_CODES[languageCode];
}

export const appLocales = [...Object.keys(LANGUAGE_COUNTRY_CODES)];
```

## Related Files

| File | Description |
|------|-------------|
| `lib/utils/index.ts` | `cn()` class name utility |
| `lib/utils/slug.ts` | `slugify()` and `deslugify()` |
| `lib/utils/email-validation.ts` | ReDoS-safe email validation |
| `lib/utils/rate-limit.ts` | In-memory rate limiting |
| `lib/utils/url-cleaner.ts` | URL cleaning and construction |
| `lib/utils/pagination-validation.ts` | Pagination parameter validation |
| `utils/date.ts` | Date formatting functions |
| `lib/helpers.ts` | Language/locale helpers |
