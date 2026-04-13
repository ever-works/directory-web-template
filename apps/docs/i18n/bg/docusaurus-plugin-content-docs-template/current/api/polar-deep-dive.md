---
id: polar-deep-dive
title: Полярно дълбоко гмуркане
sidebar_label: Полярен
sidebar_position: 6
---

# Полярно дълбоко гмуркане

Тази страница обхваща пълната интеграция на Polar, включително създаване на плащане, управление на абонаменти, портал за клиенти и обработка на webhook.

## Преглед

Polar е модерна платежна платформа, предназначена за софтуер и цифрови продукти. Интеграцията поддържа както еднократни плащания, така и абонаменти чрез системата за плащане на Polar, с управлявано от webhook управление на жизнения цикъл. Polar използва продукти с обхват на организация и `@polar-sh/sdk` за API взаимодействия.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`POST`|`/api/polar/checkout`|Изисква се сесия|Създайте сесия за плащане (абонаментна или еднократна)|
|`GET`|`/api/polar/checkout`|Изисква се сесия|Извличане на състоянието на сесията за плащане|
|`POST`|`/api/polar/webhook`|Изисква се подпис|Обработка на входящи уеб кукички събития|

## Създаване на Checkout (POST)

### Тяло на заявката

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Примерна заявка

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Как работи

Маршрутът за плащане обработва два потока:

**Режим на абонамент:**
1. Удостоверява потребителя и разрешава клиента на Polar
2. Дезинфекцира метаданните (премахва стойностите `undefined` -- Polar ги отхвърля)
3. Извиква `polarProvider.createSubscription()`, което създава сесия за плащане
4. Връща URL адреса за плащане от резултата от абонамента

**Режим на еднократно плащане:**
1. Удостоверява потребителя и разрешава клиента на Polar
2. Използва Polar SDK директно за създаване на плащане
3. Връща URL адреса за плащане

### Дезинфекция на метаданни

Polar изисква всички стойности на метаданни да не са нулеви и недефинирани:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Only include defined values
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Успешен отговор (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Извличане на сесия за плащане (GET)

### Параметри на заявката

|Параметър|Задължително|Описание|
|-----------|----------|-------------|
|`checkout_id`|да|ID на сесията за плащане на Polar|

### Успешен отговор (200)

```json
{
  "checkout": { "...full Polar checkout object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Управление на абонаменти

### Създаване на абонаменти

Методът `PolarProvider.createSubscription()` създава плащане за абонамента:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Анулиране на абонаменти

Polar поддържа две стратегии за анулиране:

```typescript
// Cancel at period end (soft cancel)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Cancel immediately (hard cancel)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

Доставчикът потвърждава състоянието на абонамента преди анулиране:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Повторно активиране на абонаменти

Планираните за анулиране абонаменти могат да бъдат активирани отново:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Актуализиране на абонаменти

Промените в плана се обработват чрез `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Обработка на уеб кукичка

### Проверка на подписа

Polar използва функцията `@polar-sh/sdk/webhooks` `validateEvent` за проверка. Уеб кукичката изисква три заглавки:

|Заглавка|Описание|
|--------|-------------|
|`webhook-signature`|HMAC SHA256 подпис (формат: `v1,<hex_signature>`)|
|`webhook-timestamp`|Unix времева маркировка на събитието|
|`webhook-id`|Уникален ID за доставка на уебкукичка|

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Parsed JSON
  signatureHeader, // Full "v1,..." signature
  bodyText,        // Raw body for verification
  timestampHeader,
  webhookIdHeader
);
```

### Видове събития

|Полярно събитие|Вътрешно картографиране|
|-------------|-----------------|
|`checkout.succeeded`|Плащането е успешно|
|`checkout.failed`|Неуспешно плащане|
|`subscription.created`|Абонаментът е създаден|
|`subscription.updated`|Абонаментът е актуализиран|
|`subscription.canceled`|Абонаментът е анулиран|
|`invoice.paid`|Плащането на абонамента е успешно|
|`invoice.payment_failed`|Плащането на абонамента е неуспешно|

### Webhook рутер

Събитията се изпращат чрез специален рутер модул:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

Рутерът картографира типовете събития към функциите на манипулатора, които актуализират базата данни чрез `WebhookSubscriptionService` и изпращат известия по имейл.

### Валидиране на полезния товар

Крайната точка на webhook валидира структурата на полезния товар преди обработка:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Управление на клиенти

Доставчикът следва стандартния модел за разрешаване на проблеми в три стъпки:

1. Проверете потребителските метаданни за идентификатора на клиента на Polar
2. Направете заявка към `PaymentAccount` таблицата на базата данни
3. Създайте нов клиент чрез Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Обработка на грешки

|Статус|Грешка|причина|
|--------|-------|-------|
| 400 |`Product ID is required`|Липсва `productId` в заявката|
| 400 |`Checkout ID is required`|Липсва GET заявка `checkout_id`|
| 400 |`No signature provided`|Уеб кукичката липсва заглавка на подпис|
| 401 |`Unauthorized`|Няма удостоверена сесия|
| 500 |`Failed to create checkout`|URL адресът за плащане не е наличен|
| 500 |`Configuration error`|Доставчикът на Polar не е конфигуриран|
| 503 |Настройката на плащането е незавършена|Организацията не е завършила настройката на плащането в Polar|

Крайната точка за плащане включва специално откриване за грешки при настройка на плащане:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Изисквания за конфигурация

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`POLAR_ACCESS_TOKEN`|да|Polar API токен за достъп|
|`POLAR_WEBHOOK_SECRET`|да|Тайно подписване на уеб кукичка|
|`POLAR_ORGANIZATION_ID`|да|ID на полярна организация|

## Съображения за сигурност

- Подписите на Webhook се проверяват с помощта на функцията `validateEvent` от официалния SDK
- Необработеният основен текст се запазва за проверка на подписа (JSON повторната сериализация може да промени основния текст)
- Проверяват се три отделни заглавки: подпис, клеймо за време и ID на уеб кукичката
- Метаданните се дезинфекцират от страната на сървъра, за да се предотврати инжектирането на недефинирани стойности
- Отговорите за грешка използват `safeErrorResponse` за предотвратяване на изтичане на информация

## Свързани страници

- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
