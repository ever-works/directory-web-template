---
id: admin-analytics
title: 管理分析
sidebar_label: 管理分析
sidebar_position: 32
---

# 管理分析

管理分析系统提供全平台统计数据、参与度指标、用户增长跟踪和后台数据处理。它结合了实时数据库查询、缓存聚合和可选的 PostHog 集成以进行全面分析。

## 架构概述

|模块|路径|目的|
|--------|------|---------|
|管理统计存储库 | 0 |核心仪表板统计 |
|仪表板查询 | 1 |参与度聚合查询 |
|参与度查询 | 2 |每个项目的指标 |
|分析后台处理器| 3 |后台作业调度程序|
|分析客户端 | 4 |客户端 PostHog/Sentry 集成 |
| PostHog API 服务 | 5 |服务器端 PostHog 查询 |
|分析导出 | 6 |数据导出功能|
|预定报告| 7 |自动生成报告 |

## 管理仪表板统计

8 使用 9 进行弹性数据加载，汇总了四类统计数据：

```ts
export interface AdminDashboardStats {
  users: UserStats;
  submissions: SubmissionStats;
  activity: ActivityStats;
  newsletter: NewsletterStats;
}
```

### 用户统计

```ts
export interface UserStats {
  totalUsers: number;
  registeredUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}
```

查询使用 UTC 标准化日期边界来确保结果一致，无论服务器时区如何：

```ts
async getUserStats(): Promise<UserStats> {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const weekStartUtc = new Date(todayUtc);
  // Monday-start week
  weekStartUtc.setUTCDate(
    todayUtc.getUTCDate() - ((todayUtc.getUTCDay() + 6) % 7)
  );
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  const [total, today, week, month] = await Promise.all([
    db.select({ count: count() }).from(users)
      .where(isNull(users.deletedAt)),
    db.select({ count: count() }).from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayUtc))),
    // ... week and month queries
  ]);
  // ...
}
```

### 提交统计

```ts
export interface SubmissionStats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}
```

由于项目位于基于 Git 的 CMS 中，因此从 0 方法获取。

### 活动统计

```ts
export interface ActivityStats {
  totalViews: number;
  totalVotes: number;
  totalComments: number;
}
```

配置后，视图源自 PostHog，回落到零：

```ts
const [totalVotesResult, totalCommentsResult, totalViews] =
  await Promise.all([
    db.select({ count: count() }).from(votes),
    db.select({ count: count() }).from(comments)
      .where(isNull(comments.deletedAt)),
    postHogApiService.isConfigured()
      ? postHogApiService.getTotalPageViews()
      : Promise.resolve(0),
  ]);
```

### 时事通讯统计

```ts
export interface NewsletterStats {
  totalSubscribers: number;
  recentSubscribers: number; // subscribed this week
}
```

## 后台分析处理

0 安排了六项重复性工作：

```ts
const JOB_INTERVALS = {
  USER_GROWTH: 10 * 60 * 1000,      // 10 minutes
  ACTIVITY_TRENDS: 5 * 60 * 1000,    // 5 minutes
  TOP_ITEMS: 15 * 60 * 1000,        // 15 minutes
  RECENT_ACTIVITY: 2 * 60 * 1000,   // 2 minutes
  PERFORMANCE_METRICS: 30 * 1000,    // 30 seconds
  CACHE_CLEANUP: 60 * 60 * 1000,    // 1 hour
};
```

|工作 |间隔|目的|
|-----|----------|---------|
|用户增长聚合| 10 分钟 |刷新用户增长趋势|
|活动趋势聚合| 5 分钟 |更新参与时间系列 |
|热门商品排行榜 | 15 分钟 |重新计算物品受欢迎度排名|
|近期活动更新 | 2 分钟 |刷新最新活动动态 |
|性能指标更新 | 30 秒 |更新实时性能数据 |
|缓存清理| 1小时|删除陈旧的缓存聚合 |

可以通过设置0 来禁用作业。

每个作业都会跟踪自己的状态：

```ts
interface JobStatus {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  lastRun: Date;
  nextRun: Date;
  duration: number;
  error?: string;
}
```

## 参与度指标

### 每项指标

0 函数并行获取所有指标：

```ts
export interface ItemEngagementMetrics {
  views: number;
  votes: number;       // Net votes (upvotes - downvotes)
  favorites: number;
  comments: number;
  avgRating: number;   // Average rating from comments (0-5)
}
```

执行四个并行查询：

1. 查看从0开始的计数
2. 净投票分数从 1 开始（赞成票 = +1，反对票 = -1）
3. 最喜欢的计数从2开始
4. 评论数和平均评分（不包括软删除）

### 人气评分

使用对数算法对项目进行评分：

```ts
// Approximate max scores at 1M interactions:
// Featured: 10,000 points (base boost)
// Views: ~6,000 points (weight: 1000)
// Votes: ~7,200 points (weight: 1200)
// Rating: 0-2,500 points (linear, 500 per star)
// Favorites: ~6,600 points (weight: 1100)
// Comments: ~6,000 points (weight: 1000)
// Recency: 0-1,750 points (decay over 180 days)
```

## 客户端分析

1中的0单例类管理客户端跟踪：

```ts
export class Analytics {
  init()                                    // Initialize PostHog
  identify(userId, properties?)             // Identify user
  track(eventName, properties?)             // Custom events
  trackPageView(url, properties?)           // Page views
  isFeatureEnabled(flagKey, defaultValue?)  // Feature flags
  captureException(error, context?)         // Error tracking
  setUserProperties(properties)             // User attributes
  setSuperProperties(properties)            // Global event properties
}
```

### 异常跟踪提供商

分析模块支持三种异常跟踪配置：

|供应商|描述 |
|----------|-------------|
| 0 |仅发送至 PostHog 的错误 |
| 1 |仅发送到 Sentry 的错误 |
| 2 |发送到 PostHog 和 Sentry 的错误 |

如果配置的提供程序不可用，则从 3 确定提供程序，并自动回退。

### PostHog 配置

```ts
const config = {
  api_host: POSTHOG_HOST,
  debug: POSTHOG_DEBUG,
  capture_pageview: POSTHOG_AUTO_CAPTURE,
  capture_pageleave: true,
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: "[data-mask]",
    sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
  },
};
```

采样率控制被跟踪的会话的百分比，通过环境变量配置。

## 仪表板数据查询

### 每周参与度趋势

```ts
export async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

使用 PostgreSQL 0 进行 ISO 周分组。

### 每日活动细目

```ts
export async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<
  Array<{
    date: string;
    submissions: number;
    views: number;
    engagement: number;
  }>
>
```

### 表现最佳的项目

```ts
export async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

项目按总参与度（投票加评论）排名。

## 弹性数据加载

0方法使用1来确保部分故障不会破坏仪表板：

```ts
async getAllStats(): Promise<AdminDashboardStats> {
  const [u, s, a, n] = await Promise.allSettled([
    this.getUserStats(),
    this.getSubmissionStats(),
    this.getActivityStats(),
    this.getNewsletterStats(),
  ]);

  // Each section falls back to zero values on rejection
  const users =
    u.status === 'fulfilled'
      ? u.value
      : {
          totalUsers: 0,
          registeredUsers: 0,
          newUsersToday: 0,
          newUsersThisWeek: 0,
          newUsersThisMonth: 0,
        };
  // ... similar for submissions, activity, newsletter
}
```

## 权限要求

分析功能由权限系统控制：

```ts
// Required permissions for analytics access
PERMISSIONS.analytics.read   // 'analytics:read'
PERMISSIONS.analytics.export // 'analytics:export'
```

基于计划的功能访问：

|特色 |免费|标准|高级|
|---------|------|----------|---------|
|查看统计数据 |没有 |是的 |是的 |
|高级分析 |没有 |没有 |是的 |

## 相关文档

- [Analytics Background](/docs/template/services/analytics-background) -- 后台处理详细信息
- [PostHog 服务](/docs/template/services/posthog-service) -- PostHog 服务器端 API
- [导出服务](/docs/template/services/export-service) -- 数据导出
- [活动服务](/docs/template/services/activity-service) -- 用户活动跟踪
- [参与服务](/docs/template/services/engagement-services) -- 人气评分
