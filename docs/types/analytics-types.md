---
id: analytics-types
title: Analytics Type Definitions
sidebar_label: Analytics Types
sidebar_position: 16
---

# Analytics Type Definitions

**Source:** `lib/config/schemas/analytics.schema.ts`, `lib/constants/analytics.ts`, `lib/db/schema.ts`

Analytics types configure tracking providers and define the data structures for engagement metrics, page views, and dashboard statistics.

## Provider Configuration Types

### `AnalyticsConfig`

Top-level analytics configuration, inferred from the Zod schema.

```typescript
interface AnalyticsConfig {
  exceptionTrackingProvider: 'posthog' | 'sentry' | 'none';
  analyze: boolean;
  posthog: PostHogConfig;
  sentry: SentryConfig;
  recaptcha: RecaptchaConfig;
  vercel: VercelAnalyticsConfig;
}
```

### PostHog Configuration

```typescript
interface PostHogConfig {
  enabled: boolean;                   // Auto-detected from key presence
  key?: string;                        // NEXT_PUBLIC_POSTHOG_KEY
  host: string;                        // Default: 'https://us.i.posthog.com'
  debug: boolean;
  sessionRecordingEnabled: boolean;    // Default: true
  autoCapture: boolean;                // Default: false
  exceptionTracking: boolean;          // Default: true
  personalApiKey?: string;             // Server-side API key for admin
  projectId?: string;                  // PostHog project identifier
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `host` | `https://us.i.posthog.com` | PostHog ingestion endpoint |
| `sessionRecordingEnabled` | `true` | Capture session replays |
| `autoCapture` | `false` | Auto-track clicks, pageviews, etc. |
| `exceptionTracking` | `true` | Forward JS exceptions to PostHog |

### Sentry Configuration

```typescript
interface SentryConfig {
  enabled: boolean;           // Auto-detected from DSN presence
  dsn?: string;
  org?: string;
  project?: string;
  authToken?: string;
  enableDev: boolean;         // Default: false
  debug: boolean;             // Default: false
  exceptionTracking: boolean; // Default: true
}
```

### Recaptcha Configuration

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Vercel Analytics Configuration

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## Viewer Tracking Constants

Defined in `lib/constants/analytics.ts`:

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

These constants power the anonymous view-counting system. Each visitor receives a persistent cookie used to deduplicate daily view counts without requiring authentication.

## Database Schema: Engagement

The `engagement` table in `lib/db/schema.ts` tracks item-level analytics:

```typescript
// Key columns from the engagement table
{
  id: serial,
  itemId: text,             // Item slug or ID
  viewCount: integer,       // Total page views
  uniqueViewCount: integer, // Unique daily viewers
  clickCount: integer,      // Outbound link clicks
  shareCount: integer,      // Social share actions
  lastViewedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## Database Schema: Activity Logs

The `activityLogs` table records user and admin actions:

```typescript
{
  id: serial,
  userId: text,        // FK -> users.id (admin actions)
  clientId: text,      // FK -> clientProfiles.id (client actions)
  action: text,        // Action identifier string
  timestamp: timestamp,
  ipAddress: varchar(45),
}
```

## Exception Tracking Provider Selection

The `exceptionTrackingProvider` field determines which service receives unhandled exceptions:

| Value | Behaviour |
|-------|-----------|
| `posthog` | Exceptions sent to PostHog (default) |
| `sentry` | Exceptions sent to Sentry |
| `none` | No exception forwarding |

## Usage Example

```typescript
import { analyticsConfig } from '@/lib/config/config-service';

// Check if PostHog is configured
if (analyticsConfig.posthog.enabled) {
  // Initialise PostHog client
}

// Check exception tracking provider
if (analyticsConfig.exceptionTrackingProvider === 'sentry') {
  // Initialise Sentry
}
```

## Related Types

- [Config Types](./config-types.md) -- `AppConfigSchema` containing `AnalyticsConfig`
- [Configuration / Analytics](../configuration/analytics-config.md) -- environment variable reference
