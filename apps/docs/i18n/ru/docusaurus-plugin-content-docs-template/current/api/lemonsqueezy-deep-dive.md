---
id: lemonsqueezy-deep-dive
title: LemonSqueezy: глубокое погружение
sidebar_label: ЛимонСжатый
sidebar_position: 5
---

# LemonSqueezy: глубокое погружение

На этой странице описана полная интеграция LemonSqueezy, включая создание оформления заказа, управление подписками, обработку веб-перехватчиков и синхронизацию продуктов.

## Обзор

LemonSqueezy — это зарегистрированный поставщик платежных услуг, который занимается сбором налогов, соблюдением требований и обработкой платежей. В интеграции используется размещенный процесс оформления заказа LemonSqueezy, модель продукта на основе вариантов и система веб-перехватчиков. В отличие от Stripe, LemonSqueezy не поддерживает намерения настройки или прямое управление способами оплаты — вся обработка платежей происходит через размещенный на их сервере пользовательский интерфейс.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`POST`|`/api/lemonsqueezy/checkout`|Требуется сеанс|Создать сеанс оформления заказа из тела JSON|
|`GET`|`/api/lemonsqueezy/checkout`|Нет|Создать сеанс оформления заказа на основе параметров запроса|
|`POST`|`/api/lemonsqueezy/webhook`|Требуется подпись|Обработка входящих событий вебхука|

## Создание оформления заказа (POST)

### Тело запроса

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### Пример запроса

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

### Как это работает

1. Аутентифицирует пользователя через `auth()`
2. Проверяет тело запроса, используя `validateCheckoutRequestBody()`.
3. Вызов `lemonsqueezyProvider.createCustomCheckout()` с метаданными пользователя
4. Возвращает URL-адрес оформления заказа

### Реализация поставщика

Метод `createCustomCheckout` создает кассу LemonSqueezy с комплексной настройкой:

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

### Успешный ответ (200)

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

## Оформление заказа через параметры запроса (GET)

Конечная точка GET поддерживает создание извлечений с помощью параметров запроса для сценариев прямой ссылки:

|Параметр|Требуется|Описание|
|-----------|----------|-------------|
|`variantId`|Да|Идентификатор варианта LemonSqueezy|
|`email`|Да|Электронная почта клиента|
|`customPrice`|Нет|Индивидуальная цена в центах|
|`metadata`|Нет|Строка метаданных JSON|

## Управление подпиской

### Создание подписок

Подписки создаются в процессе оформления заказа. Метод `createSubscription` оборачивает API оформления заказа LemonSqueezy:

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

### Отмена подписок

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

### Обновление подписок

Метод обновления поддерживает изменения плана, приостановку, возобновление и повторную активацию:

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

## Обработка вебхука

### Проверка подписи

LemonSqueezy использует HMAC SHA-256 для проверки подписи веб-перехватчика. Провайдер проверяет подписи с помощью Web Crypto API:

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

### Сопоставление событий

|Событие LemonSqueezy|Внутренний тип|
|-------------------|---------------|
|`subscription_created`|`SUBSCRIPTION_CREATED`|
|`subscription_updated`|`SUBSCRIPTION_UPDATED`|
|`subscription_cancelled`|`SUBSCRIPTION_CANCELLED`|
|`subscription_payment_success`|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|
|`subscription_payment_failed`|`SUBSCRIPTION_PAYMENT_FAILED`|
|`subscription_trial_will_end`|`SUBSCRIPTION_TRIAL_ENDING`|
|`order_created`|`PAYMENT_SUCCEEDED`|
|`order_refunded`|`REFUND_SUCCEEDED`|

### Структура обработчика веб-перехватчика

Каждый обработчик следует единому шаблону:

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

### Обнаружение спонсорской рекламы

LemonSqueezy использует `custom_data` вместо `metadata` Stripe:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Управление клиентами

Поставщик следует той же трехэтапной схеме решения проблем с клиентами, что и другие поставщики:

1. Проверьте метаданные пользователя для `lemonsqueezy_customer_id`
2. Запросить таблицу базы данных `PaymentAccount`
3. Создайте нового клиента через API LemonSqueezy.

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Обработка ошибок

|Статус|Код ошибки|Причина|
|--------|-----------|-------|
| 400 |`VALIDATION_ERROR`|Неверное тело или параметры запроса.|
| 401 |`Unauthorized`|Нет аутентифицированного сеанса|
| 500 |`CONFIGURATION_ERROR`|Отсутствуют переменные среды|
| 500 |`INTERNAL_ERROR`|Необработанная ошибка|
| 503 |`PAYMENT_SERVICE_ERROR`|API LemonSqueezy недоступен.|

## Требования к конфигурации

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`LEMONSQUEEZY_API_KEY`|Да|API-ключ LemonSqueezy|
|`LEMONSQUEEZY_WEBHOOK_SECRET`|Да|Секрет подписи вебхука|
|`LEMONSQUEEZY_STORE_ID`|Да|Числовой идентификатор магазина|

## Ограничения

- **Нет намерений установки**: LemonSqueezy не поддерживает сохранение карт без покупки. Метод `createSetupIntent` выдает ошибку.
- **Нет API прямого возврата**. Возвраты должны осуществляться через панель управления LemonSqueezy.
- **Ценообразование на основе вариантов**. В продуктах используются идентификаторы вариантов вместо идентификаторов цен. Для изменения плана используйте `variantId`.

## Вопросы безопасности

- Подписи вебхуков проверяются с помощью HMAC SHA-256.
- Необработанный основной текст используется для проверки подписи, чтобы предотвратить проблемы повторной сериализации JSON.
- Ключи API никогда не предоставляются клиенту
- Ведение журнала в режиме разработки очищает личные данные (адреса электронной почты частично отредактированы)

## Похожие страницы

- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Полярное глубокое погружение](./polar-deep-dive.md)
- [Подробное описание Solidgate](./solidgate-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
