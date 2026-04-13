---
id: lemonsqueezy-deep-dive
title: LemonSqueezy Deep Dive
sidebar_label: LemonSqueezy
sidebar_position: 5
---

# LemonSqueezy Deep Dive

Тази страница обхваща пълната интеграция на LemonSqueezy, включително създаване на плащане, управление на абонаменти, обработка на webhook и синхронизиране на продукти.

## Преглед

LemonSqueezy е регистриран търговец на плащания, който се занимава със събирането на данъци, спазването и обработката на плащанията. Интеграцията използва хоствания поток на плащане на LemonSqueezy, продуктов модел, базиран на варианти, и система за уеб кукичка. За разлика от Stripe, LemonSqueezy не поддържа намерения за настройка или директно управление на методите на плащане - всички плащания се обработват чрез техния хостван потребителски интерфейс.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|Изисква се сесия|Създайте сесия за плащане от тялото на JSON|
|`GET`|`/api/lemonsqueezy/checkout`|Няма|Създайте сесия за плащане от параметри на заявката|
|`POST`|`/api/lemonsqueezy/webhook`|Изисква се подпис|Обработка на входящи уеб кукички събития|

## Създаване на Checkout (POST)

### Тяло на заявката

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### Примерна заявка

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### Как работи

1. Удостоверява потребителя чрез `auth()`
2. Потвърждава тялото на заявката с помощта на `validateCheckoutRequestBody()`
3. Извиква `lemonsqueezyProvider.createCustomCheckout()` с потребителски метаданни
4. Връща URL адреса за плащане

### Внедряване на доставчика

Методът `createCustomCheckout` създава LemonSqueezy плащане с цялостна конфигурация:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Успешен отговор (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Плащане чрез параметри на заявката (GET)

Крайната точка GET поддържа създаване на проверки чрез параметри на заявка за сценарии с директна връзка:

|Параметър|Задължително|Описание|
|-----------|----------|-------------|
|`variantId`|да|ID на варианта на LemonSqueezy|
|`email`|да|Имейл на клиента|
|`customPrice`|не|Персонализирана цена в центове|
|`metadata`|не|JSON низ от метаданни|

## Управление на абонаменти

### Създаване на абонаменти

Абонаментите се създават чрез потока на плащане. Методът `createSubscription` обвива API за плащане на LemonSqueezy:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Анулиране на абонаменти

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Актуализиране на абонаменти

Методът за актуализиране поддържа промени в плана, пауза, възобновяване и повторно активиране:

```typescript
// Plan change via variant ID
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Pause subscription
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Resume subscription
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Обработка на уеб кукичка

### Проверка на подписа

LemonSqueezy използва HMAC SHA-256 за проверка на подпис на webhook. Доставчикът проверява подписите с помощта на Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Картографиране на събития

|Събитие LemonSqueezy|Вътрешен тип|
|-------------------|---------------|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

### Структура на манипулатора на уеб кукичка

Всеки манипулатор следва последователен модел:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Откриване на реклами на спонсори

LemonSqueezy използва `custom_data` вместо `metadata` на Stripe:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Управление на клиенти

Доставчикът следва същия тристепенен модел за разрешаване на проблеми с клиенти като другите доставчици:

1. Проверете потребителските метаданни за `lemonsqueezy_customer_id`
2. Направете заявка към `PaymentAccount` таблицата на базата данни
3. Създайте нов клиент чрез LemonSqueezy API

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Обработка на грешки

|Статус|Код на грешка|причина|
|--------|-----------|-------|
| 400 |`VALIDATION_ERROR`|Невалиден текст или параметри на заявката|
| 401 |`Unauthorized`|Няма удостоверена сесия|
| 500 |`CONFIGURATION_ERROR`|Липсващи променливи на средата|
| 500 |`INTERNAL_ERROR`|Необработена грешка|
| 503 |`PAYMENT_SERVICE_ERROR`|API на LemonSqueezy не е наличен|

## Изисквания за конфигурация

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|да|LemonSqueezy API ключ|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|да|Тайно подписване на уеб кукичка|
|`LEMONSQUEEZY_STORE_ID`|да|Цифров идентификатор на магазина|

## Ограничения

- **Няма намерения за настройка**: LemonSqueezy не поддържа запазване на карти без покупка. Методът `createSetupIntent` извежда грешка.
- **Без API за директно възстановяване на средства**: Възстановяванията трябва да се обработват чрез таблото за управление на LemonSqueezy.
- **Ценообразуване въз основа на варианти**: Продуктите използват идентификатори на варианти вместо идентификатори на цена. Промените в плана използват `variantId`.

## Съображения за сигурност

- Подписите на Webhook се проверяват с помощта на HMAC SHA-256
- Необработеният основен текст се използва за проверка на подписа, за да се предотвратят проблеми с повторното сериализиране на JSON
- API ключовете никога не се излагат на клиента
- Регистрирането в режим на разработка дезинфекцира PII (имейл адресите са частично редактирани)

## Свързани страници

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [Полярно дълбоко гмуркане](./polar-deep-dive.md)
- [Solidgate Deep Dive](./solidgate-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
