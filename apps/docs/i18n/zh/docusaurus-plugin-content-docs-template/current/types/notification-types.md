---
id: notification-types
title: 通知类型定义
sidebar_label: 通知类型
sidebar_position: 14
---

# 通知类型定义

**来源：** `lib/services/email-notification.service.ts`、`lib/payment/services/payment-email.service.ts`、`lib/payment/types/payment-types.ts`

模板中的通知主要基于电子邮件，由付款完成、订阅更改和提交审核等系统事件触发。

## 接口

### `EmailNotificationData`

用于发送管理通知电子邮件的核心负载。

```typescript
interface EmailNotificationData {
  to: string;                  // Recipient email address
  title: string;               // Email subject / notification title
  message: string;             // Body text content
  actionUrl?: string;          // Optional CTA link
  actionText?: string;         // Optional CTA button label
  notificationType: string;    // Category identifier for template selection
  timestamp: string;           // ISO 8601 timestamp
}
```

|领域|必填|描述|
|-------|----------|-------------|
|`to`|是的|收件人电子邮件地址|
|`title`|是的|主题行和内部标题|
|`message`|是的|主要通知主体|
|`actionUrl`|否|号召性用语按钮的链接|
|`actionText`|否|CTA 按钮的标签文本|
|`notificationType`|是的|用于选择电子邮件模板变体|
|`timestamp`|是的|触发事件发生时|

### `WebhookEventType`

从支付提供商 Webhook 收到的触发通知的事件。

```typescript
enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  // ... additional billing portal events
}
```

### `WebhookResult`

处理 Webhook 事件的标准化结果。

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## 通知类别

该模板会触发以下事件类别的通知：

|类别|触发事件|
|----------|---------------|
|**付款**|`payment_succeeded`、`payment_failed`、`refund_succeeded`|
|**订阅**|`subscription_created`、`subscription_cancelled`、`subscription_trial_ending`|
|**发票**|`invoice_paid`、`invoice_payment_failed`|
|**提交**|项目已批准，项目已拒绝，收到新提交|
|**账户**|密码已更改，电子邮件已验证|

## 电子邮件服务集成

通知通过 `EmailNotificationService` 类发送：

```typescript
import { EmailNotificationService } from '@/lib/services/email-notification.service';
import type { EmailNotificationData } from '@/lib/services/email-notification.service';

const notification: EmailNotificationData = {
  to: 'admin@example.com',
  title: 'New Submission Received',
  message: 'A new item "Acme Corp" has been submitted for review.',
  actionUrl: '/admin/items/pending',
  actionText: 'Review Now',
  notificationType: 'submission',
  timestamp: new Date().toISOString(),
};

const result = await EmailNotificationService.sendAdminNotification(notification);
```

该服务在发送之前检查电子邮件提供商的可用性，如果未配置提供商，则返回 `skipped` 结果，从而防止在没有电子邮件设置的环境中出现运行时错误。

## 电子邮件提供商配置

通知发送取决于`lib/config/schemas/email.schema.ts`中的电子邮件配置：

|提供者|所需的环境变量|自动启用|
|----------|-----------------|--------------|
|重新发送|`RESEND_API_KEY`|当钥匙存在时|
|诺武|`NOVU_API_KEY`|当钥匙存在时|
|邮件传输协议|`SMTP_HOST`、`SMTP_USER`、`SMTP_PASSWORD`|当三个人都在场时|

## 使用示例

```typescript
// In a webhook handler
import { WebhookEventType } from '@/lib/payment/types/payment-types';

async function handleWebhook(event: WebhookResult) {
  if (event.type === WebhookEventType.SUBSCRIPTION_CANCELLED) {
    await EmailNotificationService.sendAdminNotification({
      to: adminEmail,
      title: 'Subscription Cancelled',
      message: `Customer ${event.data.customerId} cancelled their subscription.`,
      notificationType: 'subscription',
      timestamp: new Date().toISOString(),
    });
  }
}
```

## 相关类型

- [付款类型](./ payment-types.md) -- `WebhookEventType` 和付款枚举
- [订阅类型](./subscription-types.md) -- 订阅生命周期事件
- [配置类型](./config-types.md) -- `EmailConfig` 用于提供程序设置
