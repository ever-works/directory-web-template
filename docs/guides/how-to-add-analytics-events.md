---
id: how-to-add-analytics-events
title: "How to Add Analytics Events"
sidebar_label: "Add Analytics Events"
sidebar_position: 75
---

# How to Add Analytics Events

This guide covers adding custom analytics events using PostHog for product analytics and Sentry for error tracking. The template provides a unified `Analytics` class that manages both providers through a single API.

## Prerequisites

- PostHog project set up with a valid API key
- Sentry project configured (optional, for error tracking)
- Understanding of client-side vs. server-side event contexts

---

## Architecture Overview

Analytics in the template is managed by a singleton `Analytics` class in `lib/analytics/index.ts`:

```
lib/analytics/
  index.ts             <-- Analytics class (PostHog + Sentry)

lib/services/
  posthog-api.service.ts   <-- Server-side PostHog API client

lib/constants.ts       <-- Configuration flags (POSTHOG_KEY, SENTRY_DSN, etc.)
```

The `Analytics` class handles:

- **Event tracking** via PostHog (`analytics.track()`)
- **Page view tracking** (`analytics.trackPageView()`)
- **User identification** (`analytics.identify()`)
- **Feature flags** (`analytics.isFeatureEnabled()`)
- **Exception tracking** via PostHog and/or Sentry (`analytics.captureException()`)

---

## Step 1: Track a Custom Event (Client-Side)

### Import the Analytics Instance

```typescript
import { analytics } from "@/lib/analytics";
```

### Track an Event

```typescript
// Basic event
analytics.track("item_bookmarked", {
  itemSlug: "my-tool",
  category: "productivity",
});

// Event with user context (after identify)
analytics.track("search_performed", {
  query: searchTerm,
  resultCount: results.length,
  filters: activeFilters,
});
```

### Common Event Patterns

| Event Name | When to Fire | Properties |
|-----------|-------------|------------|
| `item_viewed` | User views an item detail page | `itemSlug`, `category`, `source` |
| `item_bookmarked` | User bookmarks an item | `itemSlug`, `category` |
| `search_performed` | User executes a search | `query`, `resultCount`, `filters` |
| `filter_applied` | User applies a filter | `filterType`, `filterValue` |
| `signup_completed` | User completes registration | `method` (email, Google, GitHub) |
| `subscription_started` | User starts a paid plan | `planName`, `billingPeriod` |

---

## Step 2: Identify Users

Call `identify` after the user logs in to associate events with their profile:

```typescript
// After successful authentication
analytics.identify(session.user.id, {
  email: session.user.email,
  name: session.user.name,
  plan: userProfile.plan,
  accountType: userProfile.accountType,
});
```

Set additional user properties at any time:

```typescript
analytics.setUserProperties({
  plan: "premium",
  totalItems: 42,
  lastLoginAt: new Date().toISOString(),
});
```

Reset the identity on logout:

```typescript
analytics.reset();
```

---

## Step 3: Track Page Views

The template can auto-capture page views (controlled by `POSTHOG_AUTO_CAPTURE`), but you can also track them manually for SPA navigation:

```typescript
// In a layout or navigation component
analytics.trackPageView(window.location.href, {
  locale: currentLocale,
  section: "admin",
});
```

---

## Step 4: Track Errors and Exceptions

The `Analytics` class provides unified error tracking that routes to PostHog, Sentry, or both based on configuration:

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Track in PostHog and/or Sentry
  analytics.captureException(error, {
    component: "BookmarkButton",
    action: "create_bookmark",
    itemSlug: slug,
  });
}
```

### Server-Side Error Tracking

For server-side code (API routes, services), use Sentry directly:

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await databaseOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: "BookmarkService",
      operation: "create",
    },
    extra: {
      userId,
      itemSlug,
    },
  });
  throw error; // Re-throw or handle as appropriate
}
```

---

## Step 5: Use Feature Flags

PostHog feature flags allow you to roll out features gradually:

```typescript
// Check a feature flag
const showNewSearch = analytics.isFeatureEnabled(
  "new-search-ui",
  false  // default value
);

if (showNewSearch) {
  // Render new search component
}

// Reload flags (e.g., after user property changes)
await analytics.reloadFeatureFlags();
```

---

## Step 6: Set Super Properties

Super properties are sent with every subsequent event -- useful for global context:

```typescript
analytics.setSuperProperties({
  appVersion: "2.1.0",
  theme: currentTheme,
  locale: currentLocale,
});
```

---

## Server-Side Analytics with PostHog API

For server-side analytics (e.g., in cron jobs or API routes), use the `PostHogApiService`:

```typescript
import { PostHogApiService } from "@/lib/services/posthog-api.service";

const posthogApi = new PostHogApiService();

// Get total page views for the last 30 days
const pageViews = await posthogApi.getTotalPageViews(30);
```

This service makes authenticated API calls to the PostHog API and is used by the admin analytics dashboard.

---

## Configuration Reference

Analytics behavior is controlled by environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project API key | -- |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog instance URL | `https://us.i.posthog.com` |
| `NEXT_PUBLIC_POSTHOG_DEBUG` | Enable debug logging | `false` |
| `NEXT_PUBLIC_POSTHOG_SESSION_RECORDING` | Enable session recording | `false` |
| `NEXT_PUBLIC_POSTHOG_AUTO_CAPTURE` | Auto-capture page views | `true` |
| `NEXT_PUBLIC_POSTHOG_SAMPLE_RATE` | Event sampling rate (0-1) | `1` |
| `NEXT_PUBLIC_POSTHOG_EXCEPTION_TRACKING` | Track exceptions in PostHog | `false` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking | -- |
| `NEXT_PUBLIC_SENTRY_DEBUG` | Enable Sentry debug mode | `false` |
| `NEXT_PUBLIC_EXCEPTION_TRACKING_PROVIDER` | Provider: `posthog`, `sentry`, `both`, `none` | `sentry` |

---

## Event Naming Conventions

Follow these conventions for consistent analytics:

| Convention | Example |
|-----------|---------|
| Use `snake_case` | `item_bookmarked`, not `itemBookmarked` |
| Start with the object | `item_viewed`, `user_signed_up` |
| Use past tense for completed actions | `search_performed`, `filter_applied` |
| Prefix internal events with `$` | `$pageview`, `$exception` (PostHog convention) |
| Include relevant entity IDs | `{ itemSlug, userId, category }` |

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Events not appearing in PostHog | Check that `NEXT_PUBLIC_POSTHOG_KEY` is set and `analytics.init()` is called |
| Tracking events on the server | The `Analytics` class is client-only; use `PostHogApiService` or Sentry for server-side tracking |
| Too many events overwhelming PostHog quota | Use sampling (`POSTHOG_SAMPLE_RATE`) and be selective about which events to track |
| Feature flags returning defaults | Ensure `analytics.init()` is called before checking flags; flags are loaded asynchronously |
| Sentry errors not linking to PostHog | Set `EXCEPTION_TRACKING_PROVIDER=both` to send errors to both providers |
| PII leaking into analytics | Never include passwords, tokens, or full email addresses in event properties |

---

## Related Pages

- [Instrumentation](/docs/guides/instrumentation) -- Sentry setup in `instrumentation.ts`
- [Performance Optimization](/docs/guides/performance-optimization) -- using analytics to identify bottlenecks
- [Admin Dashboard](/docs/guides/admin-dashboard) -- where analytics data is displayed
- [Logging](/docs/guides/logging) -- structured logging complements analytics
