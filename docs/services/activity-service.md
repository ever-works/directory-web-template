---
id: activity-service
title: Activity Service
sidebar_label: Activity Service
sidebar_position: 39
---

# Activity Service

The activity system tracks user actions through activity logs and provides dashboard-ready engagement data. It combines database-tracked activity (votes, comments) with client profile data to power user dashboards, admin statistics, and weekly engagement charts.

## Architecture Overview

| Module | Path | Purpose |
|--------|------|---------|
| Schema | `lib/db/schema.ts` | `activityLogs` table definition and `ActivityType` enum |
| Dashboard Queries | `lib/db/queries/dashboard.queries.ts` | User activity counts and trends |
| Admin Stats Repository | `lib/repositories/admin-stats.repository.ts` | Admin dashboard statistics |
| Client Dashboard Repository | `lib/repositories/client-dashboard.repository.ts` | Client-side dashboard data |

## Database Schema

### activityLogs

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` | Auto-incrementing primary key |
| `userId` | `text` | FK to `users.id` (cascade delete, nullable) |
| `clientId` | `text` | FK to `client_profiles.id` (cascade delete, nullable) |
| `action` | `text` | Activity type string (required) |
| `timestamp` | `timestamp` | When the activity occurred |
| `ip_address` | `varchar(45)` | IP address of the request |

The table supports both admin user activities (via `userId`) and client user activities (via `clientId`). Indexes exist on `userId`, `timestamp`, and `action`.

### Activity Types

```ts
export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  VERIFY_EMAIL = 'VERIFY_EMAIL',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  UPDATE_TWENTY_CRM_CONFIG = 'UPDATE_TWENTY_CRM_CONFIG',
}
```

## Dashboard Queries

The `lib/db/queries/dashboard.queries.ts` module provides several aggregation functions for user dashboards.

### User Total Activity Count

Counts votes and comments made by a specific user:

```ts
export async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number> {
  const [votesResult] = await db
    .select({ count: count() })
    .from(votes)
    .where(eq(votes.userId, clientProfileId));

  const [commentsResult] = await db
    .select({ count: count() })
    .from(comments)
    .where(
      and(
        eq(comments.userId, clientProfileId),
        isNull(comments.deletedAt)
      )
    );

  return (
    Number(votesResult?.count ?? 0) +
    Number(commentsResult?.count ?? 0)
  );
}
```

### Unique Items Interacted With

Counts distinct items a user has voted on or commented on:

```ts
export async function getUniqueItemsInteractedCount(
  clientProfileId: string
): Promise<number> {
  const [votesResult] = await db
    .select({ count: countDistinct(votes.itemId) })
    .from(votes)
    .where(eq(votes.userId, clientProfileId));

  const [commentsResult] = await db
    .select({ count: countDistinct(comments.itemId) })
    .from(comments)
    .where(
      and(
        eq(comments.userId, clientProfileId),
        isNull(comments.deletedAt)
      )
    );

  return (
    Number(votesResult?.count ?? 0) +
    Number(commentsResult?.count ?? 0)
  );
}
```

### Engagement Received on User's Items

Count total votes and comments received on a set of items:

```ts
export async function getVotesReceivedCount(
  itemSlugs: string[]
): Promise<number>

export async function getCommentsReceivedCount(
  itemSlugs: string[]
): Promise<number>
```

### Weekly Engagement Data

Returns vote and comment counts per ISO week for charting:

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>> {
  // Get weekly votes using PostgreSQL to_char for ISO week
  const weeklyVotes = await db
    .select({
      week: sql`to_char(${votes.createdAt}, 'IYYY-IW')`,
      count: count(),
    })
    .from(votes)
    .where(
      and(
        inArray(votes.itemId, itemSlugs),
        gte(votes.createdAt, startDate)
      )
    )
    .groupBy(sql`to_char(${votes.createdAt}, 'IYYY-IW')`)
    .orderBy(sql`to_char(${votes.createdAt}, 'IYYY-IW')`);

  // Similarly for weekly comments ...
  // Merge into result array with week labels W1..W12
}
```

### Daily Activity Data

Returns per-day engagement data using day-of-week extraction:

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string; // "Sun", "Mon", etc.
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

This function uses `EXTRACT(DOW FROM date)` for locale-independent day-of-week grouping (0 = Sunday through 6 = Saturday).

### Top Performing Items

Returns items ranked by total engagement (votes plus comments):

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<
  Array<{ itemId: string; votes: number; comments: number }>
> {
  // Get vote and comment counts per item
  // Sort by (votes + comments) descending
  // Return top N items
}
```

## Admin Dashboard Statistics

The `AdminStatsRepository` aggregates data across the entire platform:

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

### Activity Statistics

```ts
export interface ActivityStats {
  totalViews: number;   // from PostHog or item_views
  totalVotes: number;   // from votes table
  totalComments: number; // from comments table (non-deleted)
}
```

### Fetching All Stats

The `getAllStats` method uses `Promise.allSettled` so partial failures do not block the entire dashboard:

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);
  // Fallback to zero values on rejection
}
```

## Activity Data Flow

1. **Authentication events** -- Logged to `activityLogs` with `ActivityType` enum values
2. **User engagement** -- Votes and comments are tracked in their respective tables
3. **Dashboard queries** -- Aggregate from `votes`, `comments`, and `item_views` tables
4. **Admin stats** -- `AdminStatsRepository.getAllStats()` combines all metrics
5. **Background processing** -- `AnalyticsBackgroundProcessor` periodically refreshes cached aggregations

## ISO Week Calculation

The weekly engagement query uses PostgreSQL `to_char(date, 'IYYY-IW')` format. The corresponding JavaScript helper ensures matching week strings:

```ts
function getISOWeekString(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const isoWeekYear = d.getFullYear();
  const week1 = new Date(isoWeekYear, 0, 4);
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${isoWeekYear}-${weekNum.toString().padStart(2, '0')}`;
}
```

## Related Documentation

- [Engagement Service](/template/services/engagement-services) -- Popularity scoring
- [Analytics Background](/template/services/analytics-background) -- Background processing
- [View Tracking Service](/template/services/view-tracking-service) -- View recording
- [Admin Analytics](/template/features/admin-analytics) -- Dashboard UI
