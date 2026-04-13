---
id: stripe-webhook-deep-dive
title: Подробное описание Stripe Webhook
sidebar_label: Полосатые вебхуки
sidebar_position: 4
---

# Подробное описание Stripe Webhook

На этой странице описывается обработка событий веб-перехватчика, проверка подписи, поддерживаемые типы событий, уведомления по электронной почте и шаблоны обработки ошибок.

## Обзор

Конечная точка веб-перехватчика Stripe обрабатывает входящие события из Stripe, проверяет их подлинность посредством проверки подписи, сопоставляет их с внутренними типами событий и отправляет их специализированным обработчикам. Каждый обработчик обновляет базу данных через `WebhookSubscriptionService` и отправляет транзакционные электронные письма.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`POST`|`/api/stripe/webhook`|Полоса подпись|Обработка входящих событий веб-перехватчика Stripe|

## Проверка подписи

Каждый входящий вебхук должен включать заголовок `stripe-signature`. Провайдер проверяет это с помощью метода `constructEvent` Stripe:

```typescript
const event = this.stripe.webhooks.constructEvent(
  payload,
  signature,
  this.webhookSecret
);
```

Если подпись отсутствует, конечная точка возвращает `400`:

```json
{ "error": "No signature provided" }
```

Если подпись недействительна, вызов `constructEvent` генерируется и конечная точка возвращает значение:

```json
{ "error": "Webhook processing failed" }
```

## Сопоставление типов событий

Типы событий полосы сопоставляются с внутренними значениями `WebhookEventType`:

|Полосатое событие|Внутренний тип|Обработчик|
|-------------|---------------|---------|
|`customer.subscription.created`|`SUBSCRIPTION_CREATED`|`handleSubscriptionCreated`|
|`customer.subscription.updated`|`SUBSCRIPTION_UPDATED`|`handleSubscriptionUpdated`|
|`customer.subscription.deleted`|`SUBSCRIPTION_CANCELLED`|`handleSubscriptionCancelled`|
|`invoice.payment_succeeded`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`handleSubscriptionPaymentSucceeded`|
|`invoice.payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|`handleSubscriptionPaymentFailed`|
|`payment_intent.succeeded`|`PAYMENT_SUCCEEDED`|`handlePaymentSucceeded`|
|`payment_intent.payment_failed`|`PAYMENT_FAILED`|`handlePaymentFailed`|
|`customer.subscription.trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|`handleSubscriptionTrialEnding`|
|`billing_portal.session.updated`|`BILLING_PORTAL_SESSION_UPDATED`|Только зарегистрированные|

## Процесс обработки вебхука

```
Stripe sends POST -> Read raw body -> Extract stripe-signature header
  -> stripeProvider.handleWebhook(body, signature)
    -> stripe.webhooks.constructEvent() (signature verification)
    -> Map event type to internal type
    -> Return { received: true, type, id, data }
  -> Switch on webhookResult.type
    -> Call appropriate handler
    -> Handler updates DB + sends email
  -> Return { received: true }
```

## Обработчики событий

### Подписка создана

Обрабатывает создание новой подписки:

1. Проверяет, является ли подписка спонсорской рекламой (специальная обработка).
2. Вызывает `webhookSubscriptionService.handleSubscriptionCreated(data)` для обновления базы данных.
3. Извлекает информацию о плане (имя, сумма, расчетный период)
4. Отправляет приветственное письмо с подробностями и функциями подписки.

### Подписка обновлена

Обрабатывает изменения подписки (обновление плана, понижение версии и т. д.):

1. Обновляет базу данных через `webhookSubscriptionService.handleSubscriptionUpdated(data)`
2. Извлекает обновленную информацию о плане
3. Отправляет электронное письмо с уведомлением об обновлении

### Подписка отменена

Обрабатывает отмену подписки:

1. Проверяет подписки на спонсорскую рекламу
2. Обновляет базу данных через `webhookSubscriptionService.handleSubscriptionCancelled(data)`
3. Отправляет электронное письмо об отмене с указанием причины отмены и URL-адреса повторной активации.

### Платеж прошел (однократно)

Обрабатывает успешные разовые платежи:

1. Извлекает информацию о клиенте и платежные реквизиты
2. Форматирует сумму и способ оплаты.
3. Отправляет электронное письмо с подтверждением платежа и URL-адресом квитанции.

### Платеж не выполнен

Обрабатывает невыполненные разовые платежи:

1. Извлекает информацию об ошибках из `last_payment_error`
2. Создает URL-адреса повторной попытки и обновления способа оплаты.
3. Отправляет электронное письмо с уведомлением об ошибке платежа

### Оплата подписки прошла успешно

Обрабатывает успешные регулярные платежи по подписке:

1. Обновляет базу данных через `webhookSubscriptionService.handleSubscriptionPaymentSucceeded(data)`
2. Извлекает информацию о счете и подписке
3. Отправляет электронное письмо с квитанцией об оплате подписки

### Оплата подписки не удалась

Обрабатывает неудачные регулярные платежи по подписке:

1. Обновляет базу данных через `webhookSubscriptionService.handleSubscriptionPaymentFailed(data)`
2. Отправляет уведомление об ошибке с URL-адресами повторной попытки и обновления платежа.

### Пробная концовка

Обрабатывает уведомления об окончании 3-дневной пробной версии от Stripe:

1. Обновляет базу данных через `webhookSubscriptionService.handleSubscriptionTrialEnding(data)`
2. Отправляет электронное письмо с напоминанием об окончании пробного периода.

## Уведомления по электронной почте

Каждый обработчик использует `paymentEmailService` для отправки транзакционных электронных писем. Конфигурация электронной почты безопасно загружается через `getEmailConfig()`:

```typescript
function createEmailData(baseData: any, emailConfig: ReturnType<typeof getEmailConfig>) {
  return {
    ...baseData,
    companyName: emailConfig.companyName,
    companyUrl: emailConfig.companyUrl,
    supportEmail: emailConfig.supportEmail
  };
}
```

|Событие|Шаблон электронной почты|
|-------|---------------|
|Подписка создана|`sendNewSubscriptionEmail`|
|Подписка обновлена|`sendUpdatedSubscriptionEmail`|
|Подписка отменена|`sendCancelledSubscriptionEmail`|
|Платеж прошел успешно|`sendPaymentSuccessEmail`|
|Платеж не выполнен|`sendPaymentFailedEmail`|
|Оплата подписки прошла успешно|`sendSubscriptionPaymentSuccessEmail`|
|Оплата подписки не удалась|`sendSubscriptionPaymentFailedEmail`|
|Окончание пробной версии|`sendUpdatedSubscriptionEmail`|

## Обработка спонсорской рекламы

Вебхук включает специальную обработку подписок на спонсорскую рекламу. Они идентифицируются путем проверки метаданных:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const metadata = data.metadata as Record<string, string> | undefined;
  return metadata?.type === 'sponsor_ad';
}
```

Спонсорские рекламные события вызывают:
- **Активация**: подтверждает оплату и отправляет объявление на рассмотрение администратора.
- **Отмена**: деактивирует рекламу спонсора.
- **Продление**: продлевает дату окончания спонсорской рекламы.

## Особенности плана

Функция `getSubscriptionFeatures` сопоставляет названия планов со списками функций, используемыми в приветственных письмах:

```typescript
const features: Record<string, string[]> = {
  'Free Plan': ['Access to basic features', 'Email support', 'Limited storage'],
  'Standard Plan': ['All advanced features', 'Priority support', 'Unlimited storage', ...],
  'Premium Plan': ['All Pro features', 'Dedicated support', 'Custom features', ...]
};
```

## Обработка ошибок

Конечная точка веб-перехватчика соответствует гибкому шаблону:

- Каждый отдельный обработчик заключен в собственный блок try/catch.
- Сбои обработчика регистрируются, но не приводят к тому, что веб-перехватчик возвращает ошибку.
- Внешний try/catch перехватывает ошибки проверки подписи и синтаксического анализа.
- Возвращает `400` для всех сбоев на уровне веб-перехватчика, чтобы указать Stripe не повторять попытки в случае постоянных ошибок.

```typescript
try {
  // ... signature verification and event dispatch
  return NextResponse.json({ received: true });
} catch (error) {
  console.error('Webhook error:', error);
  return NextResponse.json({ error: 'Webhook processing failed' }, { status: 400 });
}
```

## Требования к конфигурации

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`STRIPE_SECRET_KEY`|Да|Секретный API-ключ Stripe|
|`STRIPE_WEBHOOK_SECRET`|Да|Секрет подписи вебхука (из панели управления Stripe)|

Чтобы настроить вебхук в Stripe Dashboard:

1. Перейдите в раздел «Разработчики» > «Вебхуки».
2. Добавьте URL-адрес конечной точки: `https://yourdomain.com/api/stripe/webhook`
3. Выберите события, перечисленные в таблице сопоставления событий выше.
4. Скопируйте секрет подписи на адрес `STRIPE_WEBHOOK_SECRET`.

## Вопросы безопасности

- Проверка подписи обязательна; запросы без действительных подписей отклоняются
- Необработанное тело запроса используется для проверки подписи (не анализируемый JSON).
- Секреты Webhook никогда не должны передаваться в систему контроля версий.
- Конечная точка не требует аутентификации сеанса (Stripe вызывает ее напрямую)
- Конфиденциальные данные в сообщениях об ошибках очищаются для использования в производственных средах.

## Похожие страницы

- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Подробный обзор подписки Stripe](./stripe-subscription-deep-dive.md)
- [Подробное описание способов оплаты Stripe](./stripe-pay-methods-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
