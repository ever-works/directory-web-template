---
id: bot-detection
title: "Bot Detection"
sidebar_label: "Bot Detection"
sidebar_position: 23
---

# Bot Detection

The template includes a User-Agent based bot detection utility for filtering out crawlers, bots, and automated tools from view tracking and analytics.

**Source:** `lib/utils/bot-detection.ts`

## Overview

The `isBot` function analyzes User-Agent strings against a curated list of patterns to determine whether a request originates from an automated agent. This is primarily used to avoid inflating view counts and analytics data with non-human traffic.

## Usage

```ts
import { isBot } from '@/lib/utils/bot-detection';

// In an API route or middleware
const userAgent = request.headers.get('user-agent') || '';

if (isBot(userAgent)) {
  // Skip view tracking, analytics capture, etc.
  return;
}

// Proceed with tracking for real users
await trackItemView(itemId);
```

## Function Signature

```ts
function isBot(userAgent: string): boolean
```

**Parameters:**
- `userAgent` -- the User-Agent header value from the request

**Returns:**
- `true` if the User-Agent matches any bot pattern or is empty/missing
- `false` if the User-Agent appears to be a regular browser

Empty or missing User-Agent strings are treated as bots, since legitimate browsers always send a User-Agent header.

## Detected Bot Categories

The detection patterns cover six categories of automated agents:

### Generic Bot Identifiers

Matches common keywords found in bot User-Agent strings:

| Pattern    | Matches                        |
|------------|--------------------------------|
| `bot`      | Any UA containing "bot"        |
| `crawl`    | Web crawlers                   |
| `spider`   | Search engine spiders          |
| `slurp`    | Yahoo Slurp crawler            |

### Major Search Engine Bots

| Pattern       | Search Engine     |
|---------------|-------------------|
| `googlebot`   | Google             |
| `bingbot`     | Microsoft Bing     |
| `yandex`      | Yandex             |
| `baidu`       | Baidu              |
| `duckduckbot` | DuckDuckGo         |

### Social Media Crawlers

| Pattern               | Platform    |
|-----------------------|-------------|
| `facebookexternalhit` | Facebook    |
| `twitterbot`          | Twitter/X   |
| `linkedinbot`         | LinkedIn    |
| `whatsapp`            | WhatsApp    |
| `telegrambot`         | Telegram    |

### Performance and Monitoring Tools

| Pattern     | Tool        |
|-------------|-------------|
| `lighthouse`| Google Lighthouse |
| `pagespeed` | PageSpeed Insights |
| `gtmetrix`  | GTmetrix    |
| `pingdom`   | Pingdom     |

### Automation and Testing Tools

| Pattern      | Tool         |
|--------------|--------------|
| `headless`   | Headless browsers |
| `phantom`    | PhantomJS    |
| `selenium`   | Selenium     |
| `puppeteer`  | Puppeteer    |
| `playwright` | Playwright   |

### HTTP Client Libraries

| Pattern           | Library/Tool     |
|-------------------|------------------|
| `curl`            | cURL             |
| `wget`            | Wget             |
| `python-requests` | Python requests  |
| `axios`           | Axios (Node.js)  |
| `node-fetch`      | node-fetch       |
| `go-http-client`  | Go HTTP client   |

## Pattern Matching

All patterns use case-insensitive matching (`/pattern/i`), ensuring detection works regardless of User-Agent casing.

The `isBot` function tests each pattern sequentially using `Array.some()` and returns as soon as the first match is found:

```ts
return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
```

## Integration Examples

### View Tracking in API Routes

```ts
import { isBot } from '@/lib/utils/bot-detection';

export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';

  // Only track views from real users
  if (!isBot(userAgent)) {
    await incrementViewCount(itemId);
  }

  // Return the item regardless
  return Response.json(item);
}
```

### Analytics Event Filtering

```ts
import { isBot } from '@/lib/utils/bot-detection';

export function trackPageView(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';

  if (isBot(userAgent)) {
    return; // Don't send bot traffic to analytics
  }

  analytics.track('page_view', {
    url: request.url,
    userAgent,
  });
}
```

### Middleware Integration

```ts
import { isBot } from '@/lib/utils/bot-detection';
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';

  // Add a header to indicate bot status for downstream handlers
  const response = NextResponse.next();
  response.headers.set('x-is-bot', isBot(userAgent) ? 'true' : 'false');

  return response;
}
```

## Limitations

- **User-Agent based** -- sophisticated bots can spoof their User-Agent to mimic regular browsers. This utility does not perform behavioral analysis or browser fingerprinting.
- **No IP-based detection** -- known bot IP ranges are not checked.
- **Static pattern list** -- new bots require manual addition to the `BOT_PATTERNS` array.
- **False positives** -- unusual but legitimate User-Agent strings might match generic patterns like `bot` or `crawl` if they happen to contain those substrings.

## Extending the Pattern List

To add detection for a new bot, add a case-insensitive regex pattern to the `BOT_PATTERNS` array:

```ts
const BOT_PATTERNS: RegExp[] = [
  // ... existing patterns ...

  // Custom bot patterns
  /my-custom-bot/i,
  /internal-crawler/i,
];
```

Each pattern is a standard JavaScript `RegExp` tested against the full User-Agent string.
