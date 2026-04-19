---
id: webhook-processing
title: Обработка на уеб кукичка
sidebar_label: Уеб кукички
sidebar_position: 67
---

# Обработка на уеб кукичка

## Преглед

Шаблонът Ever Works обработва входящи уебкукички от три доставчика на плащания: **Stripe**, **Lemon Squeezy** и **Polar**. Всеки доставчик има специален API маршрут, който проверява подписите, нормализира типовете събития към общ `WebhookEventType` enum и изпраща до манипулиращи функции за управление на абонаменти, проследяване на плащания и известия по имейл.

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

## Изходни файлове

|Файл|Цел|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Манипулатор на уеб кукичка Stripe|
|`template/app/api/lemonsqueezy/webhook/route.ts`|Обработчик на уеб кукичка LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|Входна точка на Polar webhook|
|`template/app/api/polar/webhook/router.ts`|Маршрутизиране на полярни събития|
|`template/app/api/polar/webhook/handlers.ts`|Полярни манипулатори на събития|
|`template/app/api/polar/webhook/types.ts`|Дефиниции на типа webhook на Polar|
|`template/app/api/polar/webhook/utils.ts`|Полярни функции на полезност|

## Често срещани типове събития

Всички доставчици нормализират своите събития към споделения `WebhookEventType` enum:

|WebhookEventType|Ивица|LemonSqueezy|Полярен|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Обработка на Stripe Webhook

### Проверка на подписа

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

### Модел на манипулатора (ивици)

Всеки манипулатор следва последователен модел:

1. Проверете дали това е абонамент за спонсорска реклама (специална обработка)
2. Актуализирайте абонаментните записи чрез `WebhookSubscriptionService`
3. Извлечете информация за клиента и подгответе имейл данни
4. Изпратете подходящ имейл за известие
5. Регистрирайте успех или неуспех

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

## LemonSqueezy Webhook обработка

### Съпоставяне на типа събитие

LemonSqueezy използва различни имена на събития, които са картографирани към общия enum:

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

### Персонализиран достъп до данни

LemonSqueezy използва `custom_data` и `meta.custom_data` за метаданни (вместо `metadata` на Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Обработка на Polar Webhook

Polar използва по-структурирана архитектура с отделни файлове за маршрутизиране, обработка и типове.

### Модел на рутер

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

Рутерът валидира типовете събития спрямо разрешен списък преди изпращане, предотвратявайки невалидирани извиквания на динамични методи.

### Проверка на подпис (Polar)

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

### Устойчива работа с имейл

Манипулаторите на Polar обгръщат имейл операциите във вложени блокове try/catch, така че отказите на имейли никога да не провалят webhook:

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

## Спонсориране на реклами

И трите доставчика откриват абонаменти за реклами на спонсори чрез метаданни и ги насочват към специални манипулатори:

|Действие|функция|Описание|
|--------|----------|-------------|
|Плащането е потвърдено|`handleSponsorAdActivation()`|Задава статус на рекламата на чакащ преглед|
|Абонаментът е анулиран|`handleSponsorAdCancellation()`|Анулира рекламата на спонсора|
|Плащането е подновено|`handleSponsorAdRenewal()`|Удължава крайната дата на рекламата|

## Най-добри практики

1. **Винаги проверявайте подписите** -- никога не обработвайте непроверени уебкукички
2. **Използвайте необработено тяло за проверка на подписа** -- анализирайте JSON отделно след проверката
3. **Върнете 200 бързо** -- доставчиците на плащания опитват отново при отговори, различни от 2xx
4. **Изолиране на неуспешни имейли** -- обгръщане на изпращането на имейл във вложен опит/улов
5. **Потвърдете типовете събития** -- проверете в списък с разрешени преди изпращане
6. **Дневник със структурирани данни** -- включете идентификатори на събития и типове във всички записи в журнала
7. **Използвайте единични доставчици** -- `getOrCreateStripeProvider()` предотвратява множество екземпляри
