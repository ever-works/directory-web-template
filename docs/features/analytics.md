---
id: analytics
title: Analytics System
sidebar_label: Analytics
sidebar_position: 7
---

# Analytics System

The Ever Works template integrates with **PostHog**, **Sentry**, and **Vercel Analytics** for comprehensive event tracking, error monitoring, session recording, and performance analytics.

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    Analytics Singleton                          │
│                   lib/analytics/index.ts                        │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │   PostHog     │  │   Sentry     │  │  Vercel Analytics  │    │
│  │  (Events,     │  │  (Errors,    │  │  (Web Vitals,      │    │
│  │   Sessions)   │  │   Traces)    │  │   Page Views)      │    │
│  └──────────────┘  └──────────────┘  └───────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

## Analytics Class

The core `Analytics` class in `lib/analytics/index.ts` is a singleton that manages initialization and event dispatching across providers:

```typescript
class Analytics {
  private static instance: Analytics;
  private initialized: boolean;
  private exceptionTrackingProvider: ExceptionTrackingProvider;

  static getInstance(): Analytics;
  init(): void;
  trackEvent(name: string, properties?: EventProperties): void;
  trackPageView(url: string): void;
  identify(userId: string, properties?: UserProperties): void;
  reset(): void;
}
```

### Exception Tracking Provider Resolution

The system supports flexible exception tracking configuration:

```typescript
type ExceptionTrackingProvider = 'sentry' | 'posthog' | 'both' | 'none';
```

The provider is determined by checking availability:
1. Read `EXCEPTION_TRACKING_PROVIDER` config value
2. Validate that the chosen provider is enabled
3. Fall back to the available alternative if primary is not configured

## PostHog Integration

### Configuration

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Optional
NEXT_PUBLIC_POSTHOG_DEBUG=false
NEXT_PUBLIC_POSTHOG_SESSION_RECORDING=true
NEXT_PUBLIC_POSTHOG_AUTO_CAPTURE=true
NEXT_PUBLIC_POSTHOG_SAMPLE_RATE=1.0
NEXT_PUBLIC_POSTHOG_SESSION_RECORDING_SAMPLE_RATE=0.1
NEXT_PUBLIC_POSTHOG_EXCEPTION_TRACKING=true
```

### PostHog API Service

Located at `lib/services/posthog-api.service.ts`, the server-side service provides admin analytics data:

```typescript
class PostHogApiService {
  constructor(); // Reads from analyticsConfig

  isConfigured(): boolean;
  async getTotalPageViews(days?: number): Promise<number>;
  async getTopPages(days?: number): Promise<PageData[]>;
  async getEventCounts(eventName: string, days?: number): Promise<number>;
}
```

**Required for server-side API access:**
```bash
POSTHOG_PERSONAL_API_KEY=phx_xxx
POSTHOG_PROJECT_ID=12345
```

### Client-Side Hook

```typescript
import { useAnalytics } from '@/hooks/use-analytics';

const {
  trackEvent,      // (name: string, properties?: object) => void
  trackPageView,   // (url: string) => void
  identify,        // (userId: string, properties?: object) => void
} = useAnalytics();
```

### Geo Analytics Hook

```typescript
import { useGeoAnalytics } from '@/hooks/use-geo-analytics';

const {
  geoData,         // Geographic analytics data
  isLoading,
} = useGeoAnalytics();
```

## Sentry Integration

### Configuration

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
NEXT_PUBLIC_SENTRY_EXCEPTION_TRACKING=true
```

Sentry provides:
- **Error tracking** -- Automatic capture of unhandled exceptions
- **Performance monitoring** -- Transaction tracing for API routes and page loads
- **Session replay** -- Optional session recording

## Vercel Analytics

Vercel Analytics is automatically available when deployed on Vercel:

```bash
# Enabled by default on Vercel deployments
NEXT_PUBLIC_VERCEL_ANALYTICS=true
```

Provides:
- **Web Vitals** -- Core Web Vitals (LCP, FID, CLS) monitoring
- **Page views** -- Automatic page view tracking
- **Audience insights** -- Geographic and device analytics

## Admin Analytics Dashboard

The admin dashboard provides aggregated analytics through the `useAdminStats` hook:

```typescript
import { useAdminStats } from '@/hooks/use-admin-stats';

const {
  stats,           // Dashboard statistics
  isLoading,
} = useAdminStats();
```

The `useDashboardStats` hook provides more detailed metrics:

```typescript
import { useDashboardStats } from '@/hooks/use-dashboard-stats';

const {
  stats,           // { items, users, revenue, pageViews, ... }
  isLoading,
  refetch,
} = useDashboardStats();
```

## Disabling Analytics

Analytics providers are disabled when their configuration is missing. No tracking code is loaded if the corresponding environment variables are not set. This allows the template to work without any analytics in development.
