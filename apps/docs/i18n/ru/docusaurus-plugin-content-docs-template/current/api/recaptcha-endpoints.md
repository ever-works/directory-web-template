---
id: recaptcha-endpoints
title: "ReCAPTCHA API 参考"
sidebar_label: "验证码"
sidebar_position: 57
---

# ReCAPTCHA API 参考

## 概述

ReCAPTCHA 端点提供 Google ReCAPTCHA v3 令牌的服务器端验证。它充当客户端和 Google 验证 API 之间的安全代理，将密钥保存在服务器端。开发模式下，不配置秘钥时可以绕过验证。

## 端点

### POST /api/验证-recaptcha

通过与 Google 的 `siteverify` API 端点通信来验证 Google ReCAPTCHA v3 令牌。返回验证结果，包括机器人/人类分数。

**请求**
```typescript
{
  token: string;   // ReCAPTCHA token from client-side grecaptcha.execute()
}
```

**回应**
```typescript
{
  success: boolean;           // Whether verification passed
  score?: number;             // 0.0 (bot) to 1.0 (human)
  action?: string;            // Action name from the ReCAPTCHA challenge
  hostname?: string;          // Hostname where verification occurred
  challenge_ts?: string;      // ISO 8601 timestamp of the challenge
  error_codes?: string[];     // Error codes from Google's API (if any)
}
```

**示例**
```typescript
// Client-side: get token
const token = await grecaptcha.execute('YOUR_SITE_KEY', { action: 'submit' });

// Server verification
const response = await fetch('/api/verify-recaptcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token })
});

const result = await response.json();

if (result.success && result.score > 0.5) {
  // Proceed with form submission
} else {
  // Block suspected bot activity
}
```

### 开发模式行为

当`RECAPTCHA_SECRET_KEY`未配置且`NODE_ENV`为`"development"`时，端点绕过Google验证并返回：

```typescript
{
  success: true,
  score: 1.0,
  action: "bypass"
}
```

控制台会记录一条警告，表明验证被绕过。

## 认证

该端点是**公开**——不需要身份验证。它设计为在表单处理之前或期间从客户端表单提交流调用。

## 错误响应

|状态|描述|
|--------|-------------|
| 400 |请求正文中`token` 缺失或为空|
| 500 |`RECAPTCHA_SECRET_KEY` 未配置（仅限生产）、Google API 请求失败或意外的运行时错误|

## 速率限制

不应用应用程序级别的速率限制。 Google 的 ReCAPTCHA API 有其自己的速率限制。终端与Google API通信时使用`application/x-www-form-urlencoded`格式。

## 相关端点

这是一个独立的安全端点。它通常在整个应用程序中的表单提交或敏感操作之前调用。
