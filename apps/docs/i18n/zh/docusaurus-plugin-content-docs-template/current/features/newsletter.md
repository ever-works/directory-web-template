---
id: newsletter
title: 通讯系统
sidebar_label: 通讯
sidebar_position: 5
---

# 时事通讯系统

Ever Works 模板包括一个带有电子邮件集成的时事通讯订阅系统、多个订阅源和管理统计信息。

## 配置

新闻通讯系统位于0，提供集中配置：

```typescript
const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",       // Footer subscription form
    POPUP: "popup",         // Popup/modal subscription
    SIGNUP: "signup",       // Account registration
  },
};
```

### 电子邮件提供商设置

时事通讯使用与通知系统相同的电子邮件提供商：

```typescript
interface EmailConfig {
  provider: string;        // "resend" or "novu"
  defaultFrom: string;     // Sender email address
  domain: string;          // App domain
  apiKeys: {
    resend: string;        // RESEND_API_KEY
    novu: string;          // NOVU_API_KEY
  };
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

配置是从站点配置解析的，并回退到环境变量：

```typescript
const emailConfig = await createEmailConfig();
// Reads from: config.mail.provider, config.mail.default_from
// Falls back to: NEWSLETTER_CONFIG defaults
// API keys from: ConfigService (emailConfig.resend.apiKey, emailConfig.novu.apiKey)
```

## 订阅管理

### 验证

使用 Zod 模式验证和规范化电子邮件地址：

```typescript
import { emailSchema, newsletterSubscriptionSchema } from '@/lib/newsletter/config';

// Simple email validation
const result = emailSchema.parse({ email: "user@example.com" });

// Full subscription validation (includes source)
const subscription = newsletterSubscriptionSchema.parse({
  email: "user@example.com",
  source: "footer",
});
```

在验证过程中，电子邮件会自动小写并被修剪。

### 订阅来源

每个订阅都会记录用户注册的位置：

|来源 |地点 |描述 |
|--------|----------|-------------|
| 0 |网站页脚|订阅表格始终可见 |
| 1 |模态/弹出 |触发订阅提示 |
| 2 |注册 |在帐户创建期间选择加入 |

＃＃＃ 统计数据

```typescript
interface NewsletterStats {
  totalActive: number;           // Current active subscribers
  recentSubscriptions: number;   // New subscribers (recent period)
}
```

## API 端点

|方法|端点 |描述 |
|--------|----------|-------------|
|发布 | 0 |订阅时事通讯 |
|删除 | 1 |取消订阅时事通讯 |
|获取 | 2 |获取订阅统计信息（管理员）|

## 错误信息

系统提供一致的、用户友好的错误消息：

|代码|留言 |
|------|---------|
| 3 |请输入有效的电子邮件地址 |
| 4 |电子邮件已订阅时事通讯 |
| 5 |电子邮件未订阅时事通讯 |
| 6 |创建订阅失败。请再试一次。 |

## 实用函数

```typescript
import {
  createEmailConfig,           // Build email config from site settings
  getCompanyName,              // Get company name with fallback
  validateAndNormalizeEmail,   // Lowercase + trim email
  validateEmail,               // Boolean email format check
} from '@/lib/newsletter/config';
```
