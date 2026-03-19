---
id: how-to-customize-admin-sections
title: "How to Customize Admin Dashboard Sections"
sidebar_label: "Customize Admin Sections"
sidebar_position: 76
---

# How to Customize Admin Dashboard Sections

This guide explains how to customize, extend, or add new sections to the admin dashboard. The admin dashboard is a modular, component-based interface with tabs for overview, analytics, performance, reports, and tools.

## Prerequisites

- Familiarity with React components and hooks
- Understanding of the template's component structure (`components/admin/`)
- Development server running (`pnpm dev`) with an admin user account

---

## Architecture Overview

The admin dashboard is composed of modular sections:

```
components/admin/
  admin-dashboard.tsx            <-- Main dashboard (tab navigation)
  admin-stats-overview.tsx       <-- Stats cards (users, items, revenue)
  admin-activity-chart.tsx       <-- Activity chart section
  admin-submission-status.tsx    <-- Submission pipeline status
  admin-recent-activity.tsx      <-- Recent activity feed
  admin-top-items.tsx            <-- Top-performing items
  admin-features-grid.tsx        <-- Quick-access feature grid
  admin-performance-monitor.tsx  <-- Performance metrics
  admin-data-export.tsx          <-- Data export tools
  admin-notifications.tsx        <-- Notification center
  admin-welcome-section.tsx      <-- Welcome banner
  dashboard/
    GeographicSection.tsx        <-- Geographic distribution map
  index.ts                       <-- Barrel exports
```

The main dashboard (`admin-dashboard.tsx`) renders sections based on the active tab:

```
Overview tab:    Welcome + Stats + Charts + Activity + Top Items
Analytics tab:   Activity Chart + Submission Status + Geographic
Performance tab: Performance Monitor
Reports tab:     Data Export
Tools tab:       Features Grid
```

---

## Adding a New Dashboard Card

### Step 1: Create the Component

```typescript
// components/admin/admin-custom-metrics.tsx

"use client";

import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomMetricsProps {
  conversionRate: number;
  avgSessionDuration: number;
  bounceRate: number;
}

export function AdminCustomMetrics({
  conversionRate,
  avgSessionDuration,
  bounceRate,
}: CustomMetricsProps) {
  const t = useTranslations("admin.DASHBOARD");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Custom Metrics
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground">Conversion</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{avgSessionDuration}s</p>
            <p className="text-xs text-muted-foreground">Avg Session</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{bounceRate}%</p>
            <p className="text-xs text-muted-foreground">Bounce Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 2: Export from the Barrel

```typescript
// components/admin/index.ts
export { AdminCustomMetrics } from "./admin-custom-metrics";
```

### Step 3: Add to the Dashboard

Open `admin-dashboard.tsx` and add your component in the appropriate tab section:

```typescript
import { AdminCustomMetrics } from "./admin-custom-metrics";

// Inside the overview tab rendering:
<AdminCustomMetrics
  conversionRate={stats?.conversionRate ?? 0}
  avgSessionDuration={stats?.avgSessionDuration ?? 0}
  bounceRate={stats?.bounceRate ?? 0}
/>
```

---

## Adding a New Admin Tab

### Step 1: Extend the Tab Type

In `admin-dashboard.tsx`, add your new tab to the state type:

```typescript
const [activeTab, setActiveTab] = useState<
  "overview" | "analytics" | "performance" | "reports" | "tools" | "moderation"
>("overview");
```

### Step 2: Add the Tab Button

Add a tab trigger in the tab navigation section:

```tsx
<button
  onClick={() => setActiveTab("moderation")}
  className={activeTab === "moderation" ? "tab-active" : "tab-inactive"}
>
  Moderation
</button>
```

### Step 3: Add the Tab Content

Add a conditional render block for the new tab:

```tsx
{activeTab === "moderation" && (
  <AdminLandmark label="Moderation Queue" role="region">
    <AdminHeading level={2} className="mb-6">
      Moderation Queue
    </AdminHeading>
    <AdminModerationQueue />
  </AdminLandmark>
)}
```

---

## Adding a New Admin Page

Admin pages live under `app/[locale]/admin/`:

```
app/[locale]/admin/
  page.tsx                <-- Dashboard
  layout.tsx              <-- Admin layout with sidebar
  items/page.tsx          <-- Items management
  users/page.tsx          <-- Users management
  your-section/page.tsx   <-- Your new page
```

### Step 1: Create the Page

```typescript
// app/[locale]/admin/moderation/page.tsx

import { ModerationDashboard } from "@/components/admin/moderation/moderation-dashboard";

export default function ModerationPage() {
  return <ModerationDashboard />;
}
```

### Step 2: Create the Component

```typescript
// components/admin/moderation/moderation-dashboard.tsx

"use client";

import { useTranslations } from "next-intl";

export function ModerationDashboard() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderation Queue</h1>
      {/* Your moderation UI here */}
    </div>
  );
}
```

### Step 3: Add Navigation Link

The admin sidebar is defined in `app/[locale]/admin/layout.tsx`. Add a navigation item for your new section:

```tsx
{
  label: "Moderation",
  href: "/admin/moderation",
  icon: Shield,
}
```

---

## Customizing Existing Sections

### Modifying Stats Cards

The `AdminStatsOverview` component renders the summary statistics cards. To change which stats are displayed:

1. Update the `useAdminStats` hook (`hooks/use-admin-stats.ts`) to fetch additional data
2. Modify `AdminStatsOverview` to render the new stats
3. Update the admin stats API endpoint (`app/api/admin/`) to return the new data

### Reordering Dashboard Sections

Sections are rendered sequentially in `admin-dashboard.tsx`. Simply reorder the JSX elements:

```tsx
{/* Reordered: show top items before activity chart */}
<AdminTopItems items={stats?.topItems} />
<AdminActivityChart data={stats?.activityData} />
```

### Hiding a Section

Wrap any section in a conditional:

```tsx
{showPerformanceMonitor && (
  <AdminPerformanceMonitor />
)}
```

Or remove it from the JSX entirely.

---

## Built-in Admin Components

The template provides reusable components for building admin sections:

| Component | Purpose |
|-----------|---------|
| `AdminErrorBoundary` | Catch and display errors in admin sections |
| `AdminEmptyState` | Show empty state with icon and message |
| `AdminLoadingSkeleton` | Consistent loading skeletons (grid, chart, table) |
| `AdminResponsiveGrid` | Responsive grid layout for cards |
| `AdminResponsiveTable` | Responsive table with mobile adaptation |
| `AdminAccessibleButton` | Button with proper ARIA attributes |
| `AdminLandmark` | Semantic landmark wrapper for screen readers |
| `AdminHeading` | Heading with consistent styling |
| `AdminPullToRefresh` | Pull-to-refresh wrapper for mobile |

---

## Accessibility Conventions

All admin sections should follow these accessibility patterns:

1. **Use `AdminLandmark`** to wrap major sections with ARIA roles
2. **Use `AdminHeading`** for section titles (proper heading hierarchy)
3. **Use `AdminSkipLink`** for keyboard navigation shortcuts
4. **Use `AdminStatusAnnouncer`** for screen reader announcements on data changes
5. **Support dark mode** with `dark:` Tailwind variants

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Admin page not protected | Admin pages are protected by the layout; ensure your page is under `app/[locale]/admin/` |
| Component not rendering | Check that you exported from `index.ts` and imported correctly in the dashboard |
| Stats not loading | Verify the `useAdminStats` hook fetches data from the correct API endpoint |
| Missing translations | Add translation keys to `messages/en.json` under the `admin.DASHBOARD` namespace |
| Layout shift on load | Use the skeleton components (`AdminGridSkeleton`, `AdminChartSkeleton`) for loading states |

---

## Related Pages

- [Admin Dashboard](/guides/admin-dashboard) -- overview of admin features
- [Admin Deep Dive](/guides/admin-deep-dive) -- advanced admin topics
- [Admin Components](/guides/admin-components) -- full component reference
- [How to Add a New Component](/guides/how-to-add-a-new-component) -- general component creation guide
- [Accessibility](/guides/accessibility) -- accessibility standards
