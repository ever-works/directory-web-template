---
id: webhook-processing
title: Elaborazione del webhook
sidebar_label: Webhook
sidebar_position: 67
---

# Elaborazione del webhook

## Panoramica

Il modello Ever Works elabora i webhook in entrata da tre fornitori di servizi di pagamento: **Stripe**, **Lemon Squeezy** e **Polar**. Ogni provider dispone di un percorso API dedicato che verifica le firme, normalizza i tipi di eventi in un'enumerazione `WebhookEventType` comune e invia alle funzioni del gestore per la gestione degli abbonamenti, il monitoraggio dei pagamenti e le notifiche e-mail.

## Architettura

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

## File di origine

|Archivio|Scopo|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Gestore webhook stripe|
|`template/app/api/lemonsqueezy/webhook/route.ts`|Gestore webhook LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|Punto di ingresso del webhook Polar|
|`template/app/api/polar/webhook/router.ts`|Routing degli eventi polari|
|`template/app/api/polar/webhook/handlers.ts`|Gestori di eventi polari|
|`template/app/api/polar/webhook/types.ts`|Definizioni dei tipi di webhook polari|
|`template/app/api/polar/webhook/utils.ts`|Funzioni di utilità polare|

## Tipi di eventi comuni

Tutti i provider normalizzano i propri eventi nell'enumerazione `WebhookEventType` condivisa:

|WebhookEventType|Striscia|LemonSqueezy|Polare|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Elaborazione webhook stripe

### Verifica della firma

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

### Modello gestore (striscia)

Ogni gestore segue uno schema coerente:

1. Controlla se si tratta di un abbonamento ad un annuncio sponsor (gestione speciale)
2. Aggiorna i record di abbonamento tramite `WebhookSubscriptionService`
3. Estrai le informazioni sui clienti e prepara i dati delle email
4. Invia un'e-mail di notifica appropriata
5. Registra il successo o il fallimento

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

## Elaborazione del webhook LemonSqueezy

### Mappatura del tipo di evento

LemonSqueezy utilizza nomi di eventi diversi mappati sull'enumerazione comune:

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

### Accesso personalizzato ai dati

LemonSqueezy utilizza `custom_data` e `meta.custom_data` per i metadati (invece di `metadata` di Stripe):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Elaborazione del webhook Polar

Polar utilizza un'architettura più strutturata con file separati per instradamento, gestione e tipi.

### Modello del router

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

Il router convalida i tipi di eventi rispetto a una lista consentita prima dell'invio, impedendo chiamate a metodi dinamici non convalidati.

### Verifica della firma (polare)

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

### Gestione resiliente della posta elettronica

I gestori polari racchiudono le operazioni di posta elettronica in blocchi try/catch nidificati in modo che gli errori di posta elettronica non falliscano mai nel webhook:

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

## Gestione degli annunci degli sponsor

Tutti e tre i fornitori rilevano gli abbonamenti agli annunci degli sponsor tramite metadati e li instradano a gestori dedicati:

|Azione|Funzione|Descrizione|
|--------|----------|-------------|
|Pagamento confermato|`handleSponsorAdActivation()`|Imposta lo stato dell'annuncio su revisione in attesa|
|Abbonamento annullato|`handleSponsorAdCancellation()`|Annulla l'annuncio dello sponsor|
|Pagamento rinnovato|`handleSponsorAdRenewal()`|Estende la data di fine dell'annuncio|

## Migliori pratiche

1. **Verifica sempre le firme**: non elaborare mai webhook non verificati
2. **Utilizza il corpo non elaborato per la verifica della firma** -- analizza JSON separatamente dopo la verifica
3. **Restituisci 200 rapidamente**: i fornitori di servizi di pagamento riprovano con risposte non 2xx
4. **Isola gli errori di posta elettronica**: racchiude l'invio di posta elettronica in try/catch nidificati
5. **Convalida i tipi di eventi**: verifica con una lista consentita prima dell'invio
6. **Registro con dati strutturati**: include ID e tipi di eventi in tutte le voci del registro
7. **Utilizza provider singleton** -- `getOrCreateStripeProvider()` impedisce più istanze
