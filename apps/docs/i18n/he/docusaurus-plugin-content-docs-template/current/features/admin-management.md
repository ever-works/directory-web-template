---
id: admin-management
title: ניהול אדמין
sidebar_label: ניהול אדמין
sidebar_position: 25
---

# ניהול אדמין

לוח המחוונים לניהול מספק ממשק ניהול מקיף למפעילי האתר. הוא כולל נתונים סטטיסטיים, ניתוחים, ניהול תוכן, ניהול משתמשים והגדרות מערכת -- מאורגנת בפריסה עם כרטיסיות עם תכונות נגישות מובנות.

## סקירה כללית של אדריכלות

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

## דף לוח המחוונים

נקודת הכניסה למנהל המערכת פשוטה -- `app/[locale]/admin/page.tsx` מציגה את רכיב לוח המחוונים:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## רכיב לוח המחוונים

הרכיב `AdminDashboard` ב- `components/admin/admin-dashboard.tsx` מארגן תוכן לחמש כרטיסיות:

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

### מבנה כרטיסיות

| לשונית | תוכן |
|-----|--------|
| **סקירה כללית** | כרטיסי סקירה כללית של סטטיסטיקה, פירוט סטטוס הגשה |
| **אנליטיקה** | תרשים מגמות פעילות, פריטים מובילים, הזנת פעילות אחרונה, התפלגות גיאוגרפית |
| **ביצועים** | לוח מחוונים לניטור ביצועים |
| **דיווחים** | כלי ייצוא נתונים והפקת דוחות |
| **כלים** | כרטיסי תכונות ניהול בגישה מהירה |

### תכונות נגישות

לוח המחוונים כולל תמיכת נגישות מקיפה:

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

### בידוד שגיאות

כל קטע של לוח המחוונים עטוף ב- `AdminErrorBoundary` משלו, כך שכשל בווידג'ט אחד לא פוגע בלוח המחוונים כולו:

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

### משוך לרענון

משתמשים ניידים יכולים למשוך למטה כדי לרענן את נתוני לוח המחוונים:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## הוק לסטטיסטיקה של מנהל מערכת

הוו `hooks/use-admin-stats.ts` מביא נתונים סטטיסטיים של לוח המחוונים:

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

## מערכת הרשאות

מסלולי הניהול מוגנים על ידי מערכת הרשאות מבוססת תפקידים. מודול `lib/middleware/permission-check.ts` מספק בקרת גישה עדינה:

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

מחרוזות ההרשאה עוקבות אחר הפורמט `resource:action` (לדוגמה, `items:approve` , `users:assignRoles` , `analytics:export` ).

## תת-מודולי ניהול

לכל קטע ניהול יש קבוצת מסלול ורכיבים משלו:

### ניהול משתמשים ( `admin/users/` )
- רשום, חפש וסנן משתמשים
- הצג את פרטי המשתמש והפעילות
- הקצאת תפקידים והרשאות
- השעיה או מחיקה של חשבונות

### ניהול תוכן ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- בדוק הגשות ממתינות
- לאשר או לדחות פריטים
- טיפול בתוכן מדווח
- הערות מתונות

### ניהול קטגוריות ותגים ( `admin/categories/` , `admin/tags/` )
- פעולות CRUD מלאות
- סדר מחדש באמצעות סדר מיון
- תמיכה במחיקה רכה ובמחיקה קשה

### ניהול תפקידים ( `admin/roles/` )
- צור וערוך תפקידים
- הקצה הרשאות מפורטות
- הצג הקצאות תפקידים

### הגדרות ( `admin/settings/` )
- תצורת האתר
- ניהול דגל תכונות
- הגדרות אינטגרציה

## הוקס לניהול

התבנית מספקת ווים ייעודיים לכל תחום מנהל:

| הוק | מטרה |
|------|--------|
| `useAdminStats` | נתונים סטטיסטיים של לוח המחוונים |
| `useAdminUsers` | ניהול משתמשים CRUD |
| `useAdminItems` | ניהול פריטים CRUD |
| `useAdminCategories` | ניהול קטגוריות CRUD |
| `useAdminTags` | ניהול תגים CRUD |
| `useAdminCollections` | ניהול גבייה CRUD |
| `useAdminComments` | ניהול תגובות |
| `useAdminReports` | טיפול בדוחות |
| `useAdminRoles` | ניהול תפקידים והרשאות |
| `useAdminNotifications` | ניהול הודעות |
| `useAdminFeaturedItems` | ניהול פריטים מומלצים |
| `useAdminSponsorAds` | ניהול פרסומות חסות |
| `useAdminFilters` | תצורת מסנן |
| `useAdminCompanies` | הנהלת החברה |
| `useAdminClients` | ניהול לקוחות |

## בינלאומי

כל מחרוזות ממשק הניהול מתורגמות באמצעות `next-intl` באמצעות מרחב השמות `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## הפניה לקובץ

| קובץ | מטרה |
|------|--------|
| `app/[locale]/admin/page.tsx` | דף כניסה של מנהל מערכת |
| `app/[locale]/admin/layout.tsx` | פריסת ניהול עם סרגל צד |
| `components/admin/admin-dashboard.tsx` | רכיב לוח המחוונים הראשי |
| `components/admin/admin-accessibility.tsx` | דלג על קישורים, ציוני דרך, כותרות |
| `components/admin/admin-error-boundary.tsx` | גבול שגיאה בהיקף |
| `components/admin/admin-responsive.tsx` | כלי עזר לרשת רספונסיבית |
| `components/admin/admin-touch-interactions.tsx` | תמיכה במשיכה לרענון |
| `hooks/use-admin-stats.ts` | הוק לסטטיסטיקה של לוח המחוונים |
| `lib/middleware/permission-check.ts` | אימות הרשאה |
