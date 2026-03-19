---
id: client-dashboard
title: Client Dashboard
sidebar_label: Client Dashboard
sidebar_position: 11
---

# Client Dashboard

The client dashboard provides authenticated users with a comprehensive view of their submissions, engagement metrics, and billing information. It is located at `app/[locale]/client/dashboard` and powered by the `ClientDashboardRepository` class.

## Architecture

```
Client Dashboard
  |
  +-- Dashboard Page (app/[locale]/client/dashboard)
  |     Fetches stats via API route
  |
  +-- Dashboard Content (components/dashboard/dashboard-content.tsx)
  |     Orchestrates all dashboard widgets
  |
  +-- ClientDashboardRepository (lib/repositories/client-dashboard.repository.ts)
        Aggregates data from Git-based items + database queries
```

The repository performs parallel queries for efficiency, combining Git-based item data with database-sourced engagement metrics (votes, comments, views) in a single `getStats()` call.

## Dashboard Statistics (`DashboardStats`)

The `getStats(userId)` method returns a comprehensive statistics object:

| Field | Type | Description |
|-------|------|-------------|
| `totalSubmissions` | number | Total items submitted by the user |
| `totalViews` | number | Combined view count across all items |
| `totalVotesReceived` | number | Total votes received on user's items |
| `totalCommentsReceived` | number | Total comments received |
| `recentActivity.newSubmissions` | number | Submissions in the last 7 days |
| `recentActivity.newViews` | number | Views in the last 7 days |
| `uniqueItemsInteracted` | number | Distinct items user interacted with |
| `totalActivity` | number | Total user activity count |
| `activityChartData` | array | 7-day daily activity (submissions, views, engagement) |
| `engagementChartData` | array | Breakdown by type (views, votes, comments, shares) |
| `submissionTimeline` | array | Monthly submissions over 6 months |
| `engagementOverview` | array | Weekly engagement (votes, comments) over 12 weeks |
| `statusBreakdown` | array | Items by status (approved, pending, rejected) |
| `topItems` | array | Top 5 items by engagement |
| `periodComparison` | object | This week vs last week comparison |
| `categoryPerformance` | array | Top 5 categories by average engagement |
| `approvalTrend` | array | 6-month approval rate trend |
| `submissionCalendar` | array | 90-day submission heatmap data |
| `engagementDistribution` | array | Top 10 items by engagement percentage |

## Dashboard Components

All components are in `components/dashboard/`:

### Stats Cards (`stats-card.tsx`)

Displays top-level metrics with trend indicators. Shows total submissions, views, votes received, and comments received with color-coded change percentages.

### Activity Chart (`activity-chart.tsx`)

A 7-day time-series chart showing daily submissions, views, and engagement using Recharts. Data is enriched with view counts from the item-view tracking system.

### Engagement Charts

| Component | File | Description |
|-----------|------|-------------|
| `EngagementChart` | `engagement-chart.tsx` | Pie/donut chart of engagement by type |
| `EngagementOverview` | `engagement-overview.tsx` | 12-week bar chart of votes and comments |
| `EngagementRateChart` | `engagement-rate-chart.tsx` | Engagement rate trend over time |
| `EngagementDistribution` | `engagement-distribution.tsx` | Top 10 items by engagement share |

### Submission Widgets

| Component | File | Description |
|-----------|------|-------------|
| `SubmissionTimeline` | `submission-timeline.tsx` | 6-month bar chart of monthly submissions |
| `SubmissionCalendar` | `submission-calendar.tsx` | GitHub-style 90-day heatmap |
| `StatusBreakdown` | `status-breakdown.tsx` | Approved/pending/rejected distribution |
| `ApprovalTrend` | `approval-trend.tsx` | Monthly approval rate line chart |

### Period Comparison (`period-comparison.tsx`)

Side-by-side comparison of this week versus last week for votes, comments, submissions, and views. Displays percentage change with up/down indicators.

### Category Performance (`category-performance.tsx`)

Horizontal bar chart of the top 5 categories ranked by average engagement per item. Items with multiple categories are counted in each applicable category.

### Top Items (`top-items.tsx`)

Ranked list of the user's highest-engagement items showing views, votes, and comments per item.

### Billing Section (`billing-section.tsx`)

Manages the user's billing information and payment methods:

| Component | File | Description |
|-----------|------|-------------|
| `BillingSection` | `billing-section.tsx` | Main billing container with subscription status |
| `PaymentMethodCard` | `payment-method-card.tsx` | Displays saved payment methods |
| `AddPaymentMethodModal` | `add-payment-method-modal.tsx` | Modal for adding new payment methods |
| `EditPaymentMethodModal` | `edit-payment-method-modal.tsx` | Modal for updating payment details |
| `DeletePaymentMethodModal` | `delete-payment-method-modal.tsx` | Confirmation dialog for payment method removal |

### Geographic Analytics

| Component | File | Description |
|-----------|------|-------------|
| `GeoStatsCard` | `GeoStatsCard.tsx` | Location-based statistics card |
| `ItemsMapCard` | `ItemsMapCard.tsx` | Map showing geographic distribution of user's items |

## Data Sources

The dashboard aggregates data from multiple sources:

1. **Git Repository** -- Item metadata (submissions, statuses, categories, dates) via `ItemRepository`
2. **Database -- Engagement** -- Votes and comments via `dashboard.queries.ts`
3. **Database -- Views** -- Page view tracking via `item-view.queries.ts`
4. **Database -- Profile** -- Client profile data via `client.queries.ts`

All database queries run in parallel using `Promise.all` for optimal performance.

## Styling

Dashboard styles are defined in `components/dashboard/styles.ts`, providing consistent theming across all chart and card components. Color constants include:

- Approved: `#10B981` (green)
- Pending: `#F59E0B` (amber)
- Rejected: `#EF4444` (red)
- Views: `#3B82F6` (blue)
- Votes: `#10B981` (green)
- Comments: `#F59E0B` (amber)
- Shares: `#8B5CF6` (purple)

## Related Files

- `components/dashboard/index.ts` -- Barrel export for all dashboard components
- `lib/repositories/client-dashboard.repository.ts` -- Data aggregation layer
- `lib/db/queries/dashboard.queries.ts` -- Engagement database queries
- `lib/db/queries/item-view.queries.ts` -- View tracking queries
- `lib/db/queries/client.queries.ts` -- Client profile queries
