---
id: admin-management
title: إدارة المشرف
sidebar_label: إدارة المشرف
sidebar_position: 25
---

#الإدارة الادارية

توفر لوحة تحكم المشرف واجهة إدارة شاملة لمشغلي الموقع. ويتضمن الإحصائيات والتحليلات والإشراف على المحتوى وإدارة المستخدم وإعدادات النظام - منظمة في تخطيط مبوب مع ميزات إمكانية الوصول المضمنة.

## نظرة عامة على الهندسة المعمارية

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

## صفحة لوحة التحكم

نقطة إدخال المسؤول بسيطة - `app/[locale]/admin/page.tsx` تعرض مكون لوحة المعلومات:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## مكون لوحة القيادة

يقوم المكون 0 في 1 بتنظيم المحتوى في خمس علامات تبويب:

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

### هيكل علامة التبويب

| علامة التبويب | المحتوى |
|-----|---------|
| **نظرة عامة** | بطاقات نظرة عامة على الإحصائيات، تفاصيل حالة الإرسال |
| **تحليلات** | مخطط اتجاه النشاط، أهم العناصر، موجز النشاط الأخير، التوزيع الجغرافي |
| **الأداء** | لوحة مراقبة الأداء |
| ** التقارير ** | أدوات تصدير البيانات وإنشاء التقارير |
| **الأدوات** | بطاقات ميزات المشرف الوصول السريع |

### ميزات إمكانية الوصول

تتضمن لوحة المعلومات دعمًا شاملاً لإمكانية الوصول:

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

### عزل الخطأ

يتم تغليف كل قسم من أقسام لوحة المعلومات بعلامة `AdminErrorBoundary` خاصة به، وبالتالي فإن الفشل في عنصر واجهة مستخدم واحد لا يؤدي إلى تعطل لوحة المعلومات بأكملها:

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

### السحب للتحديث

يمكن لمستخدمي الهاتف المحمول السحب للأسفل لتحديث بيانات لوحة المعلومات:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## ربط إحصائيات المسؤول

يجلب الخطاف `hooks/use-admin-stats.ts` إحصائيات لوحة المعلومات:

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

## نظام الأذونات

تتم حماية مسارات الإدارة بواسطة نظام أذونات قائم على الأدوار. توفر الوحدة `lib/middleware/permission-check.ts` تحكمًا دقيقًا في الوصول:

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

تتبع سلاسل الأذونات التنسيق `resource:action` (على سبيل المثال، `items:approve` ، 2���، 3).

## الوحدات الفرعية للإدارة

يحتوي كل قسم إداري على مجموعة مسارات خاصة به ومجموعة مكونات:

### إدارة المستخدم (4)
- قائمة المستخدمين، والبحث، وتصفية
- عرض تفاصيل المستخدم والنشاط
- تعيين الأدوار والأذونات
- تعليق أو حذف الحسابات

### الإشراف على المحتوى (5، 6، 7)
- مراجعة الطلبات المعلقة
- الموافقة على العناصر أو رفضها
- التعامل مع المحتوى المبلغ عنه
- تعليقات معتدلة

### إدارة الفئات والعلامات (8، 9)
- عمليات CRUD الكاملة
- إعادة الطلب عبر ترتيب الفرز
- دعم الحذف الناعم والحذف الصعب

### إدارة الأدوار (10)
- إنشاء وتحرير الأدوار
- تعيين أذونات محببة
- عرض مهام الدور

### الإعدادات ( `admin/settings/` )
- تكوين الموقع
- ميزة إدارة العلم
- إعدادات التكامل

## خطافات المشرف

يوفر القالب خطافات مخصصة لكل مجال إداري:

| هوك | الغرض |
|------|---------|
| ‹‹١٢› | إحصائيات لوحة التحكم |
| 13 ــ | إدارة المستخدم CRUD |
| 14 ــ | إدارة العناصر CRUD |
| `useAdminCategories` | إدارة الفئة CRUD |
| 16 ــ | إدارة العلامات CRUD |
| `useAdminCollections` | إدارة المجموعة CRUD |
| 18 ــ | الإشراف على التعليق |
| 19 ــ | معالجة التقرير |
| 20 ــ | إدارة الأدوار والأذونات |
| ‹٢١› | إدارة الإخطارات |
| ‹٢٢› | إدارة العناصر المميزة |
| ‹٢٣› | إدارة إعلانات الراعي |
| ‹٢٤› | تكوين الفلتر |
| 25 ــ | إدارة الشركة |
| ‹٢٦› | إدارة العملاء |

## التدويل

تتم ترجمة كافة سلاسل واجهة المستخدم الإدارية عبر 27 باستخدام مساحة الاسم 28:

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## مرجع الملف

| ملف | الغرض |
|------|---------|
| `app/[locale]/admin/page.tsx` | صفحة دخول المشرف |
| `app/[locale]/admin/layout.tsx` | تخطيط المشرف مع الشريط الجانبي |
| `components/admin/admin-dashboard.tsx` | مكون لوحة القيادة الرئيسية |
| `components/admin/admin-accessibility.tsx` | تخطي الروابط والمعالم والعناوين |
| 4ـ | حدود الخطأ ذات النطاق |
| 5 ــ | مرافق الشبكة المستجيبة |
| 6ـ | دعم السحب للتحديث |
| `hooks/use-admin-stats.ts` | ربط إحصائيات لوحة المعلومات |
| 8ـ | التحقق من الإذن |
