---
id: webhooks
title: Уеб кукички за плащане
sidebar_label: Уеб кукички
sidebar_position: 7
---

# Уеб кукички за плащане

Шаблонът Ever Works обработва уеб кукички за плащания от всичките четири поддържани доставчика чрез специални API маршрути. Всяка крайна точка на webhook обработва проверка на подпис, маршрутизиране на събития, управление на жизнения цикъл на абонамента и известия по имейл.

## Изходни местоположения

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Webhook архитектура

Всички маршрути за уеб кукичка на доставчик следват същия модел:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Всеки маршрут делегира бизнес логика към споделения `WebhookSubscriptionService` , който нормализира специфичните за доставчика данни в общ формат, преди да актуализира базата данни.

## Типове събития на Webhook

Шаблонът дефинира изчерпателен набор от типове събития, които всички доставчици картографират в:

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## Solidgate Webhook Handler

### Крайна точка

```
POST /api/solidgate/webhook
```

### Проверка на подписа

Маршрутът за уеб кукичка на Solidgate чете подписа от заглавката `x-signature` или `solidgate-signature` :

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

Доставчикът проверява подписа с помощта на HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Идемпотентност

Манипулаторът прилага проверка на идемпотентност в паметта, за да предотврати обработката на дублиращи се събития:

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::бележка
В производствена среда без сървър, заменете `Set` в паметта с Redis или таблица на база данни за надеждна идемпотентност между екземплярите.
:::

### Маршрутизиране на събития

След проверка събитията се насочват към конкретни манипулатори:

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### Картографиране на събития на Solidgate

Доставчикът картографира специфичните за Solidgate имена на събития към общите типове на шаблона:

| Събитие на Solidgate | Шаблон за събитие |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## WebhookSubscriptionService

Всички манипулатори на webhook делегират към споделения `WebhookSubscriptionService` . Тази услуга се създава за всеки доставчик:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Нормализация на данните

Услугата нормализира полезните натоварвания на webhook в общ формат `WebhookSubscriptionData` :

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### Методи на манипулатора

Услугата предоставя манипулатори за всеки тип събитие на webhook:

| Метод | Събитие | Описание |
|--------|-------|-------------|
| `handlePaymentSucceeded` | Плащането е извършено | Актуализира записа за плащане, задейства имейл за потвърждение |
| `handlePaymentFailed` | Неуспешно плащане | Грешка в регистрационните файлове, може да уведоми потребителя |
| `handleSubscriptionCreated` | Нов абонамент | Създава абонаментен запис в база данни |
| `handleSubscriptionUpdated` | Промяна на план | Актуализира подробности за абонамент |
| `handleSubscriptionCancelled` | Анулиране | Актуализира състоянието, задава дата на анулиране |
| `handleSubscriptionPaymentSucceeded` | Периодично плащане | Удължава периода на абонамент |
| `handleSubscriptionPaymentFailed` | Повтарящ се отказ | Маркира като просрочено, уведомява потребителя |
| `handleSubscriptionTrialEnding` | Край на пробния период | Изпраща известие за край на пробния период |

## Формат на отговор на Webhook

Всички крайни точки на webhook връщат последователен формат:

**Успех (200):**
```json
{ "received": true }
```

**Клиентска грешка (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Връщането на статус 200 е от решаващо значение за потвърждаване на получаването. Ако се върне 400 или 500, доставчиците на плащания обикновено ще опитат отново доставката на webhook.

## ВЗЕМЕТЕ крайна точка

Всеки маршрут на webhook също обработва GET заявки за диагностични цели:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Конфигуриране на уеб кукички в таблата за управление на доставчика

### Solidgate

1. Отидете до таблото за управление на Solidgate
2. Отидете на **Настройки** и след това на **Уебкукички**
3. Добавете своя уеб кукичка URL: `https://yourdomain.com/api/solidgate/webhook` 4. Изберете събития, за които да се абонирате: плащания, абонаменти, възстановяване на средства
5. Копирайте тайната на webhook във вашата променлива на средата `SOLIDGATE_WEBHOOK_SECRET` ### URL модел на уеб кукичка

Всеки доставчик има своя собствена крайна точка:

| Доставчик | URL адрес на уеб кукичка |
|----------|-------------|
| Ивица | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Полярен | `/api/polar/webhook` |

## Локално тестване на Webhooks

### Използване на ngrok или подобен тунел

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

След това конфигурирайте URL адреса на ngrok като крайна точка на вашата уебкукичка в таблото за управление на доставчика (напр. `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Ръчно тестване с curl

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## Обработка на грешки

Всяка функция на манипулатора е обвита в try/catch, за да се предотврати повреда на единичен манипулатор да причини отговор 400/500:

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

Това гарантира, че webhook винаги се потвърждава с отговор 200, дори ако вътрешната обработка е неуспешна. Грешките при обработката се регистрират за разследване, без да причиняват повторни опити на доставчика.

## Съображения за сигурност

- **Винаги проверявайте подписите** -- никога не обработвайте полезни натоварвания на webhook без проверка на подписа
- **Използвайте необработено тяло** -- анализирайте необработения текст на заявката за проверка на подписа, а не анализираното чрез JSON тяло
- **Идемпотентност** -- внедрите дедупликация, за да обработвате грациозно повторните опити на доставчика
- **Регистриране** -- регистрирайте идентификатори на webhook и типове събития за одитни пътеки
- **Само за HTTPS** -- крайните точки на webhook трябва да се обслужват през HTTPS в производствения процес
