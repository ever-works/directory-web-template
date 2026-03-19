---
id: admin-analytics
title: Admin Analytics
sidebar_label: Admin Analytics
sidebar_position: 32
---

# Admin Analytics

The admin analytics system provides platform-wide statistics, engagement metrics, user growth tracking, and background data processing. It combines real-time database queries, cached aggregations, and optional PostHog integration for comprehensive analytics.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Admin Stats Repository | `lib/repositories/admin-stats.repository.ts` | Core dashboard statistics |
| Dashboard Queries | `lib/db/queries/dashboard.queries.ts` | Engagement aggregation queries |
| Engagement Queries | `lib/db/queries/engagement.queries.ts` | Per-item metrics |
| Analytics Background Processor | `lib/services/analytics-background-processor.ts` | Background job scheduler |
| Analytics Client | `lib/analytics/index.ts` | Client-side PostHog/Sentry integration |
| PostHog API Service | `lib/services/posthog-api.service.ts` | Server-side PostHog queries |
| Analytics Export | `lib/services/analytics-export.service.ts` | Data export functionality |
| Scheduled Reports | `lib/services/analytics-scheduled-reports.service.ts` | Automated report generation |

## Admin Dashboard Statistics

The `AdminStatsRepository` aggregates four categories of statistics using `Promise.allSettled` for resilient data loading:

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### User Statistics

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

Queries use UTC-normalized date boundaries to ensure consistent results regardless of server timezone:

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### Submission Statistics

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

Fetched from the `ItemRepository.getStats()` method since items live in the Git-based CMS.

### Activity Statistics

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

Views are sourced from PostHog when configured, falling back to zero:

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### Newsletter Statistics

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## Background Analytics Processing

The `AnalyticsBackgroundProcessor` schedules six recurring jobs:

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

| Job | Interval | Purpose |
|-----|----------|---------|
| User Growth Aggregation | 10 min | Refreshes user growth trends |
| Activity Trends Aggregation | 5 min | Updates engagement time series |
| Top Items Ranking | 15 min | Recalculates item popularity rankings |
| Recent Activity Update | 2 min | Refreshes latest activity feed |
| Performance Metrics Update | 30 sec | Updates real-time performance data |
| Cache Cleanup | 1 hour | Removes stale cached aggregations |

Jobs can be disabled by setting `DISABLE_AUTO_SYNC=true`.

Each job tracks its own status:

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## Engagement Metrics

### Per-Item Metrics

The `getEngagementMetricsPerItem` function fetches all metrics in parallel:

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

Four parallel queries execute:

1. View counts from `item_views`
2. Net vote scores from `votes` (upvote = +1, downvote = -1)
3. Favorite counts from `favorites`
4. Comment counts and average ratings from `comments` (excluding soft-deleted)

### Popularity Scoring

Items are scored using a logarithmic algorithm:

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## Client-Side Analytics

The `Analytics` singleton class in `lib/analytics/index.ts` manages client-side tracking:

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### Exception Tracking Providers

The analytics module supports three exception tracking configurations:

| Provider | Description |
|----------|-------------|
| `posthog` | Errors sent to PostHog only |
| `sentry` | Errors sent to Sentry only |
| `both` | Errors sent to both PostHog and Sentry |

The provider is determined from `EXCEPTION_TRACKING_PROVIDER` with automatic fallback if the configured provider is unavailable.

### PostHog Configuration

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

Sampling rates control the percentage of sessions that are tracked, configured via environment variables.

## Dashboard Data Queries

### Weekly Engagement Trends

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

Uses PostgreSQL `to_char(date, 'IYYY-IW')` for ISO week grouping.

### Daily Activity Breakdown

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### Top Performing Items

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

Items are ranked by total engagement (votes plus comments).

## Resilient Data Loading

The `getAllStats` method uses `Promise.allSettled` to ensure partial failures do not break the dashboard:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## Permission Requirements

Analytics features are gated by the permission system:

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

Plan-based feature access:

| Feature | Free | Standard | Premium |
|---------|------|----------|---------|
| View Statistics | No | Yes | Yes |
| Advanced Analytics | No | No | Yes |

## Related Documentation

- [Analytics Background](/docs/template/services/analytics-background) -- Background processing details
- [PostHog Service](/docs/template/services/posthog-service) -- PostHog server-side API
- [Export Service](/docs/template/services/export-service) -- Data export
- [Activity Service](/docs/template/services/activity-service) -- User activity tracking
- [Engagement Service](/docs/template/services/engagement-services) -- Popularity scoring
