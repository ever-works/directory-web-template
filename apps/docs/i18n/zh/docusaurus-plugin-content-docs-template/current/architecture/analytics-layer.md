---
id: analytics-layer
title: "分析集成层"
sidebar_label: "分析层"
sidebar_position: 28
---

# 分析集成层

分析模块 (`lib/analytics/index.ts`) 提供了一个统一的分析层，该层抽象了单个 `Analytics` 类背后的 PostHog 事件跟踪、Sentry 错误监控和功能标志评估。该模块使用单例模式来确保跨应用程序的单个初始化实例。

## 架构概述

分析层包含两个提供者：

- **PostHog** -- 事件跟踪、页面浏览量、用户识别、功能标志、会话记录和异常跟踪
- **Sentry** -- 错误监控和异常跟踪

两个提供程序都是可选的，并通过环境配置常量进行控制。当提供程序被禁用时，该模块会正常降级。

## 分析类

### 单例访问

```ts
import { analytics } from '@/lib/analytics';

// Pre-exported singleton instance
analytics.init();
analytics.track('button_clicked', { button: 'signup' });
```

`analytics` 导出是预初始化的单例。该类本身也被导出以供类型使用：

```ts
import { Analytics } from '@/lib/analytics';

const instance = Analytics.getInstance();
```

### 初始化

在任何跟踪调用之前，`init()` 方法必须在客户端调用一次：

```ts
analytics.init();
```

#### 初始化期间发生了什么

1. **SSR 防护** -- 如果 `window` 未定义，则跳过初始化
2. **PostHog 设置** -- 如果启用，则使用集中配置初始化 PostHog
3. **会话记录** -- 有条件地启用带有输入屏蔽的会话记录
4. **采样** -- 应用事件采样率（根据 `POSTHOG_SAMPLE_RATE` 随机选择退出用户）
5. **异常跟踪** -- 设置 PostHog 全局错误处理程序（如果已配置）
6. **Sentry 集成** -- 在启用 PostHog 和 Sentry 时链接两者

#### PostHog 配置

init 方法从集中常量构造 PostHog 配置：

```ts
const baseConfig: Partial<PostHogConfig> = {
  api_host: posthogHost,
  debug: POSTHOG_DEBUG.value === 'true',
  persistence: 'localStorage',
  capture_pageview: POSTHOG_AUTO_CAPTURE.value === 'true',
  capture_pageleave: true,
  enable_recording_console_log: POSTHOG_DEBUG.value === 'true',
  mask_all_element_attributes: false,
  mask_all_text: false,
  loaded: (posthog) => {
    if (POSTHOG_SAMPLE_RATE < 1) {
      if (Math.random() > POSTHOG_SAMPLE_RATE) {
        posthog.opt_out_capturing();
      }
    }
  },
};
```

启用会话记录后，会合并其他配置：

```ts
const config = POSTHOG_SESSION_RECORDING_ENABLED.value === 'true'
  ? {
      ...baseConfig,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-mask]',
        sampleRate: POSTHOG_SESSION_RECORDING_SAMPLE_RATE,
      },
    }
  : baseConfig;
```

## 异常跟踪提供商

该模块支持灵活的异常跟踪，具有四种提供程序模式：

|提供者|行为|
|----------|----------|
|`'posthog'`|仅发送至 PostHog 的异常|
|`'sentry'`|仅发送至 Sentry 的异常|
|`'both'`|发送到 PostHog 和 Sentry 的异常|
|`'none'`|异常跟踪已禁用|

提供程序是在构建时根据 `EXCEPTION_TRACKING_PROVIDER` 配置和每个提供程序的可用性自动确定的：

```ts
private determineExceptionTrackingProvider(): ExceptionTrackingProvider {
  const provider = EXCEPTION_TRACKING_PROVIDER.value;

  // Validate availability and fall back gracefully
  if (provider === 'sentry' && !SENTRY_ENABLED) {
    return POSTHOG_ENABLED ? 'posthog' : 'none';
  }

  if (provider === 'posthog' && !POSTHOG_ENABLED) {
    return SENTRY_ENABLED ? 'sentry' : 'none';
  }

  // For 'both', check what's actually available
  if (provider === 'both') {
    const sentryAvailable = SENTRY_ENABLED;
    const posthogAvailable = POSTHOG_ENABLED;
    if (!sentryAvailable && !posthogAvailable) return 'none';
    if (!sentryAvailable) return 'posthog';
    if (!posthogAvailable) return 'sentry';
  }

  return provider;
}
```

## API参考

### 用户识别

```ts
// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  plan: 'pro',
});

// Reset user identity (on logout)
analytics.reset();
```

`identify` 方法同时在 PostHog 和 Sentry 中设置用户。 `reset` 方法清除两者中的身份。

### 事件追踪

```ts
// Track a custom event
analytics.track('checkout_started', {
  plan: 'pro',
  source: 'pricing_page',
});

// Track a page view
analytics.trackPageView('/pricing', {
  referrer: document.referrer,
});
```

### 功能标志

```ts
// Check a feature flag
const showNewUI = analytics.isFeatureEnabled('new-dashboard', false);

// Reload feature flags (e.g., after plan change)
await analytics.reloadFeatureFlags();
```

当PostHog未初始化或未找到标志时，`isFeatureEnabled`方法返回`defaultValue`。

### 异常追踪

```ts
// Capture an exception
analytics.captureException(new Error('Something went wrong'), {
  component: 'PaymentForm',
  action: 'submit',
});

// Capture from a string
analytics.captureException('Unexpected response format', {
  endpoint: '/api/data',
});
```

`captureException` 方法路由到配置的提供者：

```ts
captureException(error: Error | string, context?: Record<string, any>) {
  const errorObject =
    typeof error === 'string' ? new Error(error) : error;

  // Send to PostHog
  if (POSTHOG_ENABLED && (provider === 'posthog' || provider === 'both')) {
    this.track('$exception', {
      $exception_message: errorObject.message,
      $exception_type: errorObject.name,
      $exception_stack_trace_raw: errorObject.stack,
      $exception_handled: true,
      ...context,
    });
  }

  // Send to Sentry
  if (SENTRY_ENABLED && (provider === 'sentry' || provider === 'both')) {
    Sentry.captureException(errorObject, {
      extra: context,
    });
  }
}
```

### 用户和超级属性

```ts
// Set persistent user properties
analytics.setUserProperties({
  plan: 'pro',
  company: 'Acme Inc',
});

// Set super properties (sent with every event)
analytics.setSuperProperties({
  app_version: '1.0.0',
  environment: 'production',
});
```

## PostHog 异常跟踪设置

当启用 PostHog 异常跟踪时，模块会安装全局错误处理程序：

```ts
private setupPostHogExceptionTracking() {
  // Override window.onerror
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    this.captureException(error || new Error(String(message)), {
      source,
      lineno,
      colno,
      type: 'window.onerror',
    });
    // Chain to original handler
    if (typeof originalOnError === 'function') {
      return originalOnError.call(window, message, source, lineno, colno, error);
    }
    return false;
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    this.captureException(
      new Error(event.reason?.message || String(event.reason)),
      { type: 'unhandledrejection' }
    );
  });
}
```

这会捕获同步错误 (`window.onerror`) 和未处理的承诺拒绝。

## Sentry-PostHog 集成

当两个提供程序都配置为 `'both'` 模式时，模块通过添加将错误转发到 PostHog 的 Sentry 事件处理器将它们链接在一起：

```ts
Sentry.addIntegration({
  name: 'PostHog',
  setupOnce() {
    Sentry.addEventProcessor((event) => {
      if (event.user) {
        posthog.capture('sentry_error', {
          error: event.message,
          error_id: event.event_id,
          error_type: event.type,
          error_context: event.contexts,
          error_tags: event.tags,
        });
      }
      return event;
    });
  },
});
```

这会导致 PostHog 中与用户会话相关的 Sentry 错误。

## 安全防护装置

每个公共方法都包含三项安全检查：

1. **初始化检查** -- `if (!this.initialized)` 阻止 `init()` 之前的调用
2. **提供程序检查** -- 当提供程序被禁用时`if (!POSTHOG_ENABLED)` 会跳过
3. **SSR 防护** -- `if (typeof window === 'undefined')` 阻止服务器端调用

这些防护措施确保分析模块永远不会陷入任何环境中。

## 配置常量

该模块从 `lib/constants.ts` 中定义的集中常量读取：

|常数|目的|
|----------|---------|
|`POSTHOG_KEY`|PostHog 项目 API 密钥|
|`POSTHOG_HOST`|PostHog API 主机 URL|
|`POSTHOG_ENABLED`|PostHog 的主开关|
|`POSTHOG_DEBUG`|启用调试日志记录|
|`POSTHOG_SESSION_RECORDING_ENABLED`|启用会话记录|
|`POSTHOG_AUTO_CAPTURE`|自动捕获页面浏览量|
|`POSTHOG_SAMPLE_RATE`|事件采样率（0-1）|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|录音采样率|
|`SENTRY_ENABLED`|Sentry 的主开关|
|`EXCEPTION_TRACKING_PROVIDER`|哪个提供商处理异常|
|`POSTHOG_EXCEPTION_TRACKING`|启用PostHog异常捕获|
|`SENTRY_EXCEPTION_TRACKING`|启用Sentry异常捕获|

## 源文件

|文件|目的|
|------|---------|
|`lib/analytics/index.ts`|分析单例类和提供者抽象|
|`lib/constants.ts`|所有分析提供商的配置常量|
