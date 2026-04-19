---
id: notification-types
title: تعريفات نوع الإخطار
sidebar_label: أنواع الإخطارات
sidebar_position: 14
---

# تعريفات نوع الإخطار

**المصدر:** `lib/services/email-notification.service.ts`، `lib/payment/services/payment-email.service.ts`، `lib/payment/types/payment-types.ts`

تعتمد الإشعارات الموجودة في القالب في المقام الأول على البريد الإلكتروني، ويتم تشغيلها بواسطة أحداث النظام مثل اكتمال الدفع وتغييرات الاشتراك ومراجعات الإرسال.

## واجهات

### `EmailNotificationData`

الحمولة الأساسية لإرسال رسائل البريد الإلكتروني لإشعارات المشرف.

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

|الميدان|مطلوب|الوصف|
|-------|----------|-------------|
|`to`|نعم|عنوان البريد الإلكتروني للمستلم|
|`title`|نعم|سطر الموضوع والعنوان الداخلي|
|`message`|نعم|هيئة الإخطار الرئيسية|
|`actionUrl`|لا|رابط لزر الحث على اتخاذ إجراء|
|`actionText`|لا|تسمية النص لزر CTA|
|`notificationType`|نعم|يُستخدم لتحديد متغير قالب البريد الإلكتروني|
|`timestamp`|نعم|عندما وقع الحدث المحفز|

### `WebhookEventType`

الأحداث المتلقاة من خطافات الويب الخاصة بموفر الدفع والتي تؤدي إلى تشغيل الإشعارات.

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

نتيجة موحدة من معالجة حدث webhook.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## فئات الإخطار

يقوم القالب بتشغيل الإشعارات لفئات الأحداث التالية:

|الفئة|أحداث الزناد|
|----------|---------------|
|**الدفع**|`payment_succeeded`، `payment_failed`، `refund_succeeded`|
|**الاشتراك**|`subscription_created`، `subscription_cancelled`، `subscription_trial_ending`|
|**الفاتورة**|`invoice_paid`، `invoice_payment_failed`|
|**التقديم**|تمت الموافقة على العنصر، تم رفض العنصر، تم استلام طلب جديد|
|**الحساب**|تم تغيير كلمة المرور، تم التحقق من البريد الإلكتروني|

## تكامل خدمة البريد الإلكتروني

يتم إرسال الإخطارات عبر فئة `EmailNotificationService`:

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

تتحقق الخدمة من توفر موفر البريد الإلكتروني قبل الإرسال وترجع نتيجة `skipped` إذا لم يتم تكوين أي موفر، مما يمنع أخطاء وقت التشغيل في البيئات التي لا تحتوي على إعداد البريد الإلكتروني.

## تكوين مزود البريد الإلكتروني

يعتمد تسليم الإشعارات على تكوين البريد الإلكتروني في `lib/config/schemas/email.schema.ts`:

|مزود|مطلوب Env Var|تمكين تلقائي|
|----------|-----------------|--------------|
|إعادة الإرسال|`RESEND_API_KEY`|عندما يكون المفتاح موجودا|
|نوفو|`NOVU_API_KEY`|عندما يكون المفتاح موجودا|
|SMTP|`SMTP_HOST`، `SMTP_USER`، `SMTP_PASSWORD`|عندما يكون الثلاثة حاضرين|

## مثال الاستخدام

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

## الأنواع ذات الصلة

- [أنواع الدفع](./Payment-types.md) -- `WebhookEventType` وأعداد الدفع
- [أنواع الاشتراكات](./subscription-types.md) - أحداث دورة حياة الاشتراك
- [أنواع التكوين](./config-types.md) - `EmailConfig` لإعدادات الموفر
