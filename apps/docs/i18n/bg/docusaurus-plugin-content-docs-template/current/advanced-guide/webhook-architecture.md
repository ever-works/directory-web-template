---
id: webhook-architecture
title: Webhook архитектура
sidebar_label: Уеб кукички
sidebar_position: 3
---

# Webhook архитектура

Това ръководство обхваща системата за обработка на webhook, използвана за обработка на събития от външни услуги като Stripe, LemonSqueezy и други доставчици на плащания, включително проверка на подпис, маршрутизиране на събития, идемпотентност и обработка на повторен опит.

## Преглед на архитектурата

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

## Уеб кукички на доставчик на плащания

Шаблонът използва модела `PaymentServiceManager` за поддръжка на множество доставчици на плащания:

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

### Шаблон за манипулатор на маршрути за уеб кукичка

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

## Проверка на подписа

### Stripe Webhooks

Stripe използва подписи HMAC-SHA256 с клеймо за време, за да предотврати атаки при повторно възпроизвеждане:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### LemonSqueezy Webhooks

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

## Маршрутизиране на събития

### Съпоставяне на тип събитие към манипулатор

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

## Идемпотентност

### Предотвратяване на дублирана обработка

Доставчиците на Webhook могат да изпращат повторно събития. Използвайте идентификатора на събитието, за да предотвратите дублиращата се обработка:

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

## Повторен опит за обработка

### Поведение при повторен опит на доставчика

| Доставчик | График за повторен опит | Макс. повторни опити | Изчакване |
|----------|--------------|-------------|---------|
| Ивица | Експоненциално забавяне за 3 дни | ~16 опита | 20 секунди |
| LemonSqueezy | Експоненциално забавяне | 5 опита | 15 секунди |

### Най-добри практики за безопасни манипулатори при повторен опит

1. **Върнете 200 бързо**: Потвърдете получаването в рамките на 5 секунди. Разтоварете тежката обработка.
2. **Идемпотентни манипулатори**: Уверете се, че повторната обработка на същото събитие води до същия резултат.
3. **Върни 4xx за постоянни грешки**: Върни 400 за невалидни подписи. Доставчикът няма да опита отново.
4. **Върнете 5xx за временни грешки**: Върнете 500, ако вашата база данни е временно недостъпна. Доставчикът ще опита отново.

## Модел на опашка за мъртви писма

За събития, които многократно се провалят при обработката, приложете модел на мъртва буква:

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

## Съображения за сигурност

1. **Винаги проверявайте подписите**, преди да обработите какъвто и да е полезен товар на webhook.
2. **Използвайте безопасно за времето сравнение** ( `crypto.timingSafeEqual` ), за да предотвратите атаки за определяне на времето.
3. **Прочетете необработеното тяло** преди анализ на JSON - проверката на подписа изисква точните получени байтове.
4. **Ограничете крайните точки на webhook** само до POST.
5. **Не разкривайте тайните на webhook** в код или регистрационни файлове от страна на клиента.
6. **Потвърдете данните за събитието**, преди да действате върху тях -- не се доверявайте сляпо на полезните натоварвания на webhook.

## Съображения за производителност

1. **Бързо потвърждение**: Връща 200 в рамките на прозореца за изчакване на доставчика. Прехвърлете тежката работа на фонови задачи.
2. **Записи в базата данни**: Минимизиране на операциите в DB в манипулатора на webhook. Групови актуализации, където е възможно.
3. **Регистриране**: Регистрирайте идентификатори на събития и типове за отстраняване на грешки, но избягвайте да регистрирате пълните полезни натоварвания (може да съдържа PII).

## Отстраняване на неизправности

### Проверката на подписа е неуспешна

1. Уверете се, че четете **основния текст на заявката** (не анализиран JSON).
2. Проверете дали тайната на webhook съвпада с тази в таблото за управление на вашия доставчик.
3. Уверете се, че няма междинен софтуер, модифициращ тялото на заявката, преди да достигне до манипулатора.

### Обработени дублирани събития

1. Приложете идемпотентност, като използвате идентификатора на събитието, както е описано по-горе.
2. Проверете таблицата `webhookEvents` за дублиращи се записи.
3. Използвайте уникални ограничения на ниво база данни за колоната с идентификатор на събитие.

### Времето за изтичане на събитията

1. Преместете тежката обработка към фонови задачи, като използвате `BackgroundJobManager` .
2. Незабавно потвърдете уеб кукичката и обработете асинхронно.
3. Увеличете времето за изчакване за външни извиквания на API, ако е необходимо.

## Свързана документация

- [Модели за възстановяване на грешки](./error-recovery-patterns.md)
- [Архитектура с ограничаване на скоростта](./rate-limiting-architecture.md)
- [API клиентска архитектура](./api-client-architecture.md)
