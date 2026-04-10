---
id: monitoring
title: 监控与分析
sidebar_label: 监控
sidebar_position: 6
---

# 监控与分析

Ever Works 模板集成了多个监控和分析工具，用于生产可观察性：**Sentry**（错误追踪）、**PostHog**（产品分析）和 **Google Analytics**（流量分析）。

## Sentry – 错误追踪

### 概览

Sentry 配置在三个文件中：

| 文件 | 用途 |
|------|------|
| `sentry.config.ts` | 客户端配置（浏览器）|
| `instrumentation.ts` | 服务端配置（Node.js 运行时）|
| `next.config.ts` | Sentry Webpack 插件，用于 source maps 上传 |

### 环境变量

```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
```

### 功能支持

| 功能 | 说明 |
|------|------|
| **错误追踪** | 自动追踪未处理的异常 |
| **Performance** | 事务和 Span 追踪 |
| **Source Maps** | 通过 `SENTRY_AUTH_TOKEN` 上传 |
| **Session Replay** | 错误重现的会话录制 |
| **Cron 监控** | 追踪调度任务执行情况 |

### 配置示例

```typescript
// sentry.config.ts (client)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,   // Adjust in production (e.g., 0.1)
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
```

### 验证 Sentry

```bash
# Test error capture
curl -X POST https://yourdomain.com/api/test-error

# Check Sentry dashboard
https://sentry.io/organizations/{ORG}/issues/
```

## PostHog – 产品分析

### 概览

PostHog 通过 `lib/analytics/` 目录中的自定义模块和 `components/analytics/` 中的提供商组件进行集成。

### 环境变量

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**自托管 PostHog：**

```bash
NEXT_PUBLIC_POSTHOG_HOST=https://posthog.yourdomain.com
```

### 追踪内容

| 事件 | 何时触发 |
|------|---------|
| `user_signed_up` | 新用户注册 |
| `user_logged_in` | 登录成功 |
| `subscription_created` | 创建新订阅 |
| `subscription_cancelled` | 取消订阅 |
| `content_synced` | 内容仓库同步完成 |
| `item_viewed` | 会员查看目录条目 |
| `item_favorited` | 收藏条目 |
| `comment_created` | 发表新评论 |
| `payment_completed` | 支付成功 |

### 功能标志

通过 PostHog 的功能标志控制功能发布：

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

function MyComponent() {
  const isEnabled = useFeatureFlag('new-feature');
  if (!isEnabled) return null;
  return <NewFeature />;
}
```

### 个人信息保护

PostHog 已配置为保护个人信息：

```typescript
// lib/analytics/posthog.ts
posthog.init(POSTHOG_KEY, {
  api_host: POSTHOG_HOST,
  capture_pageview: false,  // Manual control
  capture_pageleave: true,
  mask_all_text: false,
  disable_session_recording: false,
  sanitize_properties: (properties) => {
    // Remove PII fields before sending
    delete properties['$email'];
    delete properties['$phone'];
    return properties;
  }
});
```

## Google Analytics – 流量分析

### 环境变量

```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### 追踪内容

GA4 自动追踪：

- **页面浏览量** – 所有路由变更
- **参与度指标** – 滚动、点击和停留时间
- **用户属性** – 位置、设备和浏览器类型
- **转化事件** – 通过代码中的自定义事件配置

### 禁用追踪（隐私保护）

对不接受追踪的用户，遵守同意设置：

```typescript
// lib/analytics/google-analytics.ts
if (typeof window !== 'undefined' && window.gtag) {
  window.gtag('consent', 'update', {
    analytics_storage: userConsented ? 'granted' : 'denied',
  });
}
```

## 应用健康监控

### 健康检查端点

```bash
GET /api/health
```

响应示例：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Vercel 分析

在 Vercel 项目设置中启用内置速度分析：

1. 进入 **项目** → **分析**
2. 启用 **Web Analytics**
3. 启用 **Speed Insights**

### 告警和通知

在 Sentry 中配置告警：

1. 进入 **告警** → **创建告警规则**
2. 配置条件（例如：错误率 > 10/分钟）
3. 配置通知渠道（Email、Slack 等）

在 PostHog 中配置：

1. 进入 **通知** → **创建通知**
2. 配置指标（例如：活跃用户骤降）
3. 配置接收者

## 可观察性最佳实践

### 结构化日志

使用结构化日志方便日志聚合：

```typescript
// ✅ Good: structured log with context
console.log(JSON.stringify({
  level: 'info',
  message: 'Subscription created',
  userId: user.id,
  planId: plan.id,
  timestamp: new Date().toISOString(),
}));

// ❌ Avoid: unstructured log
console.log('User ' + user.id + ' subscribed to ' + plan.id);
```

### 关键生产指标

监控这些关键指标：

| 指标 | 告警阈值 | 原因 |
|------|---------|------|
| 错误率 | > 1% | 用户受到直接影响 |
| P95 响应时长 | > 3 秒 | 体验下降 |
| 数据库 P99 | > 1 秒 | 性能瓶颈 |
| Cron 任务失败 | 任何失败 | 数据一致性问题 |
| 内存使用率 | > 80% | 系统不稳定风险 |
