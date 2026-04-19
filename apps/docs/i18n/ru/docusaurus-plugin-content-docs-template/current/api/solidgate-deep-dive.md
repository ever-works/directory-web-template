---
id: solidgate-deep-dive
title: Подробное описание Solidgate
sidebar_label: Солидгейт
sidebar_position: 7
---

# Подробное описание Solidgate

На этой странице описана полная интеграция с Solidgate, включая создание оформления заказа, обработку веб-перехватчика, проверку платежа и встроенную форму оплаты.

## Обзор

Solidgate — поставщик платежной инфраструктуры, который поддерживает как размещенные потоки оформления заказа, так и встраиваемый React SDK для встроенных форм оплаты. Интеграция создает платежные намерения через API Solidgate и поддерживает обработку событий на основе веб-перехватчиков с защитой идемпотентности. Solidgate использует HMAC-SHA512 для проверки подписи веб-перехватчика.

## Таблица маршрутов

|Метод|Путь|Авторизация|Описание|
|--------|------|------|-------------|
|`POST`|`/api/solidgate/checkout`|Требуется сеанс|Создайте сеанс оформления заказа/намерение платежа|
|`POST`|`/api/solidgate/webhook`|Требуется подпись|Обработка входящих событий вебхука|
|`GET`|`/api/solidgate/webhook`|Нет|Возвращает документацию по конечной точке|

## Создание оформления заказа (POST)

### Тело запроса

Конечная точка оформления заказа использует проверку Zod для строгой проверки ввода:

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Payment amount
  currency: z.string().default('USD'),         // Currency code
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // Redirect URL
  cancelUrl: z.string().url(),                 // Cancel URL
  metadata: z.record(z.string(), z.any()).optional()
});
```

### Пример запроса

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Как это работает

1. Аутентифицирует пользователя через `auth()`
2. Проверяет тело запроса по схеме Zod.
3. Решает или создает клиента Solidgate
4. Создает намерение платежа через Solidgate API.
5. Возвращает идентификатор платежа и секрет клиента для встроенного SDK.

### Реализация поставщика

Метод `createPaymentIntent` создает запрос API:

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Amount in cents
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### Успешный ответ (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

Поле `url` содержит идентификатор платежного намерения, используемый для инициализации Solidgate React SDK.

## Встроенная форма оплаты

Solidgate предоставляет React SDK для встроенных форм оплаты. Поставщик генерирует подпись для инициализации SDK:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

Метод `getUIComponents()` возвращает настроенную оболочку платежной формы:

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Обработка вебхука

### Проверка подписи

Solidgate использует HMAC-SHA512 для подписей веб-перехватчиков. Заголовок подписи может быть `x-signature` или `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

Поставщик проверяет подпись по необработанному телу:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Защита от идемпотентности

Конечная точка веб-перехватчика включает защиту идемпотентности в памяти для предотвращения дублирующей обработки:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Acknowledge without processing
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::примечание
В производственной бессерверной среде набор в памяти следует заменить Redis или таблицей базы данных для обеспечения идемпотентности между экземплярами.
:::

### Сопоставление событий

|Событие Солидгейт|Внутренний тип|
|----------------|---------------|
|`payment.succeeded` / `payment.completed`|`payment_succeeded`|
|`payment.failed` / `payment.declined`|`payment_failed`|
|`subscription.created`|`subscription_created`|
|`subscription.updated`|`subscription_updated`|
|`subscription.cancelled` / `subscription.canceled`|`subscription_cancelled`|
|`refund.processed` / `refund.completed`|`refund_succeeded`|

### Структура обработчика

Каждый обработчик делегирует `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

`WebhookSubscriptionService` инициализируется константой провайдера `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Проверка платежа

Провайдер поддерживает проверку платежей через Solidgate API:

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## Управление подпиской

### Создание подписок

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Returns SubscriptionInfo with mapped status
}
```

### Отмена подписок

Поддерживает как немедленную отмену, так и отмену в конце периода:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Обновление подписок

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## API-коммуникация

Все вызовы Solidgate API используют централизованный метод `makeApiRequest`:

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Error handling and JSON parsing
}
```

## Обработка ошибок

|Статус|Ошибка|Причина|
|--------|-------|-------|
| 400 |`Invalid request body`|Проверка Zod не удалась|
| 400 |`Invalid JSON`|Неверный формат тела запроса|
| 400 |`Failed to create customer`|Разрешение клиента не удалось|
| 400 |`No signature provided`|У вебхука отсутствует подпись|
| 400 |`Webhook not processed`|Проверка подписи не удалась|
| 401 |`Unauthorized`|Нет аутентифицированного сеанса|
| 500 |`Failed to create checkout session`|Ошибка API Solidgate|

Ошибки проверки Zod возвращают подробные сообщения на уровне поля:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Требования к конфигурации

|Переменная|Требуется|Описание|
|----------|----------|-------------|
|`SOLIDGATE_API_KEY`|Да|API-ключ Solidgate|
|`SOLIDGATE_SECRET_KEY`|Да|Секретный ключ для генерации подписи|
|`SOLIDGATE_WEBHOOK_SECRET`|Да|Секрет подписи вебхука|
|`SOLIDGATE_PUBLISHABLE_KEY`|Да|Публикуемый ключ для React SDK|
|`SOLIDGATE_MERCHANT_ID`|Да|Идентификатор продавца|
|`SOLIDGATE_API_BASE_URL`|Нет|Базовый URL-адрес API (по умолчанию: `https://api.solidgate.com/v1`)|

## Вопросы безопасности

- HMAC-SHA512 используется как для веб-перехватчика, так и для проверки подписи платежного намерения.
- Секретный ключ и секрет вебхука никогда не раскрываются клиенту.
- Защита идемпотентности предотвращает дублирование обработки веб-перехватчиков
- Проверка Zod обеспечивает строгую проверку ввода на конечной точке оформления заказа.
- Трассировки стека ошибок включены только в режиме разработки.
- Утилита `safeErrorMessage` очищает сообщения об ошибках для производства.

## Похожие страницы

- [Подробное описание Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Глубокий обзор LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Полярное глубокое погружение](./polar-deep-dive.md)
- [Архитектура платежного провайдера](./pay-provider-architecture.md)
