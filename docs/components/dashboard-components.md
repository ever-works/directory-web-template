---
id: dashboard-components
title: Dashboard Components
sidebar_label: Dashboard Components
sidebar_position: 35
---

# Dashboard Components

The `components/dashboard/` directory provides a comprehensive analytics dashboard for authenticated users. It displays submission statistics, engagement metrics, activity timelines, geographic data, and billing management through a grid of specialized widget cards.

## Architecture Overview

```
components/dashboard/
  dashboard-content.tsx        # Main dashboard page orchestrator
  stats-card.tsx               # Reusable statistic card with trends
  activity-chart.tsx           # Weekly activity bar chart
  engagement-chart.tsx         # Engagement type breakdown chart
  engagement-overview.tsx      # Engagement summary cards
  engagement-distribution.tsx  # Engagement distribution visualization
  engagement-rate-chart.tsx    # Engagement rate over time
  submission-timeline.tsx      # Submission count over time
  submission-calendar.tsx      # GitHub-style contribution calendar
  status-breakdown.tsx         # Approved/pending/rejected pie chart
  top-items.tsx                # Top-performing items table
  period-comparison.tsx        # This period vs last period comparison
  category-performance.tsx     # Per-category engagement metrics
  approval-trend.tsx           # Approval rate trend line
  billing-section.tsx          # Subscription and payment management
  payment-method-card.tsx      # Individual payment method display
  add-payment-method-modal.tsx # Add new payment method form
  edit-payment-method-modal.tsx
  delete-payment-method-modal.tsx
  GeoStatsCard.tsx             # Geographic distribution statistics
  ItemsMapCard.tsx             # Map showing item locations
  styles.ts                    # Shared style constants
  index.ts                     # Barrel exports
```

## DashboardContent

The main orchestrator component. It accepts a `Session` object and composes all dashboard widgets into a responsive grid layout.

```ts
interface DashboardContentProps {
  session: Session | null;
}
```

Data is fetched via the `useDashboardStats()` hook (React Query), which calls `/api/dashboard/stats`. The component shows loading skeletons via each widget's `isLoading` prop until data arrives. A refresh button triggers `refetchStats()`.

### Layout Structure

The dashboard uses a responsive grid system:

1. **Stats row** (4 columns): Total Submissions, Total Views, Votes Received, Comments Received
2. **Period Comparison** (full width): Current vs previous period metrics
3. **Timeline + Status** (2 columns): Submission timeline chart and status breakdown pie
4. **Engagement Overview** (full width): Engagement metric summary cards
5. **Location cards** (2 columns, conditional): Items map and geographic stats (when location is enabled)
6. **Category + Approval** (2 columns): Category performance and approval trend
7. **Top Items + Engagement** (3 columns, 2:1 split): Top items table and engagement chart
8. **Submission Calendar** (full width): GitHub-style contribution heatmap
9. **Engagement Distribution** (full width): Distribution visualization
10. **Engagement Rate** (full width): Rate chart over time
11. **Activity Chart** (full width): Weekly activity bar chart

## StatsCard

A reusable card for displaying a single numeric metric with an icon, optional trend indicator, and loading state.

```ts
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;      // Percentage change
    isPositive: boolean; // Green if true, red if false
  };
  className?: string;
  isLoading?: boolean;
}
```

### Usage

```tsx
import { StatsCard } from "@/components/dashboard";
import { TrendingUp } from "lucide-react";

<StatsCard
  title="Total Views"
  value={12450}
  description="Views on your content"
  icon={TrendingUp}
  trend={{ value: 12.5, isPositive: true }}
/>
```

Numbers are automatically formatted with `toLocaleString()`. The loading state renders a pulse-animated skeleton with `aria-busy="true"`.

## Chart Components

All chart components follow a consistent pattern:

```ts
interface ChartComponentProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}
```

| Component | Visualization | Data Shape |
|---|---|---|
| `ActivityChart` | Bar chart | `{ day, count }[]` |
| `EngagementChart` | Donut/pie chart | `{ type, count }[]` |
| `SubmissionTimeline` | Line/area chart | `{ date, count }[]` |
| `EngagementRateChart` | Line chart | Computed from engagement overview + total submissions |
| `ApprovalTrend` | Line chart | `{ date, rate }[]` |
| `CategoryPerformance` | Horizontal bar | `{ category, views, votes }[]` |
| `EngagementDistribution` | Stacked bar | `{ range, count }[]` |
| `StatusBreakdown` | Pie chart | `{ status, count }[]` |
| `SubmissionCalendar` | Heatmap grid | `{ date, count }[]` |
| `PeriodComparison` | Comparison cards | `{ metric, current, previous }[]` |

## Billing Components

The billing section manages payment methods and subscription status:

- **BillingSection**: Container for subscription info and payment method list
- **PaymentMethodCard**: Displays card brand, last 4 digits, expiry, and default status
- **AddPaymentMethodModal**: Stripe Elements form for adding a new card
- **EditPaymentMethodModal**: Update default payment method
- **DeletePaymentMethodModal**: Confirmation dialog for removing a payment method

## Geographic Components

When location settings are enabled:

- **ItemsMapCard**: Interactive map showing all user's submitted items with location data
- **GeoStatsCard**: Statistics about geographic distribution (countries, cities, coverage)

## Configuration

The dashboard data comes from `/api/dashboard/stats`, which aggregates data from multiple database tables. The API endpoint requires authentication and returns only the current user's data.

Key environment variables that affect the dashboard:
- Location-related API keys enable or hide the geographic section
- Stripe keys enable or hide the billing section
- The `databaseSimulationMode` setting determines whether real or simulated data is used

## Accessibility

- `StatsCard` uses `<article>` with `aria-labelledby` pointing to the title and `aria-describedby` for the description.
- Loading states include `aria-busy="true"` and screen-reader-only text like "Loading Total Views statistic".
- Trend values include a `sr-only` description: "increased by 12.5% from last month".
- Icon containers use `aria-hidden="true"` since the title provides the semantic meaning.
- Chart components include descriptive headings and summary text for screen readers.

## Shared Styles

The `styles.ts` file exports reusable style constants to maintain visual consistency across all dashboard cards:

```ts
const CARD_BASE_STYLES = "bg-white dark:bg-gray-900 rounded-xl shadow-xs p-6 border ...";
const ICON_CONTAINER_STYLES = "p-2 bg-theme-primary-100 dark:bg-theme-primary-900/30 ...";
```

## Related Documentation

- [Admin Analytics](/template/features/admin-analytics) -- Admin-level analytics dashboard
- [View Tracking](/template/features/view-tracking) -- How views are recorded
- [Billing Components](/template/components/billing-components) -- Payment integration details
- [Maps Components](/template/components/maps-components) -- Map rendering
