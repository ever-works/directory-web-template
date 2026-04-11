---
id: admin-management
title: Управление на администратора
sidebar_label: Управление на администратора
sidebar_position: 25
---

# Управление на администратора

Административното табло предоставя цялостен интерфейс за управление за операторите на сайта. Той включва статистика, анализи, модериране на съдържание, управление на потребителите и системни настройки - организирани в оформление с раздели с вградени функции за достъпност.

## Преглед на архитектурата

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

## Страница на таблото за управление

Входната точка на администратора е проста -- `app/[locale]/admin/page.tsx` изобразява компонента на таблото за управление:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Компонент на таблото

Компонентът `AdminDashboard` на `components/admin/admin-dashboard.tsx` организира съдържанието в пет раздела:

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

### Структура на раздела

| Раздел | Съдържание |
|-----|---------|
| **Общ преглед** | Карти за преглед на статистиката, разбивка на състоянието на изпращане |
| **Анализ** | Диаграма на тенденциите в активността, водещи елементи, емисия за скорошни дейности, географско разпределение |
| **Ефективност** | Табло за наблюдение на производителността |
| **Доклади** | Инструменти за експортиране на данни и генериране на отчети |
| **Инструменти** | Карти с функции за бърз достъп |

### Функции за достъпност

Таблото за управление включва цялостна поддръжка за достъпност:

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

### Изолиране на грешки

Всяка секция на таблото за управление е обвита в свой собствен `AdminErrorBoundary` , така че повреда в една джаджа не води до срив на цялото табло:

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

### Издърпайте за опресняване

Мобилните потребители могат да дръпнат надолу, за да обновят данните на таблото за управление:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Admin Stats Hook

Куката `hooks/use-admin-stats.ts` извлича статистика от таблото за управление:

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

## Система за разрешения

Администраторските маршрути са защитени от система за разрешения, базирана на роли. Модулът `lib/middleware/permission-check.ts` осигурява прецизен контрол на достъпа:

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

Низовете за разрешение следват формата `resource:action` (напр. `items:approve` , `users:assignRoles` , `analytics:export` ).

## Административни подмодули

Всеки администраторски раздел има своя собствена група маршрути и набор от компоненти:

### Управление на потребителите ( `admin/users/` )
- Списък, търсене и филтриране на потребители
- Преглед на потребителски данни и активност
- Присвояване на роли и разрешения
- Спиране или изтриване на акаунти

### Модериране на съдържанието ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Преглед на чакащи заявления
- Одобряване или отхвърляне на елементи
- Обработка на отчетено съдържание
- Модерирайте коментарите

### Управление на категории и етикети ( `admin/categories/` , `admin/tags/` )
- Пълни CRUD операции
- Пренареждане чрез ред на сортиране
- Поддръжка на меко и трудно изтриване

### Управление на роли ( `admin/roles/` )
- Създавайте и редактирайте роли
- Присвояване на подробни разрешения
- Преглед на назначенията на роли

### Настройки ( `admin/settings/` )
- Конфигурация на сайта
- Управление на флагове за функции
- Настройки за интегриране

## Административни кукички

Шаблонът предоставя специални кукички за всеки администраторски домейн:

| Кука | Цел |
|------|---------|
| `useAdminStats` | Статистика на таблото |
| `useAdminUsers` | Управление на потребители CRUD |
| `useAdminItems` | Управление на артикули CRUD |
| `useAdminCategories` | Управление на категории CRUD |
| `useAdminTags` | Управление на тагове CRUD |
| `useAdminCollections` | Управление на колекция CRUD |
| `useAdminComments` | Модериране на коментари |
| `useAdminReports` | Обработка на отчет |
| `useAdminRoles` | Управление на роли и разрешения |
| `useAdminNotifications` | Управление на известия |
| `useAdminFeaturedItems` | Управление на избрани елементи |
| `useAdminSponsorAds` | Управление на реклами на спонсори |
| `useAdminFilters` | Конфигурация на филтър |
| `useAdminCompanies` | Управление на фирма |
| `useAdminClients` | Управление на клиенти |

## Интернационализация

Всички низове на потребителския интерфейс на администратора се превеждат чрез `next-intl` с помощта на пространството от имена `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Референтен файл

| Файл | Цел |
|------|---------|
| `app/[locale]/admin/page.tsx` | Страница за въвеждане на администратор |
| `app/[locale]/admin/layout.tsx` | Оформление на администратора със странична лента |
| `components/admin/admin-dashboard.tsx` | Основен компонент на таблото |
| `components/admin/admin-accessibility.tsx` | Пропускане на връзки, забележителности, заглавия |
| `components/admin/admin-error-boundary.tsx` | Граница на грешка с обхват |
| `components/admin/admin-responsive.tsx` | Помощни програми за адаптивна мрежа |
| `components/admin/admin-touch-interactions.tsx` | Поддръжка на издърпване за опресняване |
| `hooks/use-admin-stats.ts` | Статистика на таблото |
| `lib/middleware/permission-check.ts` | Проверка на разрешение |
