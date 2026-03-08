---
id: admin-components
title: "Admin Components"
sidebar_label: "Admin Components"
sidebar_position: 10
---

# Admin Components

The admin dashboard is composed of modular React components organized in `components/admin/`. The system includes dashboard widgets, data visualization, accessibility helpers, responsive layouts, touch interaction support, error boundaries, loading skeletons, and empty states.

## Component Index

The barrel export at `components/admin/index.ts` exposes over 50 components grouped by concern:

| Category | Components |
|----------|------------|
| Dashboard | `AdminDashboard`, `AdminStatsOverview`, `AdminActivityChart`, `AdminSubmissionStatus`, `AdminRecentActivity`, `AdminTopItems`, `AdminCharts` |
| Features | `AdminFeatureCard`, `AdminFeaturesGrid`, `AdminWelcomeSection` |
| Tools | `AdminPerformanceMonitor`, `AdminDataExport` |
| Error Handling | `AdminErrorBoundary`, `AdminErrorFallback` |
| Loading | `AdminDashboardSkeleton`, `AdminGridSkeleton`, `AdminChartSkeleton`, `AdminActivityListSkeleton`, `AdminTableSkeleton`, `AdminPieChartSkeleton` |
| Empty States | `AdminEmptyState`, `AdminNoDataEmptyState`, `AdminNoActivityEmptyState`, `AdminNoSubmissionsEmptyState`, `AdminNoUsersEmptyState` |
| Accessibility | `AdminSkipLink`, `AdminLandmark`, `AdminHeading`, `AdminStatusAnnouncer`, `AdminFocusTrap`, `AdminAccessibleButton` |
| Responsive | `AdminResponsiveGrid`, `AdminResponsiveCard`, `AdminResponsiveTable`, `AdminResponsiveNav`, `AdminResponsiveText`, `AdminResponsiveSpacing`, `AdminResponsiveButtonGroup`, `AdminResponsiveDataDisplay`, `AdminResponsiveChart` |
| Touch | `AdminTouchButton`, `AdminSwipeableCard`, `AdminPullToRefresh`, `AdminTouchList`, `AdminTouchGrid`, `AdminTouchSearch` |

## AdminDashboard

The main dashboard component at `components/admin/admin-dashboard.tsx` is the entry point. It uses tabs for section navigation, fetches statistics via the `useAdminStats` hook, and wraps content with accessibility and error handling.

### Tab Navigation

The dashboard supports five tabs: overview, analytics, performance, reports, and tools:

```tsx
const [activeTab, setActiveTab] = useState<
  'overview' | 'analytics' | 'performance' | 'reports' | 'tools'
>('overview');
```

Tabs use WAI-ARIA roles:

```tsx
<div role="tablist" aria-label={t('ARIA_LABELS.DASHBOARD_SECTIONS')}>
  {tabs.map((tab) => (
    <button
      type="button"
      key={tab.key}
      role="tab"
      aria-selected={activeTab === tab.key}
      aria-controls={`section-${tab.key}`}
      onClick={() => setActiveTab(tab.key)}
      className={activeTab === tab.key
        ? 'bg-theme-primary text-white border-theme-primary'
        : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
      }
    >
      {tab.label}
    </button>
  ))}
</div>
```

### Data Fetching

Dashboard data comes from the `useAdminStats` hook (React Query):

```tsx
const {
  data: stats,
  isLoading,
  isError,
  error,
  refetch,
  isFetching,
} = useAdminStats();
```

A refresh button and pull-to-refresh gesture both trigger `refetch()`.

### Tab Content

Each tab renders different widget combinations:

- **Overview** -- `AdminStatsOverview` and `AdminSubmissionStatus`
- **Analytics** -- `AdminActivityChart`, `AdminTopItems`, `AdminRecentActivity`, `GeographicSection`
- **Performance** -- `AdminPerformanceMonitor`
- **Reports** -- `AdminDataExport`
- **Tools** -- `AdminFeaturesGrid`

## Accessibility Components

The accessibility module at `components/admin/admin-accessibility.ts` provides WAI-ARIA primitives:

### Skip Links

Allow keyboard users to bypass navigation:

```tsx
<AdminSkipLink href="#main-content">
  {t('SKIP_TO_MAIN_CONTENT')}
</AdminSkipLink>
<AdminSkipLink href="#dashboard-stats">
  {t('SKIP_TO_STATISTICS')}
</AdminSkipLink>
<AdminSkipLink href="#dashboard-charts">
  {t('SKIP_TO_CHARTS')}
</AdminSkipLink>
```

### Landmarks

Semantic regions with accessible labels:

```tsx
<AdminLandmark
  as="section"
  label={t('SECTIONS.DASHBOARD_STATISTICS')}
  id="dashboard-stats"
>
  <AdminHeading level={2} visualLevel={3}>
    {t('SECTIONS.DASHBOARD_STATISTICS')}
  </AdminHeading>
  <AdminStatsOverview stats={stats} isLoading={false} />
</AdminLandmark>
```

### Status Announcer

Live region for screen reader notifications driven by fetch state:

```tsx
const [srMessage, setSrMessage] = useState('');

useEffect(() => {
  if (isFetching) {
    setSrMessage(t('REFRESHING_DASHBOARD_DATA'));
  } else if (isError) {
    setSrMessage(t('ERROR_LOADING_DASHBOARD_DATA'));
  } else if (stats) {
    setSrMessage(t('DASHBOARD_DATA_LOADED_SUCCESSFULLY'));
  }
}, [isFetching, isError, stats]);

<AdminStatusAnnouncer
  message={srMessage}
  priority={isError ? 'assertive' : 'polite'}
/>
```

## Error Handling

### Error Boundary

Each dashboard section is wrapped in an `AdminErrorBoundary` to isolate failures:

```tsx
<AdminErrorBoundary>
  <AdminActivityChart data={stats?.activityTrendData || []} isLoading={false} />
</AdminErrorBoundary>
```

If a child component throws, `AdminErrorFallback` renders instead of crashing the entire dashboard.

### Error Alert

API errors display a dismissible alert with a retry button:

```tsx
{isError && (
  <AdminLandmark
    as="section"
    label={t('ARIA_LABELS.ERROR_NOTIFICATION')}
    role="alert"
    aria-live="assertive"
  >
    <p>{error instanceof Error ? error.message : t('FAILED_TO_LOAD')}</p>
    <AdminAccessibleButton
      variant="secondary"
      onClick={() => refetch()}
      disabled={isFetching}
      aria-label={t('RETRY_LOADING_DASHBOARD_DATA')}
    >
      {t('RETRY')}
    </AdminAccessibleButton>
  </AdminLandmark>
)}
```

## Responsive Layout

The responsive module provides grid and layout components that adapt to viewport size:

```tsx
<AdminResponsiveGrid cols={2} gap="lg">
  <AdminActivityChart data={chartData} isLoading={false} />
  <AdminTopItems data={topItemsData} isLoading={false} />
</AdminResponsiveGrid>
```

Additional responsive components include `AdminResponsiveCard`, `AdminResponsiveTable`, `AdminResponsiveNav`, and `AdminResponsiveButtonGroup` for consistent breakpoint behavior.

## Touch Interactions

### Pull to Refresh

The dashboard wraps its content in a pull-to-refresh handler for mobile:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

Additional touch components include `AdminSwipeableCard` for swipeable panels, `AdminTouchList` and `AdminTouchGrid` for touch-optimized list and grid layouts, and `AdminTouchSearch` for mobile search input.

## Loading States

Skeleton components provide placeholder UI during data fetches:

- `AdminDashboardSkeleton` -- full dashboard placeholder
- `AdminGridSkeleton` -- stat cards placeholder
- `AdminChartSkeleton` -- chart area placeholder
- `AdminActivityListSkeleton` -- activity feed placeholder
- `AdminTableSkeleton` -- data table placeholder
- `AdminPieChartSkeleton` -- pie chart placeholder

## Empty States

Context-specific empty states guide users when no data exists:

- `AdminNoDataEmptyState` -- generic no-data message
- `AdminNoActivityEmptyState` -- no recent activity
- `AdminNoSubmissionsEmptyState` -- no pending submissions
- `AdminNoUsersEmptyState` -- no users found

## AdminFeature Type

Feature cards on the tools tab follow this interface defined in `components/admin/types.ts`:

```ts
interface AdminFeature {
  icon: React.ComponentType;
  title: string;
  description: string;
  href: string;
  emoji: string;
}
```

## Internationalization

All admin components use `next-intl` for translated strings:

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage in JSX
<p>{t('LOADING_DASHBOARD_DATA')}</p>
<button>{t('REFRESH')}</button>
```

Translation keys are namespaced under `admin.DASHBOARD` with nested keys for tabs, sections, and aria labels.

## Related Files

| File | Description |
|------|-------------|
| `components/admin/admin-dashboard.tsx` | Main dashboard with tabs |
| `components/admin/index.ts` | Barrel exports |
| `components/admin/types.ts` | AdminFeature interface |
| `components/admin/admin-accessibility.ts` | Accessibility primitives |
| `components/admin/admin-responsive.tsx` | Responsive layout components |
| `components/admin/admin-touch-interactions.tsx` | Touch gesture handlers |
| `components/admin/admin-error-boundary.tsx` | Error boundary and fallback |
| `components/admin/admin-loading-skeleton.tsx` | Loading skeleton components |
| `components/admin/admin-empty-state.tsx` | Empty state components |
| `hooks/use-admin-stats.ts` | React Query hook for dashboard data |
