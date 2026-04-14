---
id: newsletter-library
title: 通讯库
sidebar_label: 通讯库
sidebar_position: 35
---

# 通讯库

新闻通讯库提供用于管理电子邮件新闻通讯订阅的配置、验证和实用功能。它建立在 [Mail Factory](./mail-factory.md) 之上，用于电子邮件传送。

## 文件结构

```
lib/newsletter/
  config.ts     # Configuration, types, Zod schemas, email config creation
  utils.ts      # Email sending, subscription validation, logging, templates
```

## 配置（`config.ts`）

### 通讯常数

`NEWSLETTER_CONFIG` 对象集中了所有与新闻通讯相关的常量：

```ts
export const NEWSLETTER_CONFIG = {
  DEFAULT_PROVIDER: "resend",
  DEFAULT_FROM: "onboarding@resend.dev",
  DEFAULT_COMPANY_NAME: "Ever Works",

  SOURCES: {
    FOOTER: "footer",
    POPUP: "popup",
    SIGNUP: "signup",
  } as const,

  ERRORS: {
    INVALID_EMAIL: "Please enter a valid email address",
    ALREADY_SUBSCRIBED: "Email is already subscribed to the newsletter",
    NOT_SUBSCRIBED: "Email is not subscribed to the newsletter",
    SUBSCRIPTION_FAILED: "Failed to create subscription. Please try again.",
    UNSUBSCRIPTION_FAILED: "Failed to unsubscribe. Please try again.",
    EMAIL_SEND_FAILED: "Failed to send email. Please try again.",
    STATS_FAILED: "Failed to get newsletter statistics",
  } as const,

  SUCCESS: {
    SUBSCRIBED: "Successfully subscribed to newsletter",
    UNSUBSCRIBED: "Successfully unsubscribed from newsletter",
  } as const,
} as const;
```

### 类型

```ts
// Source of the subscription action
type NewsletterSource = "footer" | "popup" | "signup";

// Email provider configuration
interface EmailConfig {
  provider: string;
  defaultFrom: string;
  domain: string;
  apiKeys: { resend: string; novu: string };
  novu?: { templateId?: string; backendUrl?: string };
}

// Action result for subscribe/unsubscribe operations
interface NewsletterActionResult {
  success?: boolean;
  error?: string;
  email?: string;
}

// Newsletter statistics
interface NewsletterStats {
  totalActive: number;
  recentSubscriptions: number;
}
```

### 验证模式

两个 Zod 模式处理时事通讯操作的电子邮件验证：

```ts
import { z } from "zod";

// Basic email validation
export const emailSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
});

// Full subscription schema with source tracking
export const newsletterSubscriptionSchema = z.object({
  email: z
    .string()
    .email(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL)
    .transform((email) => email.toLowerCase().trim()),
  source: z
    .enum(["footer", "popup", "signup"])
    .default("footer"),
});
```

### 配置创建

```ts
import { createEmailConfig, getCompanyName } from '@/lib/newsletter/config';

// Build email config from app settings and environment
const config = await createEmailConfig();
// => { provider: "resend", defaultFrom: "...", domain: "...", apiKeys: {...} }

// Get company name with fallback
const name = await getCompanyName();
// => "Ever Works" or value from content config
```

## 公用事业 (`utils.ts`)

### 安全发送电子邮件

`sendEmailSafely` 函数通过全面的错误处理来包装电子邮件发送：

```ts
import { sendEmailSafely, createEmailService } from '@/lib/newsletter/utils';

const { service, config } = await createEmailService();

const result = await sendEmailSafely(
  service,
  config,
  { subject: "Welcome!", html: "<p>Hi</p>", text: "Hi" },
  "user@example.com",
  "welcome"
);

if (result.success) {
  // Email sent
} else {
  console.log(result.error);
}
```

### 订阅验证

检查邮件是否可以订阅或取消订阅：

```ts
import { canSubscribe, canUnsubscribe } from '@/lib/newsletter/utils';

// Check if email is not already active
const subCheck = await canSubscribe("user@example.com");
if (!subCheck.canSubscribe) {
  console.log(subCheck.error); // "Email is already subscribed..."
}

// Check if email is currently active
const unsubCheck = await canUnsubscribe("user@example.com");
if (!unsubCheck.canUnsubscribe) {
  console.log(unsubCheck.error); // "Email is not subscribed..."
}
```

底层`validateSubscriptionStatus`函数查询数据库：

```ts
const validation = await validateSubscriptionStatus(email, shouldBeActive);
// => { isValid: boolean, error?: string, subscription?: any }
```

### 记录和监控

```ts
import { logNewsletterActivity, trackNewsletterMetric } from '@/lib/newsletter/utils';

// Log activity for monitoring
logNewsletterActivity("subscribe", "user@example.com", "footer");
// Output: Newsletter Activity: { timestamp, action, email, source }

// Track metrics (wraps logNewsletterActivity)
trackNewsletterMetric("subscription", "user@example.com", "popup");
```

### 模板实用程序

```ts
import { getTemplateWithCompany } from '@/lib/newsletter/utils';

// Automatically injects the company name into a template function
const template = await getTemplateWithCompany(
  (email, companyName) => ({
    subject: `Welcome to ${companyName}`,
    html: `<p>Thanks for subscribing, ${email}!</p>`,
    text: `Thanks for subscribing, ${email}!`,
  }),
  "user@example.com"
);
```

### 标准化反应

```ts
import { createErrorResponse, createSuccessResponse } from '@/lib/newsletter/utils';

const error = createErrorResponse("Invalid email", "bad@", "subscribe");
// => { error: "Invalid email", email: "bad@", context: "subscribe" }

const success = createSuccessResponse("user@example.com", "subscribe");
// => { success: true, email: "user@example.com", context: "subscribe" }
```

## 整合流程

典型的新闻通讯订阅流程：

1. **使用`newsletterSubscriptionSchema`验证输入**
2. **使用`canSubscribe`检查资格**
3. **通过新闻通讯存储库创建数据库记录**
4. **使用 `sendEmailSafely` 发送欢迎电子邮件**
5. **使用 `logNewsletterActivity` 记录活动**
6. **使用 `createSuccessResponse` 或 `createErrorResponse` 返回结果**

```ts
// Simplified server action example
async function subscribeToNewsletter(formData: FormData) {
  const parsed = newsletterSubscriptionSchema.safeParse({
    email: formData.get('email'),
    source: formData.get('source'),
  });
  if (!parsed.success) {
    return createErrorResponse(NEWSLETTER_CONFIG.ERRORS.INVALID_EMAIL);
  }

  const { email, source } = parsed.data;
  const eligibility = await canSubscribe(email);
  if (!eligibility.canSubscribe) {
    return createErrorResponse(eligibility.error || "Cannot subscribe");
  }

  // Create subscription in database...
  // Send welcome email...

  logNewsletterActivity("subscribe", email, source);
  return createSuccessResponse(email, "subscribe");
}
```

## 相关文件

- `lib/newsletter/config.ts` - 配置、类型和验证模式
- `lib/newsletter/utils.ts` - 电子邮件、验证、日志记录和模板实用程序
- `lib/mail/` - 电子邮件提供商工厂和服务
- `lib/mail/templates/newsletter-*.ts` - 时事通讯电子邮件模板
- `lib/db/queries.ts` - 数据库查询订阅记录
