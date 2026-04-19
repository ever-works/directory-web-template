---
id: webhook-processing
title: Procesamiento de webhooks
sidebar_label: Ganchos web
sidebar_position: 67
---

# Procesamiento de webhooks

## Descripción general

La plantilla Ever Works procesa webhooks entrantes de tres proveedores de pago: **Stripe**, **Lemon Squeezy** y **Polar**. Cada proveedor tiene una ruta API dedicada que verifica las firmas, normaliza los tipos de eventos a una enumeración `WebhookEventType` común y envía funciones de controlador para la gestión de suscripciones, seguimiento de pagos y notificaciones por correo electrónico.

## Arquitectura

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

## Archivos fuente

|Archivo|Propósito|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Controlador de webhook de banda|
|`template/app/api/lemonsqueezy/webhook/route.ts`|Controlador de webhook LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|Punto de entrada del webhook polar|
|`template/app/api/polar/webhook/router.ts`|Enrutamiento de eventos polares|
|`template/app/api/polar/webhook/handlers.ts`|Manejadores de eventos polares|
|`template/app/api/polar/webhook/types.ts`|Definiciones de tipos de webhooks polares|
|`template/app/api/polar/webhook/utils.ts`|Funciones de utilidad polar|

## Tipos de eventos comunes

Todos los proveedores normalizan sus eventos según la enumeración `WebhookEventType` compartida:

|Tipo de evento de webhook|raya|LimónExprimible|polares|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Procesamiento de webhook de banda

### Verificación de firma

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

### Patrón de controlador (raya)

Cada controlador sigue un patrón consistente:

1. Compruebe si se trata de una suscripción a anuncios de patrocinadores (manejo especial)
2. Actualizar registros de suscripción a través de `WebhookSubscriptionService`
3. Extraiga información del cliente y prepare datos de correo electrónico
4. Enviar correo electrónico de notificación apropiado
5. Registrar éxito o fracaso

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

## Procesamiento de webhook LemonSqueezy

### Mapeo de tipos de eventos

LemonSqueezy usa diferentes nombres de eventos que se asignan a la enumeración común:

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

### Acceso a datos personalizados

LemonSqueezy usa `custom_data` y `meta.custom_data` para metadatos (en lugar de `metadata` de Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Procesamiento de webhook polar

Polar utiliza una arquitectura más estructurada con archivos separados para enrutamiento, manejo y tipos.

### Patrón de enrutador

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

El enrutador valida los tipos de eventos con una lista de permitidos antes de enviarlos, lo que evita llamadas a métodos dinámicos no validados.

### Verificación de firma (polar)

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

### Manejo resiliente del correo electrónico

Los controladores Polar envuelven las operaciones de correo electrónico en bloques try/catch anidados para que los errores de correo electrónico nunca fallen en el webhook:

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

## Manejo de anuncios del patrocinador

Los tres proveedores detectan las suscripciones a anuncios de patrocinadores a través de metadatos y las enrutan a controladores dedicados:

|acción|Función|Descripción|
|--------|----------|-------------|
|Pago confirmado|`handleSponsorAdActivation()`|Establece el estado del anuncio en pendiente de revisión|
|Suscripción cancelada|`handleSponsorAdCancellation()`|Cancela el anuncio del patrocinador.|
|Pago renovado|`handleSponsorAdRenewal()`|Extiende la fecha de finalización del anuncio|

## Mejores prácticas

1. **Verifique siempre las firmas**: nunca procese webhooks no verificados
2. **Utilice el cuerpo sin formato para verificar la firma**: analice JSON por separado después de la verificación
3. **Devuelve 200 rápidamente**: los proveedores de pagos vuelven a intentarlo con respuestas que no sean 2xx
4. **Aislar errores de correo electrónico**: envolver el envío de correo electrónico en try/catch anidados
5. **Validar tipos de eventos**: compruébelo con una lista de permitidos antes de enviar
6. **Registro con datos estructurados**: incluya ID y tipos de eventos en todas las entradas del registro
7. **Utilice proveedores singleton**: `getOrCreateStripeProvider()` evita instancias múltiples
