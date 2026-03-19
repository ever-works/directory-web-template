---
id: currency-services
title: Currency Services
sidebar_label: Currency Services
sidebar_position: 6
---

# Currency Services

The template includes a currency detection service that automatically determines the appropriate currency for a user based on multiple signals. This enables localized pricing display across the platform without requiring users to manually select their currency.

## Overview

The currency detection system is implemented in `currency-detection.service.ts` and provides:

- Country-to-currency mapping for 50+ countries
- Multi-provider header-based country detection (Cloudflare, Vercel, CloudFront, Fastly)
- Location string parsing for country extraction
- IP-based geolocation via CDN headers (no external API calls required)
- Tiered fallback strategy with sensible defaults

## Detection Priority

Currency detection follows a strict priority chain:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 | Profile country | User's explicit country setting |
| 2 | Profile location | Extracted from location string (e.g., "Paris, France") |
| 3 | Request headers | CDN/proxy-injected country headers |
| 4 | Default | Falls back to `USD` |

```typescript
import { detectUserCurrency } from '@/lib/services/currency-detection.service';

const { currency, country } = await detectUserCurrency({
  profileCountry: user.country,       // e.g., "DE"
  profileLocation: user.location,     // e.g., "Berlin, Germany"
  headers: request.headers,           // HTTP request headers
});
// { currency: "EUR", country: "DE" }
```

## Country-to-Currency Mapping

The service maintains a comprehensive mapping of ISO 3166-1 alpha-2 country codes to ISO 4217 currency codes:

| Region | Countries | Currencies |
|--------|-----------|------------|
| North America | US, CA, MX | USD, CAD, MXN |
| Europe (Eurozone) | FR, DE, ES, IT, NL, BE, AT, PT, FI, GR, LU, IE, HR | EUR |
| Europe (Other) | GB, CH, NO, SE, DK, PL, CZ, HU, RO, BG | GBP, CHF, NOK, SEK, DKK, PLN, CZK, HUF, RON, BGN |
| Asia Pacific | JP, CN, KR, IN, AU, NZ, SG, HK, TW, TH, MY, ID, PH, VN | JPY, CNY, KRW, INR, AUD, NZD, SGD, HKD, TWD, THB, MYR, IDR, PHP, VND |
| Middle East | AE, SA, IL, TR | AED, SAR, ILS, TRY |
| South America | BR, AR, CL, CO, PE | BRL, ARS, CLP, COP, PEN |
| Africa | ZA, EG, NG, KE | ZAR, EGP, NGN, KES |

## Header-Based Country Detection

The service supports multiple CDN providers for extracting country information from HTTP headers, with no external API calls required.

### Supported Providers

| Provider | Header Name | Environment Detection |
|----------|------------|----------------------|
| Cloudflare | `cf-ipcountry` | Auto-detected |
| Vercel | `x-vercel-ip-country` | `VERCEL=1` env var |
| AWS CloudFront | `cloudfront-viewer-country` | Auto-detected |
| Fastly | `fastly-geo-country-code` | Auto-detected |
| Generic | `x-country` | Fallback |

### Detection Modes

```typescript
import { getCountryFromHeaders } from '@/lib/services/currency-detection.service';

// Smart mode (recommended) - auto-detects best provider
const country = getCountryFromHeaders(headers, 'smart');

// Auto mode - checks all providers in priority order
const country = getCountryFromHeaders(headers, 'auto');

// Specific provider
const country = getCountryFromHeaders(headers, 'cloudflare');
```

**Smart mode** is the recommended approach. It first checks environment variables to identify the hosting platform, then validates that the expected header is present before falling back to auto mode.

### Country Code Normalization

All country codes are validated against the ISO 3166-1 alpha-2 format (exactly 2 uppercase letters). The `normalizeCountryCode` function handles trimming whitespace and converting to uppercase.

## Location String Parsing

The `extractCountryCode` function parses location strings in various formats:

```typescript
import { extractCountryCode } from '@/lib/services/currency-detection.service';

extractCountryCode('US');                  // "US"
extractCountryCode('Berlin, DE');          // "DE"
extractCountryCode('Paris, France');       // "FR"
extractCountryCode('New York, United States'); // "US"
extractCountryCode('Tokyo');               // null (no country info)
```

### Parsing Strategy

1. Check if the string is already a 2-letter country code
2. Split by comma and check the last segment for a country code
3. Match against a built-in country name mapping (50+ country names supported)

## Client IP Detection

The service includes a utility to extract client IP addresses from request headers, useful for logging and fallback geolocation:

```typescript
import { getClientIP } from '@/lib/services/currency-detection.service';

const ip = getClientIP(request);
```

The function checks headers in the following order:

| Header | Source |
|--------|--------|
| `x-forwarded-for` | Proxies/load balancers (first IP extracted) |
| `x-real-ip` | Nginx reverse proxy |
| `cf-connecting-ip` | Cloudflare |

## Regional Defaults

When a country is detected but not in the mapping, the service falls back to `USD` as the global default. Regional defaults are defined but currently funnel to the main `DEFAULT`:

```typescript
const DEFAULT_CURRENCIES = {
  AMERICAS: 'USD',
  EUROPE: 'EUR',
  ASIA: 'USD',
  MIDDLE_EAST: 'USD',
  AFRICA: 'USD',
  OCEANIA: 'AUD',
  DEFAULT: 'USD',
};
```

## Integration Example

A typical integration in an API route or server component:

```typescript
import { detectUserCurrency } from '@/lib/services/currency-detection.service';
import { headers } from 'next/headers';

export async function GET() {
  const headerStore = headers();
  const user = await getCurrentUser();

  const { currency, country } = await detectUserCurrency({
    profileCountry: user?.country,
    profileLocation: user?.location,
    headers: headerStore,
  });

  return Response.json({
    currency,    // e.g., "EUR"
    country,     // e.g., "DE"
    prices: await getPricesForCurrency(currency),
  });
}
```

## Source Files

| File | Path |
|------|------|
| Currency Detection Service | `template/lib/services/currency-detection.service.ts` |
