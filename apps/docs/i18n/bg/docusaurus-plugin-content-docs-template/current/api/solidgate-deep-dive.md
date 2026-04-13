---
id: solidgate-deep-dive
title: Solidgate Deep Dive
sidebar_label: Solidgate
sidebar_position: 7
---

# Solidgate Deep Dive

Тази страница обхваща пълната интеграция на Solidgate, включително създаване на плащане, обработка на webhook, проверка на плащане и вграден формуляр за плащане.

## Преглед

Solidgate е доставчик на платежна инфраструктура, който поддържа както хоствани потоци на плащане, така и вграден React SDK за вградени платежни форми. Интеграцията създава намерения за плащане чрез API на Solidgate и поддържа обработка на събития, управлявана от webhook, със защита на идемпотентност. Solidgate използва HMAC-SHA512 за проверка на подпис на webhook.

## Таблица с маршрути

|Метод|Пътека|авт|Описание|
|--------|------|------|-------------|
|`POST`|`/api/solidgate/checkout`|Изисква се сесия|Създайте сесия за плащане / намерение за плащане|
|`POST`|`/api/solidgate/webhook`|Изисква се подпис|Обработка на входящи уеб кукички събития|
|`GET`|`/api/solidgate/webhook`|Няма|Връща документация за крайна точка|

## Създаване на Checkout (POST)

### Тяло на заявката

Крайната точка на плащане използва Zod валидиране за стриктна проверка на входа:

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

### Примерна заявка

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

### Как работи

1. Удостоверява потребителя чрез `auth()`
2. Валидира тялото на заявката със схема на Zod
3. Разрешава или създава клиент на Solidgate
4. Създава намерение за плащане чрез API на Solidgate
5. Връща идентификатора на плащане и тайната на клиента за вградения SDK

### Внедряване на доставчика

Методът `createPaymentIntent` конструира API заявката:

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

### Успешен отговор (200)

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

Полето `url` съдържа идентификатора на намерението за плащане, използван за инициализиране на Solidgate React SDK.

## Вграден формуляр за плащане

Solidgate предоставя React SDK за вградени форми за плащане. Доставчикът генерира подпис за SDK инициализация:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

Методът `getUIComponents()` връща конфигурирана обвивка на формуляр за плащане:

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

## Обработка на уеб кукичка

### Проверка на подписа

Solidgate използва HMAC-SHA512 за сигнатури на webhook. Заглавката на подписа може да бъде `x-signature` или `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

Доставчикът проверява подписа спрямо необработеното тяло:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Защита от идемпотентност

Крайната точка на webhook включва защита от идемпотентност в паметта за предотвратяване на дублирана обработка:

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

:::бележка
В производствена среда без сървър, наборът в паметта трябва да бъде заменен с Redis или таблица на база данни за идемпотентност между екземпляри.
:::

### Картографиране на събития

|Събитие Solidgate|Вътрешен тип|
|----------------|---------------|
|`payment.succeeded` / `payment.completed`|`payment_succeeded`|
|`payment.failed` / `payment.declined`|`payment_failed`|
|`subscription.created`|`subscription_created`|
|`subscription.updated`|`subscription_updated`|
|`subscription.cancelled` / `subscription.canceled`|`subscription_cancelled`|
|`refund.processed` / `refund.completed`|`refund_succeeded`|

### Структура на манипулатора

Всеки манипулатор делегира на `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

`WebhookSubscriptionService` се инициализира с константата на доставчика `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Проверка на плащането

Доставчикът поддържа проверка на плащания чрез Solidgate API:

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

## Управление на абонаменти

### Създаване на абонаменти

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

### Анулиране на абонаменти

Поддържа както незабавно, така и анулиране в края на периода:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Актуализиране на абонаменти

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## API комуникация

Всички извиквания на API на Solidgate използват централизиран метод `makeApiRequest`:

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

## Обработка на грешки

|Статус|Грешка|причина|
|--------|-------|-------|
| 400 |`Invalid request body`|Проверката на Zod не бе успешна|
| 400 |`Invalid JSON`|Неправилно образувано тяло на заявката|
| 400 |`Failed to create customer`|Резолюцията на клиента е неуспешна|
| 400 |`No signature provided`|Липсва подпис на уеб кукичката|
| 400 |`Webhook not processed`|Неуспешна проверка на подписа|
| 401 |`Unauthorized`|Няма удостоверена сесия|
| 500 |`Failed to create checkout session`|Грешка в API на Solidgate|

Грешките при проверка на Zod връщат подробни съобщения на ниво поле:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Изисквания за конфигурация

|Променлива|Задължително|Описание|
|----------|----------|-------------|
|`SOLIDGATE_API_KEY`|да|API ключ на Solidgate|
|`SOLIDGATE_SECRET_KEY`|да|Таен ключ за генериране на подпис|
|`SOLIDGATE_WEBHOOK_SECRET`|да|Тайно подписване на уеб кукичка|
|`SOLIDGATE_PUBLISHABLE_KEY`|да|Ключ за публикуване за React SDK|
|`SOLIDGATE_MERCHANT_ID`|да|Идентификатор на търговеца|
|`SOLIDGATE_API_BASE_URL`|не|Основен URL адрес на API (по подразбиране: `https://api.solidgate.com/v1`)|

## Съображения за сигурност

- HMAC-SHA512 се използва както за уеб кукичка, така и за проверка на подписа на намерението за плащане
- Тайният ключ и тайната на webhook никога не се разкриват на клиента
- Защитата от идемпотентност предотвратява обработка на дублираща се уебкукичка
- Валидирането на Zod гарантира стриктна проверка на входа на крайната точка за плащане
- Следите на стека за грешки са включени само в режим на разработка
- Помощната програма `safeErrorMessage` дезинфекцира съобщенията за грешки за производство

## Свързани страници

- [Stripe Checkout Deep Dive](./stripe-checkout-deep-dive.md)
- [LemonSqueezy Deep Dive](./lemonsqueezy-deep-dive.md)
- [Полярно дълбоко гмуркане](./polar-deep-dive.md)
- [Архитектура на доставчика на плащания](./payment-provider-architecture.md)
