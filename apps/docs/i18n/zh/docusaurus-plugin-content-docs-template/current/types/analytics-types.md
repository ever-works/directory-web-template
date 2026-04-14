---
id: analytics-types
title: 分析类型定义
sidebar_label: 分析类型
sidebar_position: 16
---

# 分析类型定义

**来源：** `lib/config/schemas/analytics.schema.ts`、`lib/constants/analytics.ts`、`lib/db/schema.ts`

分析类型配置跟踪提供商并定义参与度指标、页面视图和仪表板统计数据的数据结构。

## 提供者配置类型

### `AnalyticsConfig`

顶级分析配置，从 Zod 架构推断。

```typescript
interface AnalyticsConfig {
  exceptionTrackingProvider: 'posthog' | 'sentry' | 'none';
  analyze: boolean;
  posthog: PostHogConfig;
  sentry: SentryConfig;
  recaptcha: RecaptchaConfig;
  vercel: VercelAnalyticsConfig;
}
```

### PostHog 配置

```typescript
interface PostHogConfig {
  enabled: boolean;                   // Auto-detected from key presence
  key?: string;                        // NEXT_PUBLIC_POSTHOG_KEY
  host: string;                        // Default: 'https://us.i.posthog.com'
  debug: boolean;
  sessionRecordingEnabled: boolean;    // Default: true
  autoCapture: boolean;                // Default: false
  exceptionTracking: boolean;          // Default: true
  personalApiKey?: string;             // Server-side API key for admin
  projectId?: string;                  // PostHog project identifier
}
```

|领域|默认|描述|
|-------|---------|-------------|
|`host`|`https://us.i.posthog.com`|PostHog 摄取端点|
|`sessionRecordingEnabled`|`true`|捕获会话重播|
|`autoCapture`|`false`|自动跟踪点击次数、页面浏览量等。|
|`exceptionTracking`|`true`|将 JS 异常转发到 PostHog|

### 哨兵配置

```typescript
interface SentryConfig {
  enabled: boolean;           // Auto-detected from DSN presence
  dsn?: string;
  org?: string;
  project?: string;
  authToken?: string;
  enableDev: boolean;         // Default: false
  debug: boolean;             // Default: false
  exceptionTracking: boolean; // Default: true
}
```

### 验证码配置

```typescript
interface RecaptchaConfig {
  enabled: boolean;     // Auto-detected from key pair
  siteKey?: string;
  secretKey?: string;
}
```

### Vercel 分析配置

```typescript
interface VercelAnalyticsConfig {
  speedInsightsEnabled: boolean;         // Default: false
  speedInsightsSampleRate: number;       // 0-1, default: 0.5
}
```

## 观看者跟踪常数

定义于`lib/constants/analytics.ts`：

```typescript
const VIEWER_COOKIE_NAME = 'ever_viewer_id';
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days
```

这些常量为匿名观看计数系统提供动力。每个访问者都会收到一个持久 cookie，用于消除每日浏览次数的重复数据，而无需进行身份验证。

## 数据库架构：参与

`lib/db/schema.ts` 中的 `engagement` 表跟踪项目级分析：

```typescript
// Key columns from the engagement table
{
  id: serial,
  itemId: text,             // Item slug or ID
  viewCount: integer,       // Total page views
  uniqueViewCount: integer, // Unique daily viewers
  clickCount: integer,      // Outbound link clicks
  shareCount: integer,      // Social share actions
  lastViewedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
}
```

## 数据库架构：活动日志

`activityLogs` 表记录用户和管理员操作：

```typescript
{
  id: serial,
  userId: text,        // FK -> users.id (admin actions)
  clientId: text,      // FK -> clientProfiles.id (client actions)
  action: text,        // Action identifier string
  timestamp: timestamp,
  ipAddress: varchar(45),
}
```

## 异常跟踪提供商选择

`exceptionTrackingProvider` 字段确定哪个服务接收未处理的异常：

|价值|行为|
|-------|-----------|
|`posthog`|发送到 PostHog 的异常（默认）|
|`sentry`|发送到 Sentry 的异常|
|`none`|无异常转发|

## 使用示例

```typescript
import { analyticsConfig } from '@/lib/config/config-service';

// Check if PostHog is configured
if (analyticsConfig.posthog.enabled) {
  // Initialise PostHog client
}

// Check exception tracking provider
if (analyticsConfig.exceptionTrackingProvider === 'sentry') {
  // Initialise Sentry
}
```

## 相关类型

- [配置类型](./config-types.md) -- `AppConfigSchema` 包含 `AnalyticsConfig`
- [配置/分析](../configuration/analytics-config.md) -- 环境变量参考
