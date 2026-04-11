---
id: webhooks
title: Платежные вебхуки
sidebar_label: Вебхуки
sidebar_position: 7
---

# Платежные вебхуки

Шаблон Ever Works обрабатывает платежные веб-перехватчики от всех четырех поддерживаемых поставщиков через выделенные маршруты API. Каждая конечная точка веб-перехватчика отвечает за проверку подписи, маршрутизацию событий, управление жизненным циклом подписки и уведомления по электронной почте.

## Исходные локации

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Архитектура вебхука

Все маршруты веб-перехватчиков провайдера следуют одному и тому же шаблону:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Каждый маршрут делегирует бизнес-логику общему `WebhookSubscriptionService` , который нормализует данные, специфичные для провайдера, в общий формат перед обновлением базы данных.

## Типы событий вебхука

Шаблон определяет полный набор типов событий, в которые сопоставляются все поставщики:

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

## Обработчик веб-перехватчика Solidgate

### Конечная точка

```
POST /api/solidgate/webhook
```

### Проверка подписи

Маршрут веб-перехватчика Solidgate считывает подпись из заголовка `x-signature` или `solidgate-signature` :

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

Поставщик проверяет подпись с помощью HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Идемпотентность

Обработчик реализует проверку идемпотентности в памяти, чтобы предотвратить дублирующую обработку событий:

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

:::примечание
В производственной бессерверной среде замените значение `Set` в памяти на Redis или таблицу базы данных, чтобы обеспечить надежную идемпотентность между экземплярами.
:::

### Маршрутизация событий

После проверки события перенаправляются конкретным обработчикам:

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

### Сопоставление событий Solidgate

Поставщик сопоставляет имена событий, специфичные для Solidgate, с общими типами шаблона:

| Событие Солидгейт | Шаблонное событие |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## Служба подписки WebhookSubscriptionService

Все обработчики веб-перехватчиков делегируют полномочия общему `WebhookSubscriptionService` . Эта услуга создается для каждого поставщика:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Нормализация данных

Сервис нормализует полезные данные вебхука в общий формат `WebhookSubscriptionData` :

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

### Методы обработчика

Служба предоставляет обработчики для каждого типа событий веб-перехватчика:

| Метод | Событие | Описание |
|--------|-------|-------------|
| `handlePaymentSucceeded` | Платеж завершен | Обновляет запись о платеже, вызывает электронное письмо с подтверждением |
| `handlePaymentFailed` | Платеж не выполнен | Сбой в журнале, может уведомить пользователя |
| `handleSubscriptionCreated` | Новая подписка | Создает запись о подписке в базе данных |
| `handleSubscriptionUpdated` | Изменение плана | Подробности подписки на обновления |
| `handleSubscriptionCancelled` | Отмена | Статус обновлений, установка даты отмены |
| `handleSubscriptionPaymentSucceeded` | Регулярный платеж | Продлевает срок подписки |
| `handleSubscriptionPaymentFailed` | Повторяющийся сбой | Отмечает просрочку и уведомляет пользователя |
| `handleSubscriptionTrialEnding` | Окончание пробной версии | Отправляет уведомление об окончании пробного периода |

## Формат ответа вебхука

Все конечные точки вебхука возвращают согласованный формат:

**Успех (200):**
```json
{ "received": true }
```

**Ошибка клиента (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Возврат статуса 200 имеет решающее значение для подтверждения получения. Если возвращается 400 или 500, поставщики платежей обычно повторяют попытку доставки веб-перехватчика.

## ПОЛУЧИТЬ конечную точку

Каждый маршрут веб-перехватчика также обрабатывает запросы GET в диагностических целях:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Настройка веб-перехватчиков на панелях мониторинга поставщиков

### Солидгейт

1. Перейдите на панель инструментов Solidgate.
2. Откройте **Настройки**, затем **Вебхуки**.
3. Добавьте URL-адрес веб-перехватчика: `https://yourdomain.com/api/solidgate/webhook` 4. Выберите события для подписки: платежи, подписки, возвраты средств.
5. Скопируйте секрет веб-перехватчика в переменную среды `SOLIDGATE_WEBHOOK_SECRET` .

### Шаблон URL-адреса веб-перехватчика

У каждого провайдера есть своя выделенная конечная точка:

| Провайдер | URL вебхука |
|----------|-------------|
| Полоса | `/api/stripe/webhook` |
| Солидгейт | `/api/solidgate/webhook` |
| ЛимонныйСкуизи | `/api/lemonsqueezy/webhook` |
| Полярный | `/api/polar/webhook` |

## Тестирование вебхуков локально

### Использование ngrok или аналогичного туннеля

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Затем настройте URL-адрес ngrok в качестве конечной точки веб-перехватчика на панели управления провайдера (например, `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Ручное тестирование с помощью Curl

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

## Обработка ошибок

Каждая функция обработчика заключена в try/catch, чтобы один сбой обработчика не вызывал ответа 400/500:

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

Это гарантирует, что веб-перехватчик всегда подтверждается ответом 200, даже если внутренняя обработка завершается сбоем. Ошибки обработки регистрируются для расследования, не вызывая циклов повторных попыток поставщика.

## Вопросы безопасности

- **Всегда проверять подписи** – никогда не обрабатывать полезные данные веб-перехватчика без проверки подписи.
- **Использовать необработанное тело** – анализировать необработанный текст запроса для проверки подписи, а не тело, проанализированное в формате JSON.
- **Идемпотентность** — реализация дедупликации для корректной обработки повторных попыток поставщика.
- **Журналирование** – регистрируйте идентификаторы веб-перехватчиков и типы событий для контрольных журналов.
- **Только HTTPS** – конечные точки веб-перехватчика должны обслуживаться через HTTPS в рабочей среде.
