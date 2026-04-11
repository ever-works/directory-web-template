---
id: admin-management
title: 行政管理
sidebar_label: 行政管理
sidebar_position: 25
---

# 管理员管理

管理仪表板为站点操作员提供了全面的管理界面。它包括统计、分析、内容审核、用户管理和系统设置——组织成选项卡式布局，并内置辅助功能。

## 架构概述

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

## 仪表板页面

管理入口点很简单 - 0 呈现仪表板组件：

```tsx
// app/[locale]/admin/page.tsx
"use client";
import { AdminDashboard } from "@/components/admin";

export default function AdminPage() {
  return <AdminDashboard />;
}
```

## 仪表板组件

10 组件将内容组织到五个选项卡中：

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

### 选项卡结构

|选项卡|内容 |
|-----|---------|
| **概述** |统计概览卡、提交状态细分 |
| **分析** |活动趋势图、热门项目、近期活动源、地理分布 |
| **性能** |性能监控仪表板|
| **报告** |数据导出和报告生成工具|
| **工具** |快速访问管理功能卡|

### 辅助功能

仪表板包括全面的辅助功能支持：

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

### 错误隔离

每个仪表板部分都包含在自己的 0 中，因此一个小部件的故障不会导致整个仪表板崩溃：

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

### 拉动刷新

移动用户可以下拉刷新仪表板数据：

```tsx
<AdminPullToRefresh onRefresh={handleRefresh}>
  {/* Tab content */}
</AdminPullToRefresh>
```

## 管理统计挂钩

0 挂钩获取仪表板统计数据：

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

## 权限系统

管理路由受到基于角色的权限系统的保护。 0模块提供细粒度的访问控制：

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

权限字符串遵循 0 格式（例如11、2、33）。

## 管理子模块

每个管理部分都有自己的路由组和组件集：

### 用户管理 (4)
- 列出、搜索和过滤用户
- 查看用户详细信息和活动
- 分配角色和权限
- 暂停或删除帐户

### 内容审核（5、6、7）
- 审查待提交的内容
- 批准或拒绝项目
- 处理举报内容
- 适度评论

### 类别和标签管理（89）
- 完整的CRUD操作
- 通过排序顺序重新排序
- 软删除和硬删除支持

### 角色管理 (10)
- 创建和编辑角色
- 分配细化权限
- 查看角色分配

### 设置 (11)
- 站点配置
- 功能标志管理
- 集成设置

## 管理挂钩

该模板为每个管理域提供专用挂钩：

|钩|目的|
|------|---------|
| 12 |仪表板统计 |
| 13 |用户管理CRUD |
| 14 |项目管理增删改查 |
| 15 |品类管理CRUD |
| 16 |标签管理 CRUD |
| 17 |集合管理CRUD |
| 18 |评论审核 |
| 19 |报告处理|
| 20 |角色和权限管理 |
| 21 |通知管理 |
| 22 |特色项目管理 |
| 23 |赞助商广告管理|
| 24 |过滤器配置|
| 25 |公司管理|
| 26 |客户管理|

## 国际化

所有管理 UI 字符串均使用 28 命名空间通过 27 进行转换：

```tsx
const t = useTranslations('admin.DASHBOARD');

// Usage
t('TITLE')
t('TABS.OVERVIEW')
t('SECTIONS.DASHBOARD_STATISTICS')
t('ARIA_LABELS.DASHBOARD_SECTIONS')
```

## 文件参考

|文件|目的|
|------|---------|
| 0 |管理员入口页面|
| 1 |带侧边栏的管理布局 |
| 2 |主仪表板组件 |
| 3 |跳过链接、地标、标题 |
| 4 |范围错误边界 |
| 5 |响应式网格实用程序 |
| 6 |下拉刷新支持 |
| 7 |仪表板统计挂钩 |
| 8 |权限验证 |
