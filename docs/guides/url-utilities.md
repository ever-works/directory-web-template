---
id: url-utilities
title: "URL Utilities"
sidebar_label: "URL Utilities"
sidebar_position: 21
---

# URL Utilities

The template provides two URL utility modules that handle URL sanitization, validation, and server-side URL resolution. Together they ensure that all URLs used in the application are clean, valid, and correctly configured for both development and production environments.

## URL Cleaner (`lib/utils/url-cleaner.ts`)

This module provides functions for cleaning, validating, and constructing URLs.

### cleanUrl

Cleans and normalizes a URL string by removing surrounding quotes, trimming whitespace, and ensuring a proper protocol:

```ts
import { cleanUrl } from '@/lib/utils/url-cleaner';

cleanUrl('"https://example.com"');    // "https://example.com"
cleanUrl("'https://example.com'");    // "https://example.com"
cleanUrl('  example.com  ');          // "https://example.com"
cleanUrl('HTTP://Example.com');       // "http://Example.com"
cleanUrl('');                         // ""
```

#### Implementation

```ts
export function cleanUrl(url: string): string {
  if (!url) return '';

  // Remove any surrounding quotes or whitespace
  let cleaned = url.trim().replace(/^["']|["']$/g, '');

  // Check for existing protocol (case-insensitive)
  const protocolMatch = cleaned.match(/^([a-z]+):\/\//i);

  if (protocolMatch) {
    // Protocol exists - normalize to lowercase
    const protocol = protocolMatch[1].toLowerCase();
    const rest = cleaned.substring(protocolMatch[0].length);
    return `${protocol}://${rest}`;
  } else {
    // No protocol - add https:// as default for security
    return `https://${cleaned}`;
  }
}
```

Key behaviors:
- Strips surrounding single or double quotes
- Normalizes the protocol to lowercase (`HTTP://` becomes `http://`)
- Adds `https://` when no protocol is present (security default)
- Returns an empty string for falsy inputs

### isValidAbsoluteUrl

Validates that a string is a well-formed absolute URL with both a protocol and hostname:

```ts
import { isValidAbsoluteUrl } from '@/lib/utils/url-cleaner';

isValidAbsoluteUrl('https://example.com');     // true
isValidAbsoluteUrl('http://localhost:3000');    // true
isValidAbsoluteUrl('/relative/path');           // false
isValidAbsoluteUrl('not-a-url');               // false
isValidAbsoluteUrl('');                        // false
isValidAbsoluteUrl(null);                      // false
```

#### Implementation

```ts
export function isValidAbsoluteUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return !!urlObj.protocol && !!urlObj.hostname;
  } catch {
    return false;
  }
}
```

The function uses the built-in `URL` constructor for validation. If the constructor throws, the URL is invalid.

### getBaseUrl

Returns the normalized base URL for the application. This value is computed once at module load time and cached:

```ts
import { getBaseUrl } from '@/lib/utils/url-cleaner';

const base = getBaseUrl(); // "https://your-app.com"
```

The base URL is resolved through a priority chain:

1. `NEXT_PUBLIC_APP_URL` environment variable (cleaned and validated)
2. `VERCEL_URL` environment variable (with `https://` prepended)
3. Hardcoded fallback: `https://demo.ever.works`

Each step includes validation. If an environment variable is set but produces an invalid URL after cleaning, a console warning is emitted and the next fallback is tried.

### buildUrl

Constructs a full URL from a path and optional base URL:

```ts
import { buildUrl } from '@/lib/utils/url-cleaner';

buildUrl('/api/items');                           // "https://your-app.com/api/items"
buildUrl('api/items');                            // "https://your-app.com/api/items"
buildUrl('/callback', 'https://auth.example.com'); // "https://auth.example.com/callback"
```

#### Implementation

```ts
export function buildUrl(path: string, baseUrl?: string): string {
  const base = baseUrl ? cleanUrl(baseUrl) : getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
```

If no `baseUrl` is provided, `getBaseUrl()` is used. The path is normalized to start with `/`.

## Server URL (`lib/utils/server-url.ts`)

This module provides server-aware URL resolution that handles both client-side and server-side rendering contexts.

### getFrontendUrl

An async function that determines the correct frontend URL based on the execution context:

```ts
import { getFrontendUrl } from '@/lib/utils/server-url';

const url = await getFrontendUrl();
// Client: window.location.origin
// Server: resolved from headers or config fallback
```

#### Resolution Logic

```ts
export async function getFrontendUrl(): Promise<string> {
  // Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const host =
      headersList.get('x-forwarded-host') || headersList.get('host');
    const protocol =
      headersList.get('x-forwarded-proto') || 'https';

    if (host) {
      // Validate that the host matches our expected config
      const expectedHost = new URL(WEB_URL).host;
      const isDev = process.env.NODE_ENV === 'development';
      const isTrusted =
        host === expectedHost || (isDev && host.includes('localhost'));

      if (isTrusted) {
        return `${protocol}://${host}`;
      }
    }
  } catch (e) {
    console.warn('Failed to get headers in getFrontendUrl:', e);
  }

  return WEB_URL;
}
```

#### Environment Detection

| Context | Resolution |
|---------|------------|
| Client-side (browser) | `window.location.origin` |
| Server-side (trusted host) | Constructed from `x-forwarded-host`/`host` and `x-forwarded-proto` headers |
| Server-side (untrusted host) | Falls back to `siteConfig.url` |
| Server-side (no headers available) | Falls back to `siteConfig.url` |

#### Host Validation

The function validates the `host` header against the configured `WEB_URL` to prevent host header injection attacks:

- In **production**: Only the exact match of the configured host is trusted
- In **development**: Localhost hosts are also trusted

This security measure ensures that an attacker cannot manipulate the host header to generate URLs pointing to malicious domains.

## Combining Both Modules

A typical server-side usage combines both utilities:

```ts
import { getFrontendUrl } from '@/lib/utils/server-url';
import { buildUrl } from '@/lib/utils/url-cleaner';

// In a server action or API route
async function generateCallbackUrl(path: string) {
  const frontendUrl = await getFrontendUrl();
  return buildUrl(path, frontendUrl);
}

// Result: "https://your-app.com/auth/callback"
```

## Environment Variable Priority

The URL resolution follows a clear priority chain across both modules:

| Priority | Source | Module | Notes |
|----------|--------|--------|-------|
| 1 | `window.location.origin` | `server-url.ts` | Client-side only |
| 2 | Request headers (`x-forwarded-host`) | `server-url.ts` | Server-side, validated |
| 3 | `siteConfig.url` | `server-url.ts` | Server-side fallback |
| 4 | `NEXT_PUBLIC_APP_URL` | `url-cleaner.ts` | Used by `getBaseUrl()` |
| 5 | `VERCEL_URL` | `url-cleaner.ts` | Vercel deployment fallback |
| 6 | `https://demo.ever.works` | `url-cleaner.ts` | Hardcoded last resort |

## Source Files

| File | Purpose |
|------|---------|
| `lib/utils/url-cleaner.ts` | URL cleaning, validation, and construction |
| `lib/utils/server-url.ts` | Server-aware frontend URL resolution |
