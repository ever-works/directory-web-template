---
id: notification-types
title: Дефиниции на типа известие
sidebar_label: Видове известия
sidebar_position: 14
---

# Дефиниции на типа известие

**Източник:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Известията в шаблона са основно базирани на имейл, задействани от системни събития като завършване на плащания, промени в абонамента и прегледи на подаването.

## Интерфейси

### `EmailNotificationData`

Основният полезен товар за изпращане на имейли с уведомителни администратори.

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

|Поле|Задължително|Описание|
|-------|----------|-------------|
|`to`|да|Имейл адрес на получател|
|`title`|да|Тема и вътрешно заглавие|
|`message`|да|Основен нотификационен орган|
|`actionUrl`|не|Връзка към бутона с призив за действие|
|`actionText`|не|Текст на етикета за CTA бутона|
|`notificationType`|да|Използва се за избор на вариант на шаблон за имейл|
|`timestamp`|да|Когато е настъпило задействащото събитие|

### `WebhookEventType`

Събития, получени от уеб кукички на доставчик на плащания, които задействат известия.

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

Стандартизиран резултат от обработката на уеб кукичка събитие.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Категории за уведомяване

Шаблонът задейства известия за тези категории събития:

|Категория|Задействащи събития|
|----------|---------------|
|**Плащане**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Абонамент**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Фактура**|`invoice_paid`, `invoice_payment_failed`|
|**Подаване**|Елемент одобрен, артикул отхвърлен, получено ново подаване|
|**Акаунт**|Паролата е сменена, имейлът е потвърден|

## Интегриране на имейл услуги

Известията се изпращат чрез класа `EmailNotificationService`:

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

Услугата проверява наличността на доставчика на имейл преди изпращане и връща резултат `skipped`, ако не е конфигуриран доставчик, предотвратявайки грешки по време на изпълнение в среди без настройка на имейл.

## Конфигурация на имейл доставчик

Доставката на известия зависи от имейл конфигурацията в `lib/config/schemas/email.schema.ts`:

|Доставчик|Изисква се Env Var|Автоматично активирано|
|----------|-----------------|--------------|
|Повторно изпращане|`RESEND_API_KEY`|Когато има ключ|
|нову|`NOVU_API_KEY`|Когато има ключ|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Когато и трите присъстват|

## Пример за използване

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

## Свързани типове

- [Видове плащане](./payment-types.md) -- `WebhookEventType` и изброяване на плащане
- [Типове абонамент](./subscription-types.md) -- събития от жизнения цикъл на абонамента
- [Типове конфигурации](./config-types.md) -- `EmailConfig` за настройки на доставчика
