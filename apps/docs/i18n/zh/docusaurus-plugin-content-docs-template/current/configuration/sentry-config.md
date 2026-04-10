---
id: sentry-config
title: Sentry 错误追踪配置
sidebar_label: Sentry 配置
sidebar_position: 10
---

# Sentry 错误追踪配置

本页面记录了模板中 Sentry 的集成配置，用于错误追踪、性能监控和会话回放。配置分散在三个文件中：`sentry.config.ts`（webpack 插件）、`instrumentation.ts`（服务器端初始化）和 `instrumentation-client.ts`（客户端初始化）。

## 概述

模板使用 `@sentry/nextjs` SDK 在服务器端和客户端捕获错误和性能数据。Sentry 完全是可选的——如果没有配置 DSN，所有 Sentry 初始化都会被跳过。

## Webpack 插件配置

项目根目录中的 `sentry.config.ts` 文件配置了构建过程中使用的 Sentry webpack 插件：

```ts
export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
};
```

### 插件选项

| 选项 | 默认值 | 描述 |
|------|---------|------|
| `silent` | `true` | 在构建期间禁止 webpack 插件控制台输出 |
| `org` | `SENTRY_ORG` 环境变量 | 您的 Sentry 组织 slug |
| `project` | `SENTRY_PROJECT` 环境变量 | 您的 Sentry 项目 slug |
| `widenClientFileUpload` | `true` | 上传更广泛的客户端源文件以获得更好的堆栈跟踪 |
| `transpileClientSDK` | `true` | 转译 Sentry SDK 以获得更广泛的浏览器兼容性 |
| `tunnelRoute` | `"/monitoring"` | 通过您的应用代理 Sentry 请求以避免广告拦截器 |
| `hideSourceMaps` | `true` | 防止 source map 在生产环境中公开访问 |
| `disableLogger` | `true` | 禁用 Sentry 日志记录器以减少 bundle 大小 |

### 与 Next.js 配置的集成

插件选项在 `next.config.ts` 中使用：

```ts
import { withSentryConfig } from "@sentry/nextjs";
import { sentryWebpackPluginOptions } from "./sentry.config";

// ...
const finalConfig = withSentryConfig(
  configWithIntl,
  sentryWebpackPluginOptions
) as NextConfig;
```

## 环境变量

Sentry 依赖这些环境变量，在 `lib/constants.ts` 中定义：

```ts
export const SENTRY_DSN = getNextPublicEnv("NEXT_PUBLIC_SENTRY_DSN");
export const SENTRY_ENABLE_DEV = getNextPublicEnv("SENTRY_ENABLE_DEV");
export const SENTRY_DEBUG = getNextPublicEnv("SENTRY_DEBUG");
export const SENTRY_ENABLED =
  SENTRY_DSN?.value &&
  (SENTRY_ENABLE_DEV?.value === "true" || clientEnv.isProduction);
```

| 变量 | 是否必需 | 描述 |
|------|----------|------|
| `NEXT_PUBLIC_SENTRY_DSN` | 否 | Sentry DSN（数据源名称）。如果未设置，Sentry 将被禁用。 |
| `SENTRY_ORG` | 否 | 用于 source map 上传的 Sentry 组织 slug |
| `SENTRY_PROJECT` | 否 | 用于 source map 上传的 Sentry 项目 slug |
| `SENTRY_AUTH_TOKEN` | 否 | 构建期间用于上传 source map 的身份验证令牌 |
| `SENTRY_ENABLE_DEV` | 否 | 设置为 `"true"` 以在开发模式下启用 Sentry |
| `SENTRY_DEBUG` | 否 | 设置为 `"true"` 以启用 Sentry SDK 调试日志记录 |

## 服务器端初始化

服务器端 Sentry 在 `instrumentation.ts` 中初始化，该文件在 Next.js 服务器启动时运行一次：

```ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN, SENTRY_DEBUG } from "@/lib/constants";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Only initialize Sentry if DSN is configured
  if (SENTRY_DSN.value) {
    Sentry.init({
      dsn: SENTRY_DSN.value,
      tracesSampleRate:
        process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      debug: SENTRY_DEBUG.value === "true",
    });
  }

  // Database initialization follows...
}

// Capture errors from React Server Components
export const onRequestError = Sentry.captureRequestError;
```

### 服务器采样率

- **生产环境：** 10% 追踪采样（`0.1`），平衡成本和可见性
- **开发环境：** 100% 追踪采样（`1.0`），完整调试可见性

### 错误报告

数据库初始化失败会以上下文标签的形式报告给 Sentry：

```ts
if (SENTRY_DSN.value) {
  Sentry.captureException(error, {
    tags: {
      component: "instrumentation",
      phase: "database_init",
      environment:
        process.env.VERCEL_ENV ||
        process.env.NODE_ENV ||
        "unknown",
    },
  });
}
```

## 客户端初始化

客户端 Sentry 在 `instrumentation-client.ts` 中初始化：

```ts
import * as Sentry from "@sentry/nextjs";
import { Replay } from "@sentry/replay";
import {
  SENTRY_DSN,
  SENTRY_DEBUG,
  SENTRY_ENABLED,
} from "@/lib/constants";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || !SENTRY_ENABLED)
    return;

  Sentry.init({
    dsn: SENTRY_DSN.value,
    tracesSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: SENTRY_DEBUG.value === "true",

    // Session Replay
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate:
      process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

// Router transition instrumentation
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
```

### 客户端功能

**会话回放**配置了以隐私为中心的默认设置：

- `maskAllText: true` -- 回放中所有文本内容都被遮蔽
- `blockAllMedia: true` -- 回放中所有媒体元素都被阻止
- 错误回放捕获率为 100%（`replaysOnErrorSampleRate: 1.0`）
- 一般会话回放在生产环境中捕获率为 10%

**路由过渡**通过 `onRouterTransitionStart` 进行监控，以追踪页面导航性能。

## 隧道路由

`tunnelRoute: "/monitoring"` 选项通过您的应用在 `/monitoring` 端点代理 Sentry 事件提交。这有助于绕过可能阻止向 Sentry 服务器直接发送请求的广告拦截器和内容安全策略。

## 采样率摘要

| 指标 | 开发环境 | 生产环境 |
|------|---------|---------|
| 追踪采样率（服务器） | 100% | 10% |
| 追踪采样率（客户端） | 100% | 10% |
| 错误回放率 | 100% | 100% |
| 会话回放率 | 100% | 10% |

## 启用 Sentry

要在您的部署中启用 Sentry：

1. 在 [sentry.io](https://sentry.io) 创建一个 Sentry 项目
2. 设置所需的环境变量：

```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
```

3. 对于开发环境，还需设置：

```env
SENTRY_ENABLE_DEV=true
SENTRY_DEBUG=true
```

## 相关资源

- [监控指南](/template/guides/instrumentation) -- 监控生命周期的完整文档
- [错误处理模式](/template/guides/error-handler-patterns) -- 错误的结构和记录方式
- [环境变量参考](/template/configuration/environment-reference) -- 所有环境变量
