---
id: notification-types
title: Определения типов уведомлений
sidebar_label: Типы уведомлений
sidebar_position: 14
---

# Определения типов уведомлений

**Источник:** `lib/services/email-notification.service.ts`, `lib/payment/services/payment-email.service.ts`, `lib/payment/types/payment-types.ts`

Уведомления в шаблоне в основном отправляются по электронной почте и инициируются системными событиями, такими как завершение платежа, изменение подписки и проверка отправки.

## Интерфейсы

### `EmailNotificationData`

Основная полезная нагрузка для отправки уведомлений администратору по электронной почте.

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

|Поле|Требуется|Описание|
|-------|----------|-------------|
|`to`|Да|Адрес электронной почты получателя|
|`title`|Да|Тема письма и внутренний заголовок.|
|`message`|Да|Основной текст уведомления|
|`actionUrl`|Нет|Ссылка на кнопку призыва к действию|
|`actionText`|Нет|Текст метки для кнопки CTA|
|`notificationType`|Да|Используется для выбора варианта шаблона электронного письма.|
|`timestamp`|Да|Когда произошло триггерное событие|

### `WebhookEventType`

События, полученные от веб-перехватчиков поставщика платежей, которые вызывают уведомления.

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

Стандартизированный результат обработки события веб-перехватчика.

```typescript
interface WebhookResult {
  received: boolean;  // Whether the webhook was accepted
  type: string;       // Event type identifier
  id: string;         // Provider event ID
  data?: any;         // Parsed event payload
}
```

## Категории уведомлений

Шаблон запускает уведомления для следующих категорий событий:

|Категория|Триггерные события|
|----------|---------------|
|**Оплата**|`payment_succeeded`, `payment_failed`, `refund_succeeded`|
|**Подписка**|`subscription_created`, `subscription_cancelled`, `subscription_trial_ending`|
|**Счет**|`invoice_paid`, `invoice_payment_failed`|
|**Отправка**|Товар одобрен, товар отклонен, получена новая заявка|
|**Аккаунт**|Пароль изменен, адрес электронной почты подтвержден.|

## Интеграция службы электронной почты

Уведомления отправляются через класс `EmailNotificationService`:

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

Служба проверяет доступность поставщика электронной почты перед отправкой и возвращает результат `skipped`, если ни один поставщик не настроен, предотвращая ошибки во время выполнения в средах без настройки электронной почты.

## Конфигурация поставщика электронной почты

Доставка уведомлений зависит от конфигурации электронной почты в `lib/config/schemas/email.schema.ts`:

|Поставщик|Обязательная переменная окружения|Автоматически включено|
|----------|-----------------|--------------|
|Отправить повторно|`RESEND_API_KEY`|Когда ключ присутствует|
|Нову|`NOVU_API_KEY`|Когда ключ присутствует|
|SMTP|`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`|Когда присутствуют все трое|

## Пример использования

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

## Связанные типы

- [Типы платежей](./pay-types.md) -- `WebhookEventType` и перечисления платежей
- [Типы подписки](./subscription-types.md) – события жизненного цикла подписки.
- [Типы конфигураций](./config-types.md) -- `EmailConfig` для настроек провайдера
