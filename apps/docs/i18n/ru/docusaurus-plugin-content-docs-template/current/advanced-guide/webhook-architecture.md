---
id: webhook-architecture
title: Архитектура вебхука
sidebar_label: Вебхуки
sidebar_position: 3
---

# Архитектура вебхука

В этом руководстве рассматривается система обработки веб-перехватчиков, используемая для обработки событий от внешних сервисов, таких как Stripe, LemonSqueezy и других поставщиков платежей, включая проверку подписи, маршрутизацию событий, идемпотентность и обработку повторных попыток.

## Обзор архитектуры

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## Веб-перехватчики платежных систем

В шаблоне используется шаблон `PaymentServiceManager` для поддержки нескольких поставщиков платежей:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }
}
```

### Шаблон обработчика маршрута веб-перехватчика

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## Проверка подписи

### Веб-хуки Stripe

Stripe использует подписи HMAC-SHA256 с отметкой времени для предотвращения атак повторного воспроизведения:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### Веб-хуки LemonSqueezy

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## Маршрутизация событий

### Сопоставление типа события с обработчиком

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## Идемпотентность

### Предотвращение дублирующей обработки

Поставщики веб-перехватчиков могут повторно отправлять события. Используйте идентификатор события, чтобы предотвратить дублирующую обработку:

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## Обработка повторной попытки

### Поведение повторной попытки поставщика

| Провайдер | Расписание повторных попыток | Макс. повторов | Тайм-аут |
|----------|---------------|-------------|---------|
| Полоса | Экспоненциальная отсрочка в течение 3 дней | ~16 попыток | 20 секунд |
| ЛимонныйСкуизи | Экспоненциальный откат | 5 попыток | 15 секунд |

### Лучшие практики для обработчиков с защитой от повторных попыток

1. **Быстрый возврат 200**: подтвердите получение в течение 5 секунд. Разгрузить тяжелую переработку.
2. **Идемпотентные обработчики**: убедитесь, что повторная обработка того же события дает тот же результат.
3. **Возврат 4xx в случае постоянных сбоев**: возврат 400 для недействительных подписей. Поставщик не будет повторять попытку.
4. **Верните 5xx при временных сбоях**: верните 500, если ваша база данных временно недоступна. Поставщик повторит попытку.

## Шаблон очереди недоставленных писем

Для событий, которые неоднократно не обрабатываются, реализуйте шаблон недоставленных писем:

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## Вопросы безопасности

1. **Всегда проверяйте подписи** перед обработкой полезных данных веб-перехватчика.
2. **Используйте временное сравнение** ( `crypto.timingSafeEqual` ) для предотвращения временных атак.
3. **Прочитайте необработанное тело** перед анализом JSON – для проверки подписи требуются точные полученные байты.
4. **Ограничить конечные точки веб-перехватчиков** только POST.
5. **Не раскрывайте секреты веб-перехватчиков** в клиентском коде или журналах.
6. **Проверяйте данные о событии**, прежде чем действовать по нему. Не доверяйте слепо полезным данным веб-перехватчика.

## Вопросы производительности

1. **Быстрое подтверждение**: возврат 200 в течение тайм-аута поставщика. Перенесите тяжелую работу на фоновую работу.
2. **Запись в базу данных**: сведите к минимуму операции с БД в обработчике веб-перехватчика. Пакетные обновления, где это возможно.
3. **Журналирование**. Регистрируйте идентификаторы и типы событий для отладки, но избегайте регистрации полных полезных данных (могут содержать идентификационные данные).

## Устранение неполадок

### Проверка подписи не удалась

1. Убедитесь, что вы читаете **необработанное тело запроса** (не анализируемый JSON).
2. Убедитесь, что секрет веб-перехватчика совпадает с секретом на панели управления вашего провайдера.
3. Убедитесь, что промежуточное программное обеспечение не изменяет тело запроса до того, как оно достигнет обработчика.

### Обработаны повторяющиеся события

1. Реализуйте идемпотентность, используя идентификатор события, как описано выше.
2. Проверьте таблицу `webhookEvents` на наличие повторяющихся записей.
3. Используйте уникальные ограничения на уровне базы данных для столбца идентификатора события.

### Время ожидания событий истекло

1. Перенесите тяжелую обработку на фоновые задания с помощью кнопки `BackgroundJobManager` .
2. Немедленно подтвердите веб-перехватчик и обработайте его асинхронно.
3. При необходимости увеличьте таймаут для внешних вызовов API.

## Сопутствующая документация

- [Шаблоны восстановления ошибок](./error-recovery-patterns.md)
- [Архитектура ограничения скорости](./rate-limiting-architecture.md)
- [Архитектура клиента API](./api-client-architecture.md)
