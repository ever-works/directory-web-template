---
id: admin-components
title: Admin Component Library
sidebar_label: Admin Components
sidebar_position: 10
---

# Admin Component Library

The admin interface is built from over 80 purpose-built components located in `components/admin/`. These components handle everything from dashboard visualization to form management, providing a consistent and accessible admin experience.

## Dashboard Components

These top-level components compose the main admin dashboard view:

### `AdminDashboard`

**File:** `components/admin/admin-dashboard.tsx`

The root dashboard component that orchestrates the entire admin home page. It manages tab state (overview, analytics, performance, reports, tools) and coordinates data fetching through the `useAdminStats` hook.

### `AdminStatsOverview`

**File:** `components/admin/admin-stats-overview.tsx`

Displays the top-level metric cards showing total items, users, submissions, and engagement. Each card includes a trend indicator comparing to the previous period.

### `AdminActivityChart`

**File:** `components/admin/admin-activity-chart.tsx`

A time-series chart showing daily activity over the past 7 days. Visualizes submissions, views, and engagement metrics with a responsive Recharts-based chart.

### `AdminCharts`

**File:** `components/admin/admin-charts.tsx`

Collection of chart components used across the admin analytics tab. Includes bar charts, area charts, and pie charts for various data visualizations.

### `AdminSubmissionStatus`

**File:** `components/admin/admin-submission-status.tsx`

Visual breakdown of item statuses (approved, pending, rejected) using color-coded progress indicators.

### `AdminRecentActivity`

**File:** `components/admin/admin-recent-activity.tsx`

Chronological feed of the latest platform events, including new submissions, user registrations, and content updates.

### `AdminTopItems`

**File:** `components/admin/admin-top-items.tsx`

Ranked list of the highest-engagement items with views, votes, and comment counts.

### `AdminNotifications` / `AdminNotificationStats`

**Files:** `components/admin/admin-notifications.tsx`, `components/admin/admin-notification-stats.tsx`

Real-time notification system with a stats overlay showing unread counts and recent alerts.

## Dashboard Utilities

### `AdminWelcomeGradient`

**File:** `components/admin/admin-welcome-section.tsx`

A branded welcome banner with gradient styling, displayed at the top of the dashboard for first-time admin users.

### `AdminPerformanceMonitor`

**File:** `components/admin/admin-performance-monitor.tsx`

System performance metrics panel showing response times, cache hit rates, and database query performance.

### `AdminDataExport`

**File:** `components/admin/admin-data-export.tsx`

Export functionality allowing admins to download platform data in CSV and JSON formats.

### `AdminFeaturesGrid` / `AdminFeatureCard`

**Files:** `components/admin/admin-features-grid.tsx`, `components/admin/admin-feature-card.tsx`

A card-based grid showcasing available admin features with descriptions and navigation links.

## Geographic Components

Located in `components/admin/dashboard/`:

| Component | Description |
|-----------|-------------|
| `GeographicSection` | Container for all geo-related dashboard widgets |
| `DistributionMap` | Interactive map showing item geographic distribution |
| `LocationStatsCard` | Statistics card for location-based metrics |
| `IndexManagement` | Search index management and rebuild controls |

## Skeleton & Loading States

Every major component has a corresponding skeleton for loading states:

| Component | Description |
|-----------|-------------|
| `AdminDashboardSkeleton` | Full dashboard placeholder while stats load |
| `AdminLoadingSkeleton` | Generic skeleton with configurable row counts |

## Error Handling

### `AdminErrorBoundary`

**File:** `components/admin/admin-error-boundary.tsx`

A React error boundary that catches and displays runtime errors within admin components. Prevents a single widget crash from taking down the entire dashboard. Displays a retry button for recoverable errors.

### `AdminEmptyState`

**File:** `components/admin/admin-empty-state.tsx`

Consistent empty-state display with icon, title, description, and optional action button. Used when a list or section has no data.

## Responsive & Accessibility

### `AdminResponsiveGrid`

**File:** `components/admin/admin-responsive.tsx`

A responsive grid layout that adapts column counts based on viewport width. Used throughout the dashboard for metric cards and feature grids.

### `AdminPullToRefresh`

**File:** `components/admin/admin-touch-interactions.tsx`

Mobile-optimized pull-to-refresh gesture support for dashboard data reloading.

### Accessibility Components

**File:** `components/admin/admin-accessibility.tsx`

| Component | Description |
|-----------|-------------|
| `AdminSkipLink` | Skip navigation link for keyboard users |
| `AdminLandmark` | ARIA landmark wrapper for screen readers |
| `AdminHeading` | Semantic heading with proper hierarchy |
| `AdminStatusAnnouncer` | Live region for screen reader announcements |
| `AdminAccessibleButton` | Button with enforced ARIA attributes |

## Shared Admin Components

Located in `components/admin/shared/`:

| Component | File | Description |
|-----------|------|-------------|
| `AdminSearchBar` | `admin-search-bar.tsx` | Debounced search input with clear button |
| `AdminFilterToolbar` | `admin-filter-toolbar.tsx` | Toolbar for combining multiple filters |
| `AdminFilterPopover` | `admin-filter-popover.tsx` | Popover-based filter selector |
| `AdminActiveFilters` | `admin-active-filters.tsx` | Displays active filter chips with remove buttons |
| `AdminStatusTabs` | `admin-status-tabs.tsx` | Tab bar for filtering by status |

## Domain-Specific Components

### Items (`components/admin/items/`)

- `ItemForm` / `MultiStepItemForm` -- Multi-step creation form with steps: basic info, classification, location, media/links, review
- `ItemFilters` / `ActiveItemFilters` -- Filtering by status, category, date range
- `ItemActionsMenu` -- Context menu for item operations
- `ItemHistoryModal` -- Revision history viewer
- `ItemRejectModal` -- Rejection with reason input
- `ItemCompanyManager` -- Associate items with companies
- `ItemListSorting` -- Column-based sorting controls
- `BulkActionBar` / `BulkConfirmDialog` -- Multi-select operations

### Clients (`components/admin/clients/`)

- `ClientForm` -- Multi-step form with steps: basic info, contact, profile, preferences
- `AdvancedSearchPanel` -- Complex query builder
- `SavedFilters` -- Persist and reuse filter configurations
- `ClientFiltersSkeleton` / `ClientTableSkeleton` -- Loading states

### Companies (`components/admin/companies/`)

- `CompaniesTable` -- Sortable data table
- `CompanyModal` -- Create/edit modal dialog
- `CompanyFilters` / `CompanySearch` -- Filtering and search
- `CompanySelector` -- Dropdown selector for linking companies
- `CompanyStats` -- Company-level statistics

### Settings (`components/admin/settings/`)

- `SettingsPage` -- Main settings layout
- `SettingInput`, `SettingSelect`, `SettingSwitch`, `SettingSlider` -- Form controls
- `SettingCurrencyInput` -- Currency-formatted input
- `SettingApiStatus` -- Integration connection status
- `MapPreview` -- Geographic map preview
- `CustomNavigationManager` -- Navigation link editor

### Roles & Permissions (`components/admin/permissions/`, `components/admin/roles/`)

- `RoleForm` -- Create and edit roles
- `RolePermissionsModal` -- Permission assignment interface
- `PermissionGroup` -- Grouped permission checkboxes
- `PermissionCheckbox` -- Individual permission toggle
- `DeleteRoleDialog` -- Confirmation for role deletion

### Sponsorships (`components/admin/sponsorships/`)

- `SponsorTable` -- Paginated sponsor ad listing
- `SponsorTableFilters` / `SponsorFilters` / `SponsorSearch` -- Filtering controls
- `SponsorStats` -- Overview statistics
- `RejectModal` -- Rejection with reason
- `PageHeader` / `LoadingSkeleton` -- Layout components

## Related Files

- `components/admin/index.ts` -- Barrel export for core admin components
- `components/admin/types.ts` -- Shared TypeScript types for admin components
- `hooks/use-admin-stats.ts` -- Data fetching hook for dashboard
