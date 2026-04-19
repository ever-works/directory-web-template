---
id: stripe-subscription-deep-dive
title: Дълбоко потапяне в абонамента на Stripe
sidebar_label: Абонаменти за Stripe
sidebar_position: 2
---

# Дълбоко потапяне в абонамента на Stripe

Тази страница обхваща всички маршрути за управление на абонаменти: създаване, актуализиране, анулиране и основните методи на доставчика с примери за заявка/отговор.

## Преглед

API за абонамент осигурява пълно управление на жизнения цикъл за абонаменти за Stripe. Той поддържа създаване на абонаменти с методи на плащане и пробни периоди, актуализиране на планове или настройки за анулиране и анулиране на абонаменти веднага или в края на периода на фактуриране.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`POST`|`/api/stripe/subscription`|Изисква се сесия|Създайте нов абонамент|
|`PUT`|`/api/stripe/subscription`|Изисква се сесия|Актуализирайте съществуващ абонамент|
|`DELETE`|`/api/stripe/subscription`|Изисква се сесия|Отказ от абонамент|

## Създаване на абонамент (POST)

### Тяло на заявката

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### Примерна заявка

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

### Как работи

Манипулаторът на маршрута изпълнява следните стъпки:

1. Удостоверява потребителя чрез `auth()`
2. Разрешава или създава клиент на Stripe чрез `stripeProvider.getCustomerId()`
3. Обажда се на `stripeProvider.createSubscription()` с идентификация на клиента, цена, начин на плащане, пробни дни и метаданни

### Внедряване на доставчика

Вътре в `StripeProvider.createSubscription()`:

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

### Успешен отговор (200)

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

## Актуализиране на абонамент (PUT)

### Тяло на заявката

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Required: subscription to update
  priceId?: string;                // New price ID (plan change)
  cancelAtPeriodEnd?: boolean;     // Schedule cancellation
}
```

### Примерна заявка

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

### Внедряване на доставчика

Методът `updateSubscription` обработва промените в плана чрез замяна на абонаментния елемент:

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

Той също така поддържа настройка на `cancel_at_period_end`, `cancel_at` и актуализиране на метаданни.

### Успешен отговор (200)

Връща същата форма `SubscriptionInfo` с актуализираните стойности.

## Анулиране на абонамент (ИЗТРИВАНЕ)

### Тяло на заявката

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Required: subscription to cancel
  cancelAtPeriodEnd?: boolean;      // true = cancel at period end, false = immediately
}
```

### Примерна заявка

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Внедряване на доставчика

Логиката за анулиране поддържа две стратегии:

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

### Успешен отговор (200)

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

## Картографиране на състоянието на абонамента

Доставчикът картографира състоянията на Stripe към вътрешния `SubscriptionStatus` enum:

|Състояние на лентата|Вътрешен статус|
|---------------|-----------------|
|`incomplete`|`INCOMPLETE`|
|`incomplete_expired`|`INCOMPLETE_EXPIRED`|
|`trialing`|`TRIALING`|
|`active`|`ACTIVE`|
|`past_due`|`PAST_DUE`|
|`canceled`|`CANCELED`|
|`unpaid`|`UNPAID`|

## Проследяване на метаданни

Всички операции по абонамент прикачват `userId` от сесията към метаданни за абонамент:

```typescript
metadata: {
  userId: session.user.id
}
```

Това позволява на манипулаторите на webhook да съгласуват абонаменти с вътрешни потребителски записи.

## Обработка на грешки

|Статус|Грешка|причина|
|--------|-------|-------|
| 400 |`Failed to create customer`|Резолюцията на клиента е неуспешна|
| 401 |`Unauthorized`|Няма удостоверена сесия|
| 500 |`Failed to create subscription`|Грешка в API на Stripe по време на създаване|
| 500 |`Failed to update subscription`|Грешка в Stripe API по време на актуализация|
| 500 |`Failed to cancel subscription`|Грешка в API на Stripe по време на анулиране|

## Съображения за сигурност

- Всички крайни точки на абонамент изискват удостоверяване
- Прикачването на метода на плащане и настройката по подразбиране се извършват от страна на сървъра
- Флагът `off_session` е зададен само за непробни абонаменти, за да активира автоматично таксуване
- Метаданните за абонамента винаги включват ИД на удостоверения потребител за проверка
- В режим на разработка актуализациите на абонамента се регистрират само с нечувствителни полета

## Свързани страници

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Дълбоко гмуркане на Stripe Webhook](./stripe-webhook-deep-dive.md)
- [Задълбочено потапяне в методите на плащане на Stripe](./stripe-payment-methods-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
