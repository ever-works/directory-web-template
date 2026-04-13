---
id: stripe-subscription-deep-dive
title: Подробное описание подписки на Stripe
sidebar_label: Подписки на полосы
sidebar_position: 2
---

# Подробное описание подписки на Stripe

На этой странице описаны все маршруты управления подпиской: создание, обновление, отмена и базовые методы поставщика с примерами запросов и ответов.

## Обзор

API подписки обеспечивает полное управление жизненным циклом подписок Stripe. Он поддерживает создание подписок со способами оплаты и пробными периодами, обновление планов или настроек отмены, а также отмену подписок немедленно или в конце расчетного периода.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`POST`|`/api/stripe/subscription`|Требуется сеанс|Создать новую подписку|
|`PUT`|`/api/stripe/subscription`|Требуется сеанс|Обновить существующую подписку|
|`DELETE`|`/api/stripe/subscription`|Требуется сеанс|Отменить подписку|

## Создание подписки (POST)

### Тело запроса

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### Пример запроса

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### Как это работает

Обработчик маршрута выполняет следующие шаги:

1. Аутентифицирует пользователя через `auth()`
2. Разрешает или создает клиента Stripe через `stripeProvider.getCustomerId()`.
3. Вызов `stripeProvider.createSubscription()` с указанием идентификатора клиента, цены, способа оплаты, пробных дней и метаданных.

### Реализация поставщика

Внутри `StripeProvider.createSubscription()`:

```typescript
// Attach payment method to customer
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Set as default payment method
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Create the subscription
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Without trial: charge immediately
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Успешный ответ (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix timestamp
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix timestamp or null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." if available
}
```

## Обновление подписки (PUT)

### Тело запроса

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Required: subscription to update
  priceId?: string;                // New price ID (plan change)
  cancelAtPeriodEnd?: boolean;     // Schedule cancellation
}
```

### Пример запроса

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### Реализация поставщика

Метод `updateSubscription` обрабатывает изменения плана путем замены элемента подписки:

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

Он также поддерживает настройку `cancel_at_period_end`, `cancel_at` и обновление метаданных.

### Успешный ответ (200)

Возвращает ту же фигуру `SubscriptionInfo` с обновленными значениями.

## Отмена подписки (УДАЛЕНИЕ)

### Тело запроса

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Required: subscription to cancel
  cancelAtPeriodEnd?: boolean;      // true = cancel at period end, false = immediately
}
```

### Пример запроса

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Реализация поставщика

Логика отмены поддерживает две стратегии:

```typescript
if (cancelAtPeriodEnd) {
  // Soft cancel: subscription remains active until period ends
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Hard cancel: subscription ends immediately
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Успешный ответ (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## Сопоставление статуса подписки

Поставщик сопоставляет статусы Stripe внутреннему перечислению `SubscriptionStatus`:

|Статус полосы|Внутренний статус|
|---------------|-----------------|
|`incomplete`|`INCOMPLETE`|
|`incomplete_expired`|`INCOMPLETE_EXPIRED`|
|`trialing`|`TRIALING`|
|`active`|`ACTIVE`|
|`past_due`|`PAST_DUE`|
|`canceled`|`CANCELED`|
|`unpaid`|`UNPAID`|

## Отслеживание метаданных

Все операции подписки присоединяют `userId` из сеанса к метаданным подписки:

```typescript
metadata: {
  userId: session.user.id
}
```

Это позволяет обработчикам веб-перехватчиков согласовывать подписки с внутренними записями пользователей.

## Обработка ошибок

|Статус|Ошибка|Причина|
|--------|-------|-------|
| 400 |`Failed to create customer`|Разрешение клиента не удалось|
| 401 |`Unauthorized`|Нет аутентифицированного сеанса|
| 500 |`Failed to create subscription`|Ошибка Stripe API во время создания|
| 500 |`Failed to update subscription`|Ошибка Stripe API во время обновления|
| 500 |`Failed to cancel subscription`|Ошибка Stripe API во время отмены|

## Вопросы безопасности

- Все конечные точки подписки требуют аутентификации
- Прикрепление способа оплаты и настройка по умолчанию выполняются на стороне сервера.
- Флаг `off_session` устанавливается только для непробных подписок, чтобы включить автоматическое списание средств.
- Метаданные подписки всегда включают идентификатор аутентифицированного пользователя для аудита.
- В режиме разработки обновления подписки регистрируются только с неконфиденциальными полями.

## Похожие страницы

- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Подробное описание Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Подробное описание способов оплаты Stripe](./stripe-pay-methods-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
