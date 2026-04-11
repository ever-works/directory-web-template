---
id: admin-management
title: Gestion de l'administration
sidebar_label: Gestion de l'administration
sidebar_position: 25
---

# Gestion de l'administration

The admin dashboard provides a comprehensive management interface for site operators. It includes statistics, analytics, content moderation, user management, and system settings -- organized into a tabbed layout with accessibility features built in.

## Architecture Overview

```
app/[locale]/admin/
  page.tsx             -- Renders AdminDashboard
  layout.tsx           -- Admin layout with sidebar navigation
  categories/          -- Category management pages
  clients/             -- Client management
  collections/         -- Collection management
  comments/            -- Comment moderation
  companies/           -- Company management
  featured-items/      -- Featured items management
  items/               -- Item management
  reports/             -- Report handling
  roles/               -- Role & permission management
  settings/            -- System settings
  sponsorships/        -- Sponsorship management
  surveys/             -- Survey management
  tags/                -- Tag management
  users/               -- User management

components/admin/
  admin-dashboard.tsx              -- Main dashboard component
  admin-stats-overview.tsx         -- Stats cards
  admin-activity-chart.tsx         -- Activity trend charts
  admin-submission-status.tsx      -- Submission status visualization
  admin-recent-activity.tsx        -- Recent activity feed
  admin-top-items.tsx              -- Top items list
  admin-features-grid.tsx          -- Quick-access feature cards
  admin-performance-monitor.tsx    -- Performance monitoring
  admin-data-export.tsx            -- Data export tools
  admin-notifications.tsx          -- Notification center
  admin-error-boundary.tsx         -- Scoped error boundary
  admin-accessibility.tsx          -- Accessibility utilities
  admin-responsive.tsx             -- Responsive grid helpers
  admin-touch-interactions.tsx     -- Touch gesture support
  admin-welcome-section.tsx        -- Welcome header
```

## Dashboard Page

The admin entry point is simple -- `app/[locale]/admin/page.tsx` renders the dashboard component:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Dashboard Component

The `AdminDashboard` component at `components/admin/admin-dashboard.tsx` organizes content into five tabs:

```tsx
// components/admin/admin-dashboard.tsx
export function AdminDashboard() {
  const t = useTranslations('admin.DASHBOARD');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'performance' | 'reports' | 'tools'
  >('overview');

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminStats();

  // ...
}
```

### Tab Structure

| Tab | Content |
|-----|---------|
| **Overview** | Stats overview cards, submission status breakdown |
| **Analytics** | Activity trend chart, top items, recent activity feed, geographic distribution |
| **Performance** | Performance monitoring dashboard |
| **Reports** | Data export and report generation tools |
| **Tools** | Quick-access admin feature cards |

### Accessibility Features

The dashboard includes comprehensive accessibility support:

```tsx
{/* Skip navigation links */}
<AdminSkipLink href="#main-content">Skip to main content</AdminSkipLink>
<AdminSkipLink href="#dashboard-stats">Skip to statistics</AdminSkipLink>
<AdminSkipLink href="#dashboard-charts">Skip to charts</AdminSkipLink>

{/* Screen reader announcements */}
<AdminStatusAnnouncer
  message={srMessage}
  priority={isError ? 'assertive' : 'polite'}
/>

{/* ARIA landmarks and semantic structure */}
<AdminLandmark as="section" label="Dashboard Statistics" id="dashboard-stats">
  <AdminHeading level={2} visualLevel={3}>
    Dashboard Statistics
  </AdminHeading>
  <AdminErrorBoundary>
    <AdminStatsOverview stats={stats} />
  </AdminErrorBoundary>
</AdminLandmark>
```

### Error Isolation

Each dashboard section is wrapped in its own `AdminErrorBoundary`, so a failure in one widget does not crash the entire dashboard:

```tsx
<AdminResponsiveGrid cols={2} gap="lg">
  <AdminErrorBoundary>
    <AdminActivityChart data={stats?.activityTrendData || []} />
  </AdminErrorBoundary>
  <AdminErrorBoundary>
    <AdminTopItems data={stats?.topItemsData || []} />
  </AdminErrorBoundary>
</AdminResponsiveGrid>
```

### Pull-to-Refresh

Mobile users can pull down to refresh dashboard data:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Admin Stats Hook

The `hooks/use-admin-stats.ts` hook fetches dashboard statistics:

```tsx
// hooks/use-admin-stats.ts
export interface AdminStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalViews: number;
  totalVotes: number;
  totalComments: number;
  totalSubscribers: number;
  // Trend data arrays for charts
  userGrowthData: { month: string; users: number; active: number }[];
  activityTrendData: { day: string; views: number; votes: number }[];
  topItemsData: { name: string; views: number; votes: number }[];
  recentActivity: { type: string; description: string; timestamp: string }[];
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: async ({ signal }) => {
      const response = await fetch('/api/admin/dashboard/stats', {
        signal,
        credentials: 'include',
      });
      if (!response.ok) throw new HttpError(message, response.status);
      const result = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error instanceof HttpError && error.status < 500) return false;
      return failureCount < 3;
    },
  });
}
```

## Permission System

Admin routes are protected by a role-based permission system. The `lib/middleware/permission-check.ts` module provides fine-grained access control:

```tsx
// Permission check functions
hasPermission(userPerms, 'items:review')
hasAnyPermission(userPerms, ['users:read', 'users:create'])
hasAllPermissions(userPerms, ['roles:read', 'roles:update'])
canManageResource(userPerms, 'categories')
canManageUsers(userPerms)
canManageRoles(userPerms)
canViewAnalytics(userPerms)
isSuperAdmin(userPerms)
```

Permission strings follow the `resource:action` format (e.g., `items:approve`, `users:assignRoles`, `analytics:export`).

## Admin Sub-Modules

Each admin section has its own route group and component set:

### User Management (`admin/users/`)
- List, search, and filter users
- View user details and activity
- Assign roles and permissions
- Suspend or delete accounts

### Content Moderation (`admin/items/`, `admin/comments/`, `admin/reports/`)
- Review pending submissions
- Approve or reject items
- Handle reported content
- Moderate comments

### Category & Tag Management (`admin/categories/`, `admin/tags/`)
- Full CRUD operations
- Reorder via sort order
- Soft-delete and hard-delete support

### Role Management (`admin/roles/`)
- Create and edit roles
- Assign granular permissions
- View role assignments

### Settings (`admin/settings/`)
- Site configuration
- Feature flag management
- Integration settings

## Admin Hooks

The template provides dedicated hooks for each admin domain:

| Hook | Purpose |
|------|---------|
| `useAdminStats` | Dashboard statistics |
| `useAdminUsers` | User management CRUD |
| `useAdminItems` | Item management CRUD |
| `useAdminCategories` | Category management CRUD |
| `useAdminTags` | Tag management CRUD |
| `useAdminCollections` | Collection management CRUD |
| `useAdminComments` | Comment moderation |
| `useAdminReports` | Report handling |
| `useAdminRoles` | Role & permission management |
| `useAdminNotifications` | Notification management |
| `useAdminFeaturedItems` | Featured items management |
| `useAdminSponsorAds` | Sponsor advertisement management |
| `useAdminFilters` | Filter configuration |
| `useAdminCompanies` | Company management |
| `useAdminClients` | Client management |

## Internationalization

All admin UI strings are translated via `next-intl` using the `admin.DASHBOARD` namespace:

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## File Reference

| File | Purpose |
|------|---------|
| `app/[locale]/admin/page.tsx` | Admin entry page |
| `app/[locale]/admin/layout.tsx` | Admin layout with sidebar |
| `components/admin/admin-dashboard.tsx` | Main dashboard component |
| `components/admin/admin-accessibility.tsx` | Skip links, landmarks, headings |
| `components/admin/admin-error-boundary.tsx` | Scoped error boundary |
| `components/admin/admin-responsive.tsx` | Responsive grid utilities |
| `components/admin/admin-touch-interactions.tsx` | Pull-to-refresh support |
| `hooks/use-admin-stats.ts` | Dashboard statistics hook |
| `lib/middleware/permission-check.ts` | Permission verification |