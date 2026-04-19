---
id: webhook-processing
title: Обработка вебхука
sidebar_label: Вебхуки
sidebar_position: 67
---

# Обработка вебхука

## Обзор

Шаблон Ever Works обрабатывает входящие веб-перехватчики от трех платежных систем: **Stripe**, **Lemon Squeezy** и **Polar**. У каждого поставщика есть выделенный маршрут API, который проверяет подписи, нормализует типы событий к общему перечислению `WebhookEventType` и отправляет их функциям-обработчикам для управления подписками, отслеживания платежей и уведомлений по электронной почте.

## Архитектура

```mermaid
flowchart TD
    A[Payment Provider] -->|POST| B{Which Provider?}

    B -->|stripe-signature header| C[/api/stripe/webhook]
    B -->|x-signature header| D[/api/lemonsqueezy/webhook]
    B -->|webhook-signature header| E[/api/polar/webhook]

    C --> F[Stripe Provider]
    D --> G[LemonSqueezy Provider]
    E --> H[Polar Provider]

    F --> I[Verify Signature]
    G --> I
    H --> I

    I -->|Valid| J[Normalize to WebhookEventType]
    I -->|Invalid| K[400 Bad Request]

    J --> L{Event Type Router}

    L -->|SUBSCRIPTION_CREATED| M[handleSubscriptionCreated]
    L -->|SUBSCRIPTION_UPDATED| N[handleSubscriptionUpdated]
    L -->|SUBSCRIPTION_CANCELLED| O[handleSubscriptionCancelled]
    L -->|PAYMENT_SUCCEEDED| P[handlePaymentSucceeded]
    L -->|PAYMENT_FAILED| Q[handlePaymentFailed]
    L -->|TRIAL_ENDING| R[handleTrialEnding]

    M --> S{Is Sponsor Ad?}
    S -->|Yes| T[Sponsor Ad Handlers]
    S -->|No| U[WebhookSubscriptionService]
    U --> V[Database Update]
    U --> W[Email Notification]
```

## Исходные файлы

|Файл|Цель|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Обработчик веб-перехватчика Stripe|
|`template/app/api/lemonsqueezy/webhook/route.ts`|Обработчик веб-перехватчика LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|Точка входа в вебхук Polar|
|`template/app/api/polar/webhook/router.ts`|Маршрутизация полярных событий|
|`template/app/api/polar/webhook/handlers.ts`|Обработчики событий Polar|
|`template/app/api/polar/webhook/types.ts`|Определения типов веб-перехватчиков Polar|
|`template/app/api/polar/webhook/utils.ts`|Полярные функции полезности|

## Распространенные типы событий

Все провайдеры нормализуют свои события в общем перечислении `WebhookEventType`:

|ВебхукEventType|Полоса|ЛимонСжатый|Полярный|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Обработка вебхука Stripe

### Проверка подписи

```typescript
export async function POST(request: NextRequest) {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
    }

    const stripeProvider = getOrCreateStripeProvider();
    const webhookResult = await stripeProvider.handleWebhook(body, signature);

    if (!webhookResult.received) {
        return NextResponse.json({ error: 'Webhook not processed' }, { status: 400 });
    }

    // Route to handler based on event type
    switch (webhookResult.type) {
        case WebhookEventType.SUBSCRIPTION_CREATED:
            await handleSubscriptionCreated(webhookResult.data);
            break;
        // ... other cases
    }

    return NextResponse.json({ received: true });
}
```

### Шаблон обработчика (полоса)

Каждый обработчик следует единому шаблону:

1. Проверьте, является ли это подпиской на спонсорскую рекламу (особая обработка)
2. Обновить записи о подписке через `WebhookSubscriptionService`
3. Извлеките информацию о клиенте и подготовьте данные электронной почты
4. Отправьте соответствующее уведомление по электронной почте
5. Зарегистрировать успех или неудачу

```typescript
async function handleSubscriptionCreated(data: any) {
    // Check for sponsor ad
    if (isSponsorAdSubscription(data)) {
        await handleSponsorAdActivation(data);
        return;
    }

    // Update database
    await webhookSubscriptionService.handleSubscriptionCreated(data);

    // Send email notification
    const customerInfo = extractCustomerInfo(data);
    const emailData = {
        customerName: customerInfo.customerName,
        planName: getPlanName(priceId),
        amount: formatAmount(unitAmount, currency),
        // ...
    };
    await paymentEmailService.sendNewSubscriptionEmail(emailData);
}
```

## Обработка вебхука LemonSqueezy

### Сопоставление типов событий

LemonSqueezy использует разные имена событий, которые отображаются в общее перечисление:

```typescript
function mapLemonSqueezyEventType(lemonsqueezyEventType: string): string {
    const eventMapping: Record<string, string> = {
        'subscription_created': WebhookEventType.SUBSCRIPTION_CREATED,
        'subscription_updated': WebhookEventType.SUBSCRIPTION_UPDATED,
        'subscription_cancelled': WebhookEventType.SUBSCRIPTION_CANCELLED,
        'subscription_payment_success': WebhookEventType.SUBSCRIPTION_PAYMENT_SUCCEEDED,
        'subscription_payment_failed': WebhookEventType.SUBSCRIPTION_PAYMENT_FAILED,
        'order_created': WebhookEventType.PAYMENT_SUCCEEDED,
        'order_refunded': WebhookEventType.REFUND_SUCCEEDED,
    };
    return eventMapping[lemonsqueezyEventType] || lemonsqueezyEventType;
}
```

### Пользовательский доступ к данным

LemonSqueezy использует `custom_data` и `meta.custom_data` для метаданных (вместо `metadata` Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Обработка веб-перехватчика Polar

Polar использует более структурированную архитектуру с отдельными файлами для маршрутизации, обработки и типов.

### Маршрутизатор

```typescript
// router.ts
function isValidWebhookEventType(eventType: string): eventType is WebhookEventType {
    const allowedEventTypes: Set<WebhookEventType> = new Set([
        WebhookEventType.SUBSCRIPTION_CREATED,
        WebhookEventType.SUBSCRIPTION_UPDATED,
        // ... all handled types
    ]);
    return allowedEventTypes.has(eventType as WebhookEventType);
}

export async function routeWebhookEvent(
    eventType: string,
    data: PolarWebhookData
): Promise<void> {
    if (!isValidWebhookEventType(eventType)) {
        logger.warn('Invalid or unhandled webhook event type', { eventType });
        return;
    }

    const eventHandlers: Partial<Record<WebhookEventType, Handler>> = {
        [WebhookEventType.SUBSCRIPTION_CREATED]: handleSubscriptionCreated,
        [WebhookEventType.SUBSCRIPTION_UPDATED]: handleSubscriptionUpdated,
        // ... handler map
    };

    const handler = eventHandlers[eventType];
    if (handler) await handler(data);
}
```

Маршрутизатор проверяет типы событий на соответствие списку разрешенных перед отправкой, предотвращая непроверенные вызовы динамических методов.

### Проверка подписи (полярная)

```typescript
const WEBHOOK_SIGNATURE_HEADER = 'webhook-signature';
const WEBHOOK_TIMESTAMP_HEADER = 'webhook-timestamp';
const WEBHOOK_ID_HEADER = 'webhook-id';

export async function POST(request: NextRequest): Promise<NextResponse> {
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);

    // Validate payload structure
    if (!validateWebhookPayload(body)) {
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Verify signature with all three headers
    const polarProvider = getOrCreatePolarProvider();
    const webhookResult = await polarProvider.handleWebhook(
        body,
        signatureHeader,
        bodyText,           // Raw body for signature verification
        timestampHeader,
        webhookIdHeader
    );

    await routeWebhookEvent(webhookResult.type, webhookResult.data);
    return NextResponse.json({ received: true });
}
```

### Устойчивая обработка электронной почты

Обработчики Polar заключают операции с электронной почтой во вложенные блоки try/catch, поэтому ошибки электронной почты никогда не приводят к сбою веб-перехватчика:

```typescript
export async function handleSubscriptionCreated(data: PolarWebhookData): Promise<void> {
    try {
        await webhookSubscriptionService.handleSubscriptionCreated(data);

        try {
            // Email sending - isolated failure domain
            const emailResult = await paymentEmailService.sendNewSubscriptionEmail(emailData);
        } catch (emailError) {
            // Log but don't fail the webhook
            logger.warn('Skipping email notification due to configuration error');
        }
    } catch (error) {
        logger.error('Error handling subscription created');
        throw error;  // Re-throw: database failures should fail the webhook
    }
}
```

## Обработка спонсорской рекламы

Все три провайдера обнаруживают подписки на спонсорскую рекламу через метаданные и направляют их специальным обработчикам:

|Действие|Функция|Описание|
|--------|----------|-------------|
|Платеж подтвержден|`handleSponsorAdActivation()`|Устанавливает статус объявления «Ожидает рассмотрения».|
|Подписка отменена|`handleSponsorAdCancellation()`|Отменяет спонсорскую рекламу|
|Платеж продлен|`handleSponsorAdRenewal()`|Продлевает дату окончания объявления|

## Лучшие практики

1. **Всегда проверяйте подписи** – никогда не обрабатывайте непроверенные веб-перехватчики.
2. **Использовать необработанное тело для проверки подписи** – после проверки анализировать JSON отдельно.
3. **Быстро верните 200** – поставщики платежных услуг повторяют попытку при ответе, отличном от 2xx.
4. **Изолировать ошибки электронной почты** – заключить отправку электронной почты во вложенную функцию try/catch.
5. **Проверка типов событий** – перед отправкой сверьтесь с белым списком.
6. **Журнал со структурированными данными** – включите идентификаторы и типы событий во все записи журнала.
7. **Использовать одноэлементные поставщики** – `getOrCreateStripeProvider()` предотвращает создание нескольких экземпляров
