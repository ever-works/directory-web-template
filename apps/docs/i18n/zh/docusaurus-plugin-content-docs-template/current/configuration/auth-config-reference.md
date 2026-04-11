---
id: auth-config-reference
title: Auth.js 配置参考
sidebar_label: Auth 配置参考
sidebar_position: 11
---

# Auth.js 配置参考

本页面记录了 `auth.config.ts` 中定义的 NextAuth（Auth.js）配置。该文件为模板设置认证提供商、会话策略和错误处理。

## 概述

模板通过统一配置支持多种认证策略：

- **NextAuth (Auth.js)** — 基于 OAuth 和凭据的认证
- **Supabase Auth** — Supabase 原生认证
- **两者兼用** — 双提供商模式，以获得最大灵活性

`auth.config.ts` 文件专门配置系统的 NextAuth 侧。

## 配置文件

根目录的 `auth.config.ts` 导出一个 `NextAuthConfig` 对象：

```ts
import { NextAuthConfig } from "next-auth";
import { createNextAuthProviders } from "./lib/auth/providers";
import {
  configureOAuthProviders,
  logError,
} from "./lib/auth/error-handler";
import {
  ErrorType,
  createAppError,
} from "./lib/utils/error-handler";
import { authConfig } from "@/lib/config/config-service";

const configureProviders = () => {
  try {
    const oauthProviders = configureOAuthProviders();
    return createNextAuthProviders({
      google: oauthProviders.find((p) => p.id === "google")
        ? {
            enabled: true,
            clientId: authConfig.google.clientId || "",
            clientSecret: authConfig.google.clientSecret || "",
            options: {
              allowDangerousEmailAccountLinking: false,
            },
          }
        : { enabled: false },
      github: oauthProviders.find((p) => p.id === "github")
        ? {
            enabled: true,
            clientId: authConfig.github.clientId || "",
            clientSecret: authConfig.github.clientSecret || "",
          }
        : { enabled: false },
      facebook: oauthProviders.find((p) => p.id === "facebook")
        ? {
            enabled: true,
            clientId: authConfig.facebook.clientId || "",
            clientSecret: authConfig.facebook.clientSecret || "",
          }
        : { enabled: false },
      twitter: oauthProviders.find((p) => p.id === "twitter")
        ? {
            enabled: true,
            clientId: authConfig.twitter.clientId || "",
            clientSecret: authConfig.twitter.clientSecret || "",
          }
        : { enabled: false },
      credentials: {
        enabled: true,
      },
    });
  } catch (error) {
    // OAuth 失败时回退到仅凭据模式
    const appError = createAppError(
      "Failed to configure OAuth providers. Falling back to credentials only.",
      ErrorType.CONFIG,
      "OAUTH_CONFIG_FAILED",
      error
    );
    logError(appError, "Auth Config");

    return createNextAuthProviders({
      credentials: { enabled: true },
      google: { enabled: false },
      github: { enabled: false },
      facebook: { enabled: false },
      twitter: { enabled: false },
    });
  }
};

export default {
  trustHost: true,
  providers: configureProviders(),
} satisfies NextAuthConfig;
```

## 关键属性

### `trustHost`

设置为 `true` 以在反向代理（如 Vercel）后运行时信任主机头。这是在生产环境中正确生成重定向 URL 所必需的。

### `providers`

providers 数组根据哪些 OAuth 提供商已配置有效凭据动态构建。`configureProviders()` 函数：

1. 调用 `configureOAuthProviders()` 验证环境变量
2. 将每个已启用的提供商映射到其 NextAuth 提供商配置
3. 始终包含凭据提供商作为回退

## 支持的提供商

| 提供商 | 所需环境变量 | 备注 |
|----------|-------------------------------|-------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 默认禁用邮箱账户关联 |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | 标准 OAuth 流程 |
| Facebook | `FB_CLIENT_ID`, `FB_CLIENT_SECRET` | 标准 OAuth 流程 |
| Twitter | `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET` | OAuth 2.0 流程 |
| Credentials | 无（始终启用） | 邮箱/密码认证 |

## 提供商架构

提供商创建管道涉及多个协同工作的文件。

### 提供商工厂（`lib/auth/providers.ts`）

`createNextAuthProviders` 函数将配置对象映射到实际的 NextAuth 提供商实例：

```ts
export function createNextAuthProviders(
  config: OAuthProvidersConfig = defaultOAuthProvidersConfig
) {
  const providers = [];

  if (
    config.google?.enabled &&
    config.google.clientId &&
    config.google.clientSecret
  ) {
    providers.push(
      GoogleProvider({
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
        ...config.google.options,
      })
    );
  }

  // GitHub、Facebook、Twitter 的类似代码块...

  if (config.credentials?.enabled) {
    providers.push(credentialsProvider);
  }

  return providers;
}
```

### 认证错误处理器（`lib/auth/error-handler.ts`）

认证错误处理器验证环境变量并提供可读的错误消息：

```ts
export function validateAuthConfig() {
  const baseNextAuthVars = ["AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];

  const providerEnvVars = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    facebook: ["FB_CLIENT_ID", "FB_CLIENT_SECRET"],
    microsoft: [
      "MICROSOFT_CLIENT_ID",
      "MICROSOFT_CLIENT_SECRET",
    ],
    supabase: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
  };

  const enabledProviders: Record<string, boolean> = {};

  Object.entries(providerEnvVars).forEach(([provider, vars]) => {
    const hasAllVars = vars.every(
      (varName) => !!process.env[varName]?.trim()
    );
    enabledProviders[provider] = hasAllVars;
  });

  return enabledProviders;
}
```

## 优雅降级

关键设计原则是优雅降级。如果启动时 OAuth 配置失败：

1. 错误作为结构化 `AppError` 被捕获，类型为 `CONFIG`，代码为 `OAUTH_CONFIG_FAILED`
2. 错误以 `"Auth Config"` 上下文记录日志
3. 系统回退到仅凭据认证
4. 应用程序继续正常启动

这意味着 Google OAuth 密钥配置错误不会阻止整个应用程序运行——用户仍然可以用邮箱和密码登录。

## 部分配置的提供商

当提供商设置了部分但不完整的必需环境变量时，会记录警告：

```
[CONFIG] [Auth Config]: Partial configuration for google provider.
Missing: GOOGLE_CLIENT_SECRET
```

这有助于在不崩溃应用程序的情况下识别配置问题。

## 必需的环境变量

至少配置以下内容使 NextAuth 正常运行：

```env
# 所有 NextAuth 配置必需
AUTH_SECRET=your-secret-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 可选：添加提供商凭据以启用 OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

使用以下命令生成 `AUTH_SECRET`：

```bash
openssl rand -base64 32
```

## 相关资源

- [提供商配置](/template/configuration/provider-config) — 在 NextAuth、Supabase 或两者之间选择
- [环境变量参考](/template/configuration/environment-reference) — 完整的环境变量列表
- [错误处理模式](/template/guides/error-handler-patterns) — 认证错误的结构
