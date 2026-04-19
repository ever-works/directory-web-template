---
id: mail-factory
title: 邮件工厂
sidebar_label: 邮件工厂
sidebar_position: 33
---

# 邮件工厂

该模板使用工厂模式进行电子邮件传送，支持多个提供商（Resend、Novu），并在开发期间或凭证丢失时自动回退到模拟提供商。

## 文件结构

```
lib/mail/
  index.ts                    # EmailService class, exported helper functions
  factory.ts                  # EmailProviderFactory - provider selection logic
  mock.ts                     # MockEmailProvider - logs to console
  resend.ts                   # ResendProvider - Resend API integration
  novu.ts                     # NovuProvider - Novu notification integration
  templates/
    index.ts                  # Re-exports all templates
    account-created.ts        # Account creation email
    admin-notification.ts     # Admin notification emails
    email-verification.ts     # Email verification link
    newsletter-welcome.ts     # Newsletter welcome email
    newsletter-unsubscribe.ts # Newsletter unsubscribe confirmation
    newsletter-regular.ts     # Regular newsletter dispatch
    password-change-confirmation.ts  # Password change confirmation
    payment-success.ts        # Payment success notification
    payment-failed.ts         # Payment failure notification
    submission-decision.ts    # Item submission approval/rejection
    subscription-events.ts    # Subscription lifecycle events
    subscription-expired.ts   # Subscription expiration notice
    subscription-renewal-reminder.ts # Renewal reminder
```

## 提供者接口

每个电子邮件提供商都实现 `EmailProvider` 接口：

```ts
export interface EmailMessage {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<any>;
  getName(): string;
}
```

## 工厂模式 (`factory.ts`)

`EmailProviderFactory` 根据配置选择适当的提供程序。如果指定提供程序的 API 密钥丢失或为空，则它将回退到模拟提供程序：

```ts
export class EmailProviderFactory {
  static createProvider(config: EmailServiceConfig): EmailProvider {
    const provider = config.provider.toLowerCase();

    switch (provider) {
      case "resend":
        if (!config.apiKeys.resend || config.apiKeys.resend.trim() === '') {
          console.warn('Resend API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new ResendProvider(config.apiKeys.resend, config.defaultFrom);

      case "novu":
        if (!config.apiKeys.novu || config.apiKeys.novu.trim() === '') {
          console.warn('Novu API key is missing. Using mock email provider.');
          return new MockEmailProvider();
        }
        return new NovuProvider(config.apiKeys.novu, config.defaultFrom, config.novu);

      default:
        console.warn(`Unknown email provider. Using mock email provider.`);
        return new MockEmailProvider();
    }
  }
}
```

## 提供者实施

### 模拟电子邮件提供者

将电子邮件记录到控制台。在开发期间或未配置 API 密钥时使用：

```ts
export class MockEmailProvider implements EmailProvider {
  async sendEmail(message: EmailMessage) {
    console.log("Sending email:", message);
    return Promise.resolve();
  }
  getName(): string { return "mock"; }
}
```

### 重发提供者

通过重新发送 API 发送电子邮件：

```ts
export class ResendProvider implements EmailProvider {
  private resend: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.resend = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async sendEmail(message: EmailMessage): Promise<CreateEmailResponse> {
    return this.resend.emails.send({
      from: message.from || this.defaultFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}
```

### Novu提供商

使用工作流程触发器通过 Novu 的通知基础设施发送电子邮件：

```ts
export class NovuProvider implements EmailProvider {
  private novu: Novu;
  private defaultFrom: string;
  private templateId: string;

  constructor(apiKey: string, defaultFrom: string, config?: EmailNovuConfig) {
    this.novu = new Novu({
      secretKey: apiKey,
      serverURL: config?.backendUrl,
    });
    this.defaultFrom = defaultFrom;
    this.templateId = config?.templateId || "email-default";
  }

  async sendEmail(message: EmailMessage) {
    const email = Array.isArray(message.to) ? message.to[0] : message.to;
    return this.novu.trigger({
      to: { subscriberId: email, email },
      workflowId: this.templateId,
      payload: {
        subject: message.subject,
        body: message.html,
        preheader: message.text,
        from: message.from || this.defaultFrom,
      },
    });
  }
}
```

## 电子邮件服务类

`EmailService` 类包装工厂创建的提供程序并提供特定于域的电子邮件方法。它包括可用性检查，以便应用程序可以在未配置电子邮件时正常降级：

```ts
export class EmailService {
  private provider: EmailProvider | null = null;
  private isAvailable: boolean = false;

  constructor(config: EmailServiceConfig) {
    const hasApiKey = Object.values(config.apiKeys).some(
      key => key && key.trim() !== ''
    );
    if (hasApiKey) {
      this.provider = EmailProviderFactory.createProvider(config);
      this.isAvailable = true;
    }
  }

  public isServiceAvailable(): boolean {
    return this.isAvailable && this.provider !== null;
  }

  // Domain-specific methods
  async sendVerificationEmail(email: string, token: string): Promise<any>
  async sendPasswordResetEmail(email: string, token: string): Promise<any>
  async sendTwoFactorTokenEmail(email: string, token: string): Promise<any>
  async sendPasswordChangeConfirmationEmail(email: string, ...): Promise<any>
  async sendAccountCreatedEmail(userName: string, email: string, ...): Promise<any>
  async sendNewsletterSubscriptionEmail(email: string): Promise<any>
  async sendNewsletterUnsubscriptionEmail(email: string): Promise<any>
  async sendCustomEmail(message: EmailMessage): Promise<any>
}
```

## 导出的辅助函数

该模块导出自动处理服务创建和错误管理的顶级函数。以下是在整个应用程序中发送电子邮件的推荐方式：

```ts
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTwoFactorTokenEmail,
  sendPasswordChangeConfirmationEmail,
  sendAccountCreatedEmail,
  sendNewsletterSubscriptionEmail,
  sendNewsletterUnsubscriptionEmail,
} from '@/lib/mail';

// Each function handles service unavailability gracefully
const result = await sendVerificationEmail('user@example.com', verificationToken);

// Returns either the provider result or a skipped result
if ('skipped' in result) {
  console.log(result.reason); // "Email service not configured"
}
```

`tryEmailOperation` 包装器捕获可用性错误并返回结构化结果而不是抛出：

```ts
interface EmailSkippedResult {
  skipped: true;
  reason: string;
}
```

## 配置

服务配置由应用程序的内容配置和环境变量组成：

```ts
export interface EmailServiceConfig {
  provider: string;         // "resend" | "novu"
  defaultFrom: string;      // e.g., "info@ever.works"
  apiKeys: Record<string, string>;
  domain: string;           // App URL for link generation
  novu?: {
    templateId?: string;
    backendUrl?: string;
  };
}
```

配置来源（按优先顺序）：

1. **内容配置** (`config.mail.provider`, `config.mail.default_from`) - 来自基于 Git 的 CMS
2. **环境变量** (`EMAIL_PROVIDER`, `EMAIL_FROM`) - 来自配置服务
3. **后备默认值** - 重新发送提供商，`info@ever.works`

## 电子邮件模板

所有模板均从`lib/mail/templates/index.ts`导出：

|模板|功能|目的|
|----------|----------|---------|
|帐户已创建|`getAccountCreatedTemplate`|注册后欢迎邮件|
|电子邮件验证|`getEmailVerificationTemplate`|验证链接电子邮件|
|更改密码|`getPasswordChangeConfirmationTemplate`|确认密码已更改|
|支付成功|`getPaymentSuccessTemplate`|付款收据|
|付款失败|`getPaymentFailedTemplate`|付款失败通知|
|订阅活动|`getNewSubscriptionTemplate`、`getUpdatedSubscriptionTemplate`、`getCancelledSubscriptionTemplate`|订阅生命周期|
|续订提醒|`getRenewalReminderTemplate`|即将更新的通知|
|欢迎时事通讯|`getWelcomeEmailTemplate`|时事通讯注册确认|
|取消订阅时事通讯|`getUnsubscribeEmailTemplate`|取消订阅确认|
|定期通讯|`getRegularNewsletterTemplate`|通讯内容发送|

## 环境变量

|变量|必填|描述|
|----------|----------|-------------|
|`EMAIL_PROVIDER`|否|提供商名称：`resend` 或 `novu`（默认值：`resend`）|
|`EMAIL_FROM`|否|默认发件人地址|
|`RESEND_API_KEY`|重新发送|重新发送 API 密钥|
|`NOVU_API_KEY`|对于诺武|Novu API 密钥|
|`NOVU_TEMPLATE_ID`|否|Novu 工作流程 ID（默认：`email-default`）|
|`NOVU_BACKEND_URL`|否|自定义 Novu 后端 URL|

## 相关文件

- `lib/mail/factory.ts` - 提供者工厂
- `lib/mail/index.ts` - EmailService 和导出函数
- `lib/mail/templates/` - 所有电子邮件模板生成器
- `lib/newsletter/` - 时事通讯特定的电子邮件实用程序
