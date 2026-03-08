---
id: currency-service
title: "Currency Service Deep Dive"
sidebar_label: "Currency Service"
sidebar_position: 41
---

# Currency Service

## Overview

The Currency Service manages user currency preferences and provides automatic currency detection based on geographic signals. It combines two modules: `currency.service.ts` for profile-based currency management, and `currency-detection.service.ts` for intelligent detection using profile data, location strings, and CDN/proxy headers. The system supports 50+ country-to-currency mappings and multiple CDN provider header formats.

## Architecture

The Currency Service operates at the intersection of user profiles and request context. The detection service uses a layered priority system that checks profile data first, then falls back to HTTP header-based geolocation provided by CDN providers (Cloudflare, Vercel, CloudFront, Fastly).

```
Request / User Action
        |
   currency.service.ts       (profile management layer)
        |
   currency-detection.service.ts  (detection layer)
        |
   +-----------+-----------+
   | Profile   | CDN/Proxy |
   | Country   | Headers   |
   +-----------+-----------+
        |
   client.queries.ts
        |
   Database (client_profiles table)
```

## API Reference

### Currency Service Functions

#### `getUserCurrency(userId: string | null | undefined, request?: Request | Headers): Promise<string>`

Returns the user's currency preference. If no currency is stored in the profile, it auto-detects from available signals and persists the result.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string \| null \| undefined` | The user ID; returns `'USD'` for anonymous users |
| `request` | `Request \| Headers` | Optional HTTP request or headers for geo-detection |

**Returns:** `string` -- An uppercase ISO 4217 currency code (e.g., `'EUR'`, `'GBP'`).

**Behavior:**
1. Returns `'USD'` immediately for anonymous users
2. Checks the user's profile for a stored currency
3. If none found, runs detection and persists the result
4. Falls back to `'USD'` on any error

---

#### `updateUserCurrency(userId: string | null | undefined, currency?: string, country?: string): Promise<boolean>`

Updates the user's currency and/or country preference explicitly.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string \| null \| undefined` | The user ID |
| `currency` | `string` | Optional currency code to set |
| `country` | `string` | Optional country code to set |

**Returns:** `boolean` -- `true` on success, `false` if user not found or error occurs.

---

#### `updateUserCountry(userId: string, country: string): Promise<boolean>`

Updates the user's country and automatically derives the corresponding currency.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | `string` | The user ID |
| `country` | `string` | ISO 3166-1 alpha-2 country code |

**Returns:** `boolean` -- `true` on success, `false` on failure.

### Currency Detection Functions

#### `detectUserCurrency(options): Promise<{ currency: string; country: string | null }>`

Detects the best currency and country for a user using a priority chain.

**Priority order:**
1. Explicit profile country
2. Country extracted from location string (e.g., "Paris, France")
3. CDN/proxy header geolocation
4. Default: `'USD'`

---

#### `getCurrencyFromCountry(countryCode: string | null | undefined): string`

Maps an ISO 3166-1 alpha-2 country code to its currency. Returns `'USD'` for unknown countries.

---

#### `extractCountryCode(location: string | null | undefined): string | null`

Extracts a country code from freeform location strings. Handles formats like `"FR"`, `"Paris, France"`, `"City, US"`, and full country names.

---

#### `getCountryFromHeaders(headers: Headers, provider?: CountryHeaderProvider): string | null`

Reads country codes from HTTP headers set by CDN/proxy providers. Supports `'smart'` (auto-detect best provider), `'auto'` (check all), or specific providers.

**Supported providers:** `cloudflare`, `vercel`, `cloudfront`, `fastly`, `generic`

**Header mappings:**
| Provider | Header |
|----------|--------|
| Cloudflare | `cf-ipcountry` |
| Vercel | `x-vercel-ip-country` |
| CloudFront | `cloudfront-viewer-country` |
| Fastly | `fastly-geo-country-code` |
| Generic | `x-country` |

---

#### `getClientIP(request: Request | Headers): string | null`

Extracts the client IP address from proxy headers (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`).

## Implementation Details

- **Smart provider detection:** The `'smart'` mode checks environment variables (e.g., `VERCEL === '1'`) and header presence to select the optimal CDN provider, avoiding unnecessary header checks.
- **Country normalization:** All country codes are validated as exactly 2 uppercase alpha characters (ISO 3166-1 alpha-2) before use.
- **Auto-persist on detection:** When currency is detected for the first time, it is automatically saved to the user's profile to avoid repeated detection on subsequent requests.
- **No external API calls:** Currency detection relies entirely on CDN-injected headers and profile data. No third-party geolocation APIs are called, keeping latency minimal.
- **50+ country mappings:** The `COUNTRY_TO_CURRENCY` map covers North America, Europe (including Eurozone), Asia Pacific, Middle East, South America, and Africa.

## Database Interactions

| Operation | Query Function | Table |
|-----------|---------------|-------|
| Get profile | `getClientProfileByUserId(userId)` | `client_profiles` |
| Update profile | `updateClientProfile(id, updates)` | `client_profiles` |

Fields used: `currency`, `country`, `location` on the `client_profiles` table.

## Error Handling

- All public functions wrap their logic in try/catch blocks and log errors with the `[CurrencyService]` prefix.
- `getUserCurrency` returns `'USD'` as a fallback on any error.
- `updateUserCurrency` and `updateUserCountry` return `false` on failure.
- Invalid URLs or unparseable location strings return `null` silently.

## Usage Examples

```typescript
import { getUserCurrency, updateUserCurrency, updateUserCountry } from '@/lib/services/currency.service';
import { getCountryFromHeaders, getCurrencyFromCountry } from '@/lib/services/currency-detection.service';

// Get currency for authenticated user (auto-detects if not set)
const currency = await getUserCurrency(userId, request);
// => 'EUR' (detected from Vercel header showing 'FR')

// Manually update a user's currency
await updateUserCurrency(userId, 'GBP', 'GB');

// Update country (auto-derives currency)
await updateUserCountry(userId, 'JP');
// Sets country='JP', currency='JPY'

// Direct detection from headers
const country = getCountryFromHeaders(request.headers, 'smart');
const detectedCurrency = getCurrencyFromCountry(country);
```

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `VERCEL` | No | Set to `'1'` by Vercel automatically; enables Vercel header priority in smart detection |

No other environment variables are required. The service is fully functional with any CDN provider that injects country headers.

## Related Services

- [Subscription Service](./subscription-service-deep-dive.md) -- Uses currency for payment processing
- [Stripe Products Service](./stripe-products-service.md) -- Multi-currency price lookups
- [User Service](./user-service.md) -- Client profile management
