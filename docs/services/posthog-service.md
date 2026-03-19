---
id: posthog-service
title: "PostHog Integration Service"
sidebar_label: "PostHog Integration"
sidebar_position: 28
---

# PostHog Integration Service

The template provides two complementary PostHog integrations: a **server-side API service** for querying analytics data from the PostHog API, and a **client-side Analytics class** for tracking events, page views, feature flags, and exceptions.

## Server-Side: PostHog API Service

**Source:** `lib/services/posthog-api.service.ts`

The `PostHogApiService` makes authenticated requests to the PostHog API to retrieve analytics insights. It is used by the admin dashboard to display page view metrics.

### Configuration

The service reads its configuration from the centralized analytics config:

```ts
import { postHogApiService } from '@/lib/services/posthog-api.service';

// Check if PostHog API is configured
if (postHogApiService.isConfigured()) {
  const pageViews = await postHogApiService.getTotalPageViews(30);
}
```

Required configuration values (via `analyticsConfig.posthog`):

| Setting           | Description                              |
|-------------------|------------------------------------------|
| `personalApiKey`  | PostHog personal API key for server use  |
| `projectId`       | PostHog project ID                       |

The base URL defaults to `https://us.i.posthog.com` but is derived from the `POSTHOG_HOST` constant.

### API Methods

#### Get Total Page Views

Returns the total number of `$pageview` events over a given number of days:

```ts
const totalViews = await postHogApiService.getTotalPageViews(30);
// Returns: number (e.g., 15423)
```

This calls the PostHog `/insights/trend/` endpoint with a `$pageview` event filter.

#### Get Page Views by Date Range

Returns a date-keyed object of daily page view counts:

```ts
const dateFrom = new Date('2025-01-01');
const dateTo = new Date('2025-01-31');

const viewsByDate = await postHogApiService.getPageViewsByDateRange(dateFrom, dateTo);
// Returns: Record<string, number>
// { "2025-01-01": 523, "2025-01-02": 489, ... }
```

### Response Types

```ts
interface PostHogInsightResponse {
  results: Array<{
    data: number[];
    labels: string[];
    count: number;
  }>;
}

interface PostHogEventResponse {
  results: Array<{
    event: string;
    timestamp: string;
    properties: Record<string, unknown>;
  }>;
  count: number;
}
```

### Error Handling

Both API methods use graceful fallback -- if the API request fails, they log the error and return `0` or `{}` respectively instead of throwing.

## Client-Side: Analytics Class

**Source:** `lib/analytics/index.ts`

The `Analytics` class is a singleton that wraps PostHog's client-side SDK and optionally integrates with Sentry for exception tracking.

### Initialization

```ts
import { analytics } from '@/lib/analytics';

// Initialize (typically in a root layout or provider)
analytics.init();
```

The `init()` method:
1. Checks that it is running in a browser environment
2. Reads PostHog configuration from environment constants
3. Initializes the PostHog SDK with the configured options
4. Sets up exception tracking based on the configured provider
5. Optionally links PostHog with Sentry for dual error reporting

### Environment Constants

The Analytics class reads from these constants:

| Constant                              | Purpose                                       |
|---------------------------------------|-----------------------------------------------|
| `POSTHOG_KEY`                         | PostHog project API key                       |
| `POSTHOG_HOST`                        | PostHog instance URL                          |
| `POSTHOG_ENABLED`                     | Master toggle for PostHog                     |
| `POSTHOG_DEBUG`                       | Enable debug mode and console log recording   |
| `POSTHOG_SESSION_RECORDING_ENABLED`   | Enable session recording                      |
| `POSTHOG_AUTO_CAPTURE`                | Auto-capture page views                       |
| `POSTHOG_SAMPLE_RATE`                 | Event sampling rate (0-1)                     |
| `POSTHOG_SESSION_RECORDING_SAMPLE_RATE`| Session recording sample rate                |
| `SENTRY_ENABLED`                      | Enable Sentry integration                     |
| `EXCEPTION_TRACKING_PROVIDER`         | Provider selection: sentry, posthog, both, none |

### User Identification

```ts
// Identify a user with optional properties
analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium',
});

// Reset identity (on logout)
analytics.reset();
```

Both `identify` and `reset` also sync with Sentry when it is enabled.

### Event Tracking

```ts
// Track a custom event
analytics.track('item_submitted', {
  itemId: 'item-456',
  category: 'tools',
});

// Track a page view
analytics.trackPageView('/tools/my-tool', {
  referrer: document.referrer,
});
```

### Feature Flags

```ts
// Check if a feature flag is enabled
const isEnabled = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags from PostHog
await analytics.reloadFeatureFlags();
```

### Exception Tracking

The Analytics class supports three exception tracking providers: PostHog, Sentry, or both.

```ts
// Capture an exception
analytics.captureException(new Error('Something went wrong'), {
  component: 'ItemForm',
  action: 'submit',
});

// Capture from a string
analytics.captureException('Unexpected state encountered');

// Check configured provider
const provider = analytics.getExceptionTrackingProvider();
// Returns: 'sentry' | 'posthog' | 'both' | 'none'
```

When PostHog exception tracking is enabled, the class installs global error handlers:

- **`window.onerror`** -- catches unhandled errors
- **`unhandledrejection`** listener -- catches unhandled promise rejections

### Provider Fallback Logic

The `determineExceptionTrackingProvider` method implements smart fallback:

1. If the configured provider (e.g., `'sentry'`) is not actually enabled, it falls back to the other provider
2. If `'both'` is configured but only one provider is available, it uses the available one
3. If neither provider is available, it returns `'none'`

### User Properties

```ts
// Set properties on the current user
analytics.setUserProperties({
  company: 'Acme Corp',
  role: 'admin',
});

// Set super properties (sent with every event)
analytics.setSuperProperties({
  appVersion: '2.1.0',
  environment: 'production',
});
```

### Session Recording Configuration

When session recording is enabled, the PostHog SDK is configured with:

```ts
session_recording: {
  maskAllInputs: true,              // Mask form inputs for privacy
  maskTextSelector: "[data-mask]",  // Mask elements with data-mask attribute
  sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
}
```

### Event Sampling

The `POSTHOG_SAMPLE_RATE` constant controls what percentage of users have events captured. When the rate is below 1, users are randomly opted out during initialization:

```ts
loaded: (posthog) => {
  if (POSTHOG_SAMPLE_RATE < 1) {
    if (Math.random() > POSTHOG_SAMPLE_RATE) {
      posthog.opt_out_capturing();
    }
  }
}
```

## Sentry Integration

When both PostHog and Sentry are enabled with `EXCEPTION_TRACKING_PROVIDER` set to `'both'`, the Analytics class:

1. Links the PostHog instance with Sentry via `posthog.sentry = Sentry`
2. Adds a Sentry event processor that forwards errors to PostHog as `sentry_error` events

This enables correlating Sentry error IDs with PostHog session recordings.

## Safety Guards

Every public method on the Analytics class checks three conditions before executing:

1. `this.initialized` -- `init()` has been called
2. `POSTHOG_ENABLED` -- PostHog is configured
3. `typeof window !== 'undefined'` -- running in browser context

If any condition fails, the method returns silently, making the Analytics class safe to call from server-rendered contexts.
