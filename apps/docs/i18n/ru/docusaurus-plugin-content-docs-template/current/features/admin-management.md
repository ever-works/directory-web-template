---
id: admin-management
title: Административное управление
sidebar_label: Административное управление
sidebar_position: 25
---

# Административное управление

Панель администратора предоставляет операторам сайта комплексный интерфейс управления. Он включает в себя статистику, аналитику, модерацию контента, управление пользователями и системные настройки, организованные в виде вкладок со встроенными функциями специальных возможностей.

## Обзор архитектуры

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

## Страница информационной панели

Точка входа администратора проста: `app/[locale]/admin/page.tsx` отображает компонент информационной панели:

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## Компонент информационной панели

Компонент `AdminDashboard` в позиции `components/admin/admin-dashboard.tsx` организует контент на пять вкладок:

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

### Структура вкладок

| Вкладка | Содержание |
|-----|---------|
| **Обзор** | Карты обзора статистики, разбивка статуса отправки |
| **Аналитика** | Диаграмма тенденций активности, основные элементы, лента последних действий, географическое распределение |
| **Производительность** | Панель мониторинга производительности |
| **Отчеты** | Инструменты экспорта данных и создания отчетов |
| **Инструменты** | Карты функций администратора быстрого доступа |

### Специальные возможности

Панель управления включает в себя комплексную поддержку специальных возможностей:

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

### Изоляция ошибок

Каждый раздел информационной панели заключен в свой собственный `AdminErrorBoundary` , поэтому сбой в одном виджете не приводит к сбою всей информационной панели:

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

### Обновление по запросу

Мобильные пользователи могут потянуть вниз, чтобы обновить данные информационной панели:

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## Крючок статистики администратора

Хук `hooks/use-admin-stats.ts` извлекает статистику информационной панели:

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

## Система разрешений

Маршруты администратора защищены ролевой системой разрешений. Модуль `lib/middleware/permission-check.ts` обеспечивает детальный контроль доступа:

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

Строки разрешений имеют формат `resource:action` (например, `items:approve` , `users:assignRoles` , `analytics:export` ).

## Подмодули администратора

Каждый раздел администратора имеет свою группу маршрутов и набор компонентов:

### Управление пользователями ( `admin/users/` )
- Список, поиск и фильтрация пользователей
- Просмотр сведений о пользователе и активности
- Назначать роли и разрешения
- Приостановить или удалить учетные записи

### Модерация контента ( `admin/items/` , `admin/comments/` , `admin/reports/` )
- Просмотрите ожидающие отправки
- Утвердить или отклонить элементы
- Обрабатывать сообщаемый контент
- Модерировать комментарии

### Управление категориями и тегами ( `admin/categories/` , `admin/tags/` )
- Полные операции CRUD
- Изменение порядка через порядок сортировки
- Поддержка мягкого и жесткого удаления

### Управление ролями ( `admin/roles/` )
- Создание и редактирование ролей.
- Назначение детальных разрешений
- Просмотр назначений ролей

### Настройки ( `admin/settings/` )
- Конфигурация сайта
- Управление флагами функций
- Настройки интеграции

## Хуки администратора

Шаблон предоставляет специальные хуки для каждого домена администратора:

| Крюк | Цель |
|------|---------|
| `useAdminStats` | Статистика приборной панели |
| `useAdminUsers` | Управление пользователями CRUD |
| `useAdminItems` | Управление объектами CRUD |
| `useAdminCategories` | Категорийный менеджмент CRUD |
| `useAdminTags` | Управление тегами CRUD |
| `useAdminCollections` | Управление коллекцией CRUD |
| `useAdminComments` | Модерация комментариев |
| `useAdminReports` | Обработка отчетов |
| `useAdminRoles` | Управление ролями и разрешениями |
| `useAdminNotifications` | Управление уведомлениями |
| `useAdminFeaturedItems` | Управление избранными предметами |
| `useAdminSponsorAds` | Спонсорский рекламный менеджмент |
| `useAdminFilters` | Конфигурация фильтра |
| `useAdminCompanies` | Руководство компании |
| `useAdminClients` | Управление клиентами |

## Интернационализация

Все строки пользовательского интерфейса администратора переводятся через `next-intl` с использованием пространства имен `admin.DASHBOARD` :

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `app/[locale]/admin/page.tsx` | Страница входа администратора |
| `app/[locale]/admin/layout.tsx` | Макет администратора с боковой панелью |
| `components/admin/admin-dashboard.tsx` | Основной компонент информационной панели |
| `components/admin/admin-accessibility.tsx` | Пропустить ссылки, ориентиры, рубрики |
| `components/admin/admin-error-boundary.tsx` | Граница ограниченной ошибки |
| `components/admin/admin-responsive.tsx` | Адаптивные сетевые утилиты |
| `components/admin/admin-touch-interactions.tsx` | Поддержка обновления по запросу |
| `hooks/use-admin-stats.ts` | Крючок статистики приборной панели |
| `lib/middleware/permission-check.ts` | Проверка разрешения |
