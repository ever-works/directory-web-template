---
id: analytics-layer
title: "Analytics Integration Layer"
sidebar_label: "Analytics Layer"
sidebar_position: 28
---

# Analytics Integration Layer

The analytics module (`lib/analytics/index.ts`) provides a unified analytics layer that abstracts PostHog event tracking, Sentry error monitoring, and feature flag evaluation behind a single `Analytics` class. The module uses the singleton pattern to ensure a single initialized instance across the application.

## Architecture Overview

The analytics layer wraps two providers:

- **PostHog** -- Event tracking, page views, user identification, feature flags, session recording, and exception tracking
- **Sentry** -- Error monitoring and exception tracking

Both providers are optional and controlled via environment configuration constants. The module gracefully degrades when providers are disabled.

## The Analytics Class

### Singleton Access

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

The `analytics` export is a pre-initialized singleton. The class itself is also exported for type usage:

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### Initialization

The `init()` method must be called once on the client side before any tracking calls:

```ts
analytics.init();
```

#### What Happens During Init

1. **SSR guard** -- Skips initialization if `window` is undefined
2. **PostHog setup** -- If enabled, initializes PostHog with centralized configuration
3. **Session recording** -- Conditionally enables session recording with input masking
4. **Sampling** -- Applies event sampling rate (opt-out users randomly based on `POSTHOG_SAMPLE_RATE`)
5. **Exception tracking** -- Sets up PostHog global error handlers if configured
6. **Sentry integration** -- Links PostHog and Sentry when both are enabled

#### PostHog Configuration

The init method constructs the PostHog config from centralized constants:

```ts
const baseConfig: Partial<PostHogConfig> = {
  api_host: posthogHost,
  debug: POSTHOG_DEBUG.value === 'true',
  persistence: 'localStorage',
  capture_pageview: POSTHOG_AUTO_CAPTURE.value === 'true',
  capture_pageleave: true,
  enable_recording_console_log: POSTHOG_DEBUG.value === 'true',
  mask_all_element_attributes: false,
  mask_all_text: false,
  loaded: (posthog) => {
    if (POSTHOG_SAMPLE_RATE < 1) {
      if (Math.random() > POSTHOG_SAMPLE_RATE) {
        posthog.opt_out_capturing();
      }
    }
  },
};
```

When session recording is enabled, additional config is merged:

```ts
const config = POSTHOG_SESSION_RECORDING_ENABLED.value === 'true'
  ? {
      ...baseConfig,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-mask]',
        sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
      },
    }
  : baseConfig;
```

## Exception Tracking Providers

The module supports flexible exception tracking with four provider modes:

| Provider | Behavior |
|----------|----------|
| `'posthog'` | Exceptions sent to PostHog only |
| `'sentry'` | Exceptions sent to Sentry only |
| `'both'` | Exceptions sent to both PostHog and Sentry |
| `'none'` | Exception tracking disabled |

The provider is determined automatically at construction time based on the `EXCEPTION_TRACKING_PROVIDER` config and the availability of each provider:

```ts
private determineExceptionTrackingProvider(): ExceptionTrackingProvider {
  const provider = EXCEPTION_TRACKING_PROVIDER.value;

  // Validate availability and fall back gracefully
  if (provider === 'sentry' && !SENTRY_ENABLED) {
    return POSTHOG_ENABLED ? 'posthog' : 'none';
  }

  if (provider === 'posthog' && !POSTHOG_ENABLED) {
    return SENTRY_ENABLED ? 'sentry' : 'none';
  }

  // For 'both', check what's actually available
  if (provider === 'both') {
    const sentryAvailable = SENTRY_ENABLED;
    const posthogAvailable = POSTHOG_ENABLED;
    if (!sentryAvailable && !posthogAvailable) return 'none';
    if (!sentryAvailable) return 'posthog';
    if (!posthogAvailable) return 'sentry';
  }

  return provider;
}
```

## API Reference

### User Identification

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

The `identify` method sets the user in both PostHog and Sentry simultaneously. The `reset` method clears identity in both.

### Event Tracking

```ts
// Track a custom event
analytics.track('checkout_started', {
  plan: 'pro',
  source: 'pricing_page',
});

// Track a page view
analytics.trackPageView('/pricing', {
  referrer: document.referrer,
});
```

### Feature Flags

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

The `isFeatureEnabled` method returns the `defaultValue` when PostHog is not initialized or the flag is not found.

### Exception Tracking

```ts
// Capture an exception
analytics.captureException(new Error('Something went wrong'), {
  component: 'PaymentForm',
  action: 'submit',
});

// Capture from a string
analytics.captureException('Unexpected response format', {
  endpoint: '/api/data',
});
```

The `captureException` method routes to the configured provider(s):

```ts
captureException(error: Error | string, context?: Record<string, any>) {
  const errorObject =
    typeof error === 'string' ? new Error(error) : error;

  // Send to PostHog
  if (POSTHOG_ENABLED && (provider === 'posthog' || provider === 'both')) {
    this.track('$exception', {
      $exception_message: errorObject.message,
      $exception_type: errorObject.name,
      $exception_stack_trace_raw: errorObject.stack,
      $exception_handled: true,
      ...context,
    });
  }

  // Send to Sentry
  if (SENTRY_ENABLED && (provider === 'sentry' || provider === 'both')) {
    Sentry.captureException(errorObject, {
      extra: context,
    });
  }
}
```

### User and Super Properties

```ts
// Set persistent user properties
analytics.setUserProperties({
  plan: 'pro',
  company: 'Acme Inc',
});

// Set super properties (sent with every event)
analytics.setSuperProperties({
  app_version: '1.0.0',
  environment: 'production',
});
```

## PostHog Exception Tracking Setup

When PostHog exception tracking is enabled, the module installs global error handlers:

```ts
private setupPostHogExceptionTracking() {
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    this.captureException(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      type: 'window.onerror',
    });
    // Chain to original handler
    if (typeof originalOnError === 'function') {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    this.captureException(
      new Error(event.reason?.message || String(event.reason)),
      { type: 'unhandledrejection' }
    );
  });
}
```

This captures both synchronous errors (`window.onerror`) and unhandled promise rejections.

## Sentry-PostHog Integration

When both providers are configured with the `'both'` mode, the module links them together by adding a Sentry event processor that forwards errors to PostHog:

```ts
Sentry.addIntegration({
  name: 'PostHog',
  setupOnce() {
    Sentry.addEventProcessor((event) => {
      if (event.user) {
        posthog.capture('sentry_error', {
          error: event.message,
          error_id: event.event_id,
          error_type: event.type,
          error_context: event.contexts,
          error_tags: event.tags,
        });
      }
      return event;
    });
  },
});
```

This gives you Sentry errors in PostHog for correlation with user sessions.

## Safety Guards

Every public method includes three safety checks:

1. **Initialization check** -- `if (!this.initialized)` prevents calls before `init()`
2. **Provider check** -- `if (!POSTHOG_ENABLED)` skips when provider is disabled
3. **SSR guard** -- `if (typeof window === 'undefined')` prevents server-side calls

These guards ensure the analytics module never throws in any environment.

## Configuration Constants

The module reads from centralized constants defined in `lib/constants.ts`:

| Constant | Purpose |
|----------|---------|
| `POSTHOG_KEY` | PostHog project API key |
| `POSTHOG_HOST` | PostHog API host URL |
| `POSTHOG_ENABLED` | Master toggle for PostHog |
| `POSTHOG_DEBUG` | Enable debug logging |
| `POSTHOG_SESSION_RECORDING_ENABLED` | Enable session recording |
| `POSTHOG_AUTO_CAPTURE` | Auto-capture page views |
| `POSTHOG_SAMPLE_RATE` | Event sampling rate (0-1) |
| `POSTHOG_SESSION_RECORDING_SAMPLE_RATE` | Recording sampling rate |
| `SENTRY_ENABLED` | Master toggle for Sentry |
| `EXCEPTION_TRACKING_PROVIDER` | Which provider handles exceptions |
| `POSTHOG_EXCEPTION_TRACKING` | Enable PostHog exception capture |
| `SENTRY_EXCEPTION_TRACKING` | Enable Sentry exception capture |

## Source Files

| File | Purpose |
|------|---------|
| `lib/analytics/index.ts` | Analytics singleton class and provider abstraction |
| `lib/constants.ts` | Configuration constants for all analytics providers |
