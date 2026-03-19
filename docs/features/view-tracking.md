---
id: view-tracking
title: "View Tracking and Engagement"
sidebar_label: "View Tracking"
sidebar_position: 35
---

# View Tracking and Engagement

The template includes a privacy-conscious view tracking system that records unique daily views per item. It powers view counts on item pages, dashboard analytics, trending-item rankings, and popularity scoring.

## Architecture Overview

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Processing Pipeline

When a user visits an item detail page, the `ItemViewTracker` component fires a POST request. The server processes it through a multi-stage pipeline:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Response Format

```json
{ "success": true, "counted": true }
```

| Response | Meaning |
|----------|---------|
| `counted: true` | A new view was recorded |
| `counted: false` | Duplicate for today (same viewer + item + date) |
| `counted: false, reason: "bot"` | Bot user-agent detected |
| `counted: false, reason: "owner"` | Authenticated user viewing their own item |

## Client-Side Tracker

The `ItemViewTracker` is a client component that fires a single POST request on mount:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

The tracker uses a best-effort approach: failures are silently ignored so view tracking never disrupts the user experience.

## Bot Detection

The `lib/utils/bot-detection.ts` module maintains a list of known bot user-agent patterns including search engine crawlers, monitoring tools, and automated clients. When a bot is detected, the endpoint returns a successful response with `counted: false` without touching the database.

## Viewer Identification

Views are attributed to a viewer ID stored in a first-party HTTP-only cookie:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Privacy Properties

- **No personal data** -- the cookie contains only a random UUID, not the user's identity.
- **HTTP-only** -- JavaScript cannot read the cookie, preventing XSS-based tracking exfiltration.
- **Same-site lax** -- the cookie is not sent on cross-origin requests.
- **Secure flag** -- enforced in production to require HTTPS.
- **No third-party services** -- all tracking data stays in your database.

## Daily Deduplication

The core recording logic uses PostgreSQL's `ON CONFLICT DO NOTHING`:

```ts
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });
  return result.length > 0;
}
```

The `itemViews` table has a unique constraint on `(itemId, viewerId, viewedDateUtc)`. The first view of the day for a viewer-item pair inserts a row and returns `true`. Subsequent views the same day are silently skipped. The date is computed as UTC `YYYY-MM-DD` for consistent deduplication regardless of timezone.

## Owner Exclusion

When an authenticated user views their own item, the view is not counted:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

This prevents item owners from artificially boosting their view counts.

## Aggregation Queries

The `item-view.queries.ts` file exports several functions for analytics:

| Function | Return Type | Description |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | All-time total views across item slugs |
| `getRecentViewsCount(slugs, days)` | `number` | Views within a sliding window (default 7 days) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Date-keyed map for sparkline charts |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Per-item total views for rankings |

## Analytics Integration

### Popularity Scoring

View counts feed into the logarithmic popularity scoring algorithm used by the shared card system:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

This ensures items with many views rank higher in "Popular" sort mode while preventing runaway scores from viral items.

### Client Dashboard

The client dashboard at `/client/dashboard` displays:
- Total views across all submitted items
- Views in the last 7 days with trend indicators
- A daily views chart via `getDailyViewsData`

### Admin Dashboard

The admin dashboard uses `GET /api/admin/dashboard/stats` for site-wide view metrics. The geo-analytics endpoint provides geographic distribution of views.

## Error Handling

View tracking errors are handled silently in production:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

Development mode logs errors for debugging. Production suppresses console output to avoid noise.

## Configuration

View tracking operates automatically with no required environment variables. The system gracefully degrades:

- **No database** -- the endpoint returns 503 and the client ignores the failure.
- **Database simulation mode** -- when enabled, views are tracked against simulated data.
- **Feature flags** -- view counts are displayed conditionally based on template settings.

## Accessibility

- The `ItemViewTracker` renders no DOM elements, ensuring zero impact on page layout and screen readers.
- View counts displayed in cards use `aria-label` attributes for screen reader context.
- Dashboard view charts include descriptive headings and summary text.

## Related Documentation

- [Dashboard Components](/docs/template/components/dashboard-components) -- View stats display
- [Shared Card Components](/docs/template/components/shared-card-components) -- Popularity scoring
- [Admin Analytics](/docs/template/features/admin-analytics) -- Site-wide view metrics
- [Voting & Comments](/docs/template/features/voting-comments) -- Other engagement features
