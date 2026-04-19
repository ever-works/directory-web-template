---
id: webhook-processing
title: Webhook-verwerking
sidebar_label: Webhaken
sidebar_position: 67
---

# Webhook-verwerking

## Overzicht

De Ever Works-sjabloon verwerkt inkomende webhooks van drie betalingsproviders: **Stripe**, **Lemon Squeezy** en **Polar**. Elke provider heeft een speciale API-route die handtekeningen verifieert, gebeurtenistypen normaliseert naar een gemeenschappelijke `WebhookEventType`-opsomming en verzendingen naar afhandelingsfuncties voor abonnementsbeheer, het volgen van betalingen en e-mailmeldingen.

## Architectuur

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

## Bronbestanden

|Bestand|Doel|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Streep webhook-handler|
|`template/app/api/lemonsqueezy/webhook/route.ts`|LemonSqueezy webhook-handler|
|`template/app/api/polar/webhook/route.ts`|Polar webhook-ingangspunt|
|`template/app/api/polar/webhook/router.ts`|Routing van polaire gebeurtenissen|
|`template/app/api/polar/webhook/handlers.ts`|Polaire gebeurtenishandlers|
|`template/app/api/polar/webhook/types.ts`|Definities van polaire webhooktypes|
|`template/app/api/polar/webhook/utils.ts`|Polar nutsfuncties|

## Veelvoorkomende gebeurtenistypen

Alle providers normaliseren hun gebeurtenissen naar de gedeelde `WebhookEventType` opsomming:

|WebhookEventType|Streep|CitroenSqueezy|Polair|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Stripe Webhook-verwerking

### Handtekeningverificatie

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

### Handlerpatroon (streep)

Elke handler volgt een consistent patroon:

1. Controleer of het een sponsoradvertentie-abonnement betreft (speciale afhandeling)
2. Update abonnementsgegevens via `WebhookSubscriptionService`
3. Extraheer klantinformatie en bereid e-mailgegevens voor
4. Verzend de juiste meldings-e-mail
5. Succes of mislukking registreren

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

## LemonSqueezy-webhookverwerking

### Toewijzing van gebeurtenistypen

LemonSqueezy gebruikt verschillende gebeurtenisnamen die zijn toegewezen aan de algemene enum:

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

### Aangepaste gegevenstoegang

LemonSqueezy gebruikt `custom_data` en `meta.custom_data` voor metadata (in plaats van Stripe's `metadata`):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Polar Webhook-verwerking

Polar gebruikt een meer gestructureerde architectuur met afzonderlijke bestanden voor routering, afhandeling en typen.

### Routerpatroon

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

De router valideert gebeurtenistypen aan de hand van een toelatingslijst voordat deze worden verzonden, waardoor niet-gevalideerde dynamische methodeaanroepen worden voorkomen.

### Handtekeningverificatie (polair)

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

### Veerkrachtige e-mailverwerking

Polaire handlers verpakken e-mailbewerkingen in geneste try/catch-blokken, zodat e-mailfouten nooit de webhook mislukken:

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

## Afhandeling van sponsoradvertenties

Alle drie de providers detecteren sponsoradvertentieabonnementen via metadata en sturen deze door naar speciale handlers:

|Actie|Functie|Beschrijving|
|--------|----------|-------------|
|Betaling bevestigd|`handleSponsorAdActivation()`|Stelt de advertentiestatus in op In afwachting van beoordeling|
|Abonnement opgezegd|`handleSponsorAdCancellation()`|Annuleert de sponsoradvertentie|
|Betaling vernieuwd|`handleSponsorAdRenewal()`|Verlengt de einddatum van de advertentie|

## Beste praktijken

1. **Verifieer handtekeningen altijd**: verwerk nooit niet-geverifieerde webhooks
2. **Gebruik onbewerkte body voor handtekeningverificatie** -- parseer JSON afzonderlijk na verificatie
3. **Retourneer 200 snel** - betalingsproviders proberen het opnieuw bij niet-2xx-reacties
4. **Isoleer e-mailfouten**: verpak het verzenden van e-mail in geneste try/catch
5. **Gebeurtenistypen valideren**: controleer aan de hand van een toelatingslijst voordat u deze verzendt
6. **Log met gestructureerde gegevens**: neem gebeurtenis-ID's en -typen op in alle logboekvermeldingen
7. **Gebruik singleton-providers** -- `getOrCreateStripeProvider()` voorkomt meerdere exemplaren
