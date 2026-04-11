---
id: recaptcha
title: reCAPTCHA 集成
sidebar_label: 验证码
sidebar_position: 24
---

# reCAPTCHA 集成

该模板集成了 Google reCAPTCHA v3，用于身份验证和表单提交流程的机器人保护。它包括服务器端验证端点、用于令牌管理的客户端挂钩以及在未配置凭据时绕过验证的开发模式。

## 架构概述

```
app/api/verify-recaptcha/
  route.ts                          -- Server-side token verification endpoint

app/[locale]/auth/hooks/
  useRecaptchaVerification.ts       -- React Query mutation for verification
  useAutoRecaptchaVerification.ts   -- Auto-trigger on mount or condition

lib/api/
  server-api-client.ts              -- externalClient used for Google API calls

lib/config/
  config-service.ts                 -- analyticsConfig.recaptcha.secretKey
```

## 服务器端验证端点

位于 1 处的 0 路由根据 Google reCAPTCHA API 处理令牌验证：

```tsx
// app/api/verify-recaptcha/route.ts
import { NextRequest, NextResponse } from "next/server";
import { externalClient, apiUtils } from "@/lib/api/server-api-client";
import { coreConfig, analyticsConfig } from "@/lib/config/config-service";

interface RecaptchaApiResponse {
  success: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA token is required" },
        { status: 400 }
      );
    }

    const secretKey = analyticsConfig.recaptcha.secretKey;
    if (!secretKey) {
      if (coreConfig.NODE_ENV === "development") {
        console.warn(
          "[ReCAPTCHA] WARNING: Secret key not configured -- bypassing verification in development mode."
        );
        return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
      }
      return NextResponse.json(
        { success: false, error: "ReCAPTCHA not configured" },
        { status: 500 }
      );
    }

    const response = await externalClient.postForm<RecaptchaApiResponse>(
      "https://www.google.com/recaptcha/api/siteverify",
      { secret: secretKey, response: token }
    );

    if (!apiUtils.isSuccess(response)) {
      console.error("ReCAPTCHA API request failed:", apiUtils.getErrorMessage(response));
      return NextResponse.json(
        { success: false, error: "Failed to verify ReCAPTCHA" },
        { status: 500 }
      );
    }

    const data = response.data;

    return NextResponse.json({
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
      error_codes: data['error-codes'],
    });
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}
```

### 关键实施细节

- **令牌验证**：如果请求正文中未提供令牌，则返回 400。
- **开发绕过**：当未配置密钥且0为1时，端点将返回成功响应223，而无需联系Google。
- **外部客户端**：使用 5 中预配置的 4 及其 6 方法，将7 数据发送到 Google 的验证 API。
- **API 实用程序**：使用 8 和 9 进行一致的响应处理。
- **完整响应转发**：返回完整的验证结果，包括分数、操作、主机名、质询时间戳和错误代码。

### 开发模式绕过

当未设置 10 且应用程序在开发模式下运行时，端点会自动绕过验证：

```tsx
if (!secretKey) {
  if (coreConfig.NODE_ENV === "development") {
    return NextResponse.json({ success: true, score: 1.0, action: "bypass" });
  }
  return NextResponse.json(
    { success: false, error: "ReCAPTCHA not configured" },
    { status: 500 }
  );
}
```

在生产中，丢失的密钥会返回 500 错误，而不是静默绕过。

## 客户端验证挂钩

1处的 0 钩子将验证调用包装在 React Query 突变中：

```tsx
// app/[locale]/auth/hooks/useRecaptchaVerification.ts
import { useMutation } from '@tanstack/react-query';

function useRecaptchaVerification() {
  const mutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('reCAPTCHA verification failed');
      }

      return response.json();
    },
  });

  return {
    verifyRecaptcha: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    isVerified: mutation.isSuccess,
    error: mutation.error,
    reset: mutation.reset,
  };
}
```

### 返回值

|物业 |类型 |描述 |
|----------|------|-------------|
| 0 | 1 |验证令牌的变异函数 |
| 2 | 3 |是否正在进行验证 |
| 4 | 5 |是否验证成功 |
| 6 | 7 |上次验证尝试出错 |
| 8 | 9 |重置验证状态 |

## 自动验证挂钩

当组件安装或条件成立时，10 钩子会自动触发 reCAPTCHA 验证：

```tsx
function useAutoRecaptchaVerification(options?: {
  action?: string;       // reCAPTCHA action name (default: 'submit')
  enabled?: boolean;     // Whether to auto-verify (default: true)
}): {
  isVerified: boolean;
  isVerifying: boolean;
  error: Error | null;
  token: string | null;
}
```

### 使用示例

```tsx
function ProtectedForm() {
  const { isVerified, isVerifying } = useAutoRecaptchaVerification({
    action: 'login',
    enabled: true,
  });

  return (
    <form>
      {/* Form fields */}
      <button disabled={!isVerified || isVerifying}>
        {isVerifying ? 'Verifying...' : 'Submit'}
      </button>
    </form>
  );
}
```

## 谷歌 API 集成

端点使用 1 中的0 方法与 Google 的 reCAPTCHA API 进行通信。此方法发送 URL 编码的表单数据：

```tsx
const response = await externalClient.postForm<RecaptchaApiResponse>(
  "https://www.google.com/recaptcha/api/siteverify",
  { secret: secretKey, response: token }
);
```

0 是一个预配置的1 实例，专为外部 API 调用而设计。 2方法自动处理3内容类型。

### 分数解读

reCAPTCHA v3 返回 0.0 到 1.0 之间的分数：

|分数范围|解读|典型行动 |
|-------------|--------------|----------------|
| 0.7 - 1.0 |可能是人类 |允许提交 |
| 0.3 - 0.7 | 0.3 - 0.7不确定|可能需要额外验证 |
| 0.0 - 0.3 | 0.0 - 0.3可能是机器人 |块提交 |

## 与身份验证集成

4 组件在提交凭据之前使用 reCAPTCHA 验证：

```tsx
function CredentialsForm({ type, onSuccess }) {
  const { verifyRecaptcha, isVerifying } = useRecaptchaVerification();

  const handleSubmit = async (formData: FormData) => {
    const token = await grecaptcha.execute(siteKey, { action: type });
    const result = await verifyRecaptcha(token);

    if (!result.verified) {
      toast.error('Verification failed. Please try again.');
      return;
    }

    await signIn(formData);
  };
}
```

## 环境变量

```bash
# Client-side site key (public, exposed to browser)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6Le...

# Server-side secret key (private, never exposed to client)
RECAPTCHA_SECRET_KEY=6Le...
```

密钥通过集中配置服务的 0 访问，而不是直接从 1 访问。

## Swagger 文档

验证端点包括全面的 Swagger/JSDoc 注释，记录所有请求和响应架构、状态代码和示例。这是通过模板的内置 API 文档系统提供的。

## 有条件激活

|状况 |行为 |
|------------|----------|
|秘钥集|针对 Google API 的全面验证 |
|秘钥缺失，开发模式|自动旁路2
|秘钥丢失，生产模式|返回 500 错误 |
|客户端上未设置站点密钥 |脚本未加载，表单未经验证就提交 |

## 错误处理

端点处理三类错误：

1. **客户端错误 (400)**：请求正文中缺少令牌或令牌无效
2. **配置错误 (500)**：生产中缺少密钥
3. **上游错误 (500)**：Google API 请求失败或意外异常

所有错误都会记录到服务器控制台，并返回一致的 JSON 结构，其中包含 3 和 4 消息。

## 文件参考

|文件|目的|
|------|---------|
| 5 |服务器端验证端点 |
| 6 | React 查询验证突变 |
| 7 |自动触发验证钩子|
| 8 | 9和10方法|
| 11 | 12 |
