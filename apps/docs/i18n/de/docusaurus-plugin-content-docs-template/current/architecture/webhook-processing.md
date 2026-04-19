---
id: webhook-processing
title: Webhook-Verarbeitung
sidebar_label: Webhooks
sidebar_position: 67
---

# Webhook-Verarbeitung

## Übersicht

Die Ever Works-Vorlage verarbeitet eingehende Webhooks von drei Zahlungsanbietern: **Stripe**, **Lemon Squeezy** und **Polar**. Jeder Anbieter verfügt über eine dedizierte API-Route, die Signaturen überprüft, Ereignistypen auf eine gemeinsame Enumeration `WebhookEventType` normalisiert und Handlerfunktionen für die Abonnementverwaltung, Zahlungsverfolgung und E-Mail-Benachrichtigungen weiterleitet.

## Architektur

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

## Quelldateien

|Datei|Zweck|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Stripe-Webhook-Handler|
|`template/app/api/lemonsqueezy/webhook/route.ts`|LemonSqueezy-Webhook-Handler|
|`template/app/api/polar/webhook/route.ts`|Polar-Webhook-Einstiegspunkt|
|`template/app/api/polar/webhook/router.ts`|Routing von Polarereignissen|
|`template/app/api/polar/webhook/handlers.ts`|Polar-Ereignishandler|
|`template/app/api/polar/webhook/types.ts`|Definitionen des Polar-Webhook-Typs|
|`template/app/api/polar/webhook/utils.ts`|Polar Utility-Funktionen|

## Häufige Ereignistypen

Alle Anbieter normalisieren ihre Ereignisse auf die gemeinsame Enumeration `WebhookEventType`:

|WebhookEventType|Streifen|LemonSqueezy|Polar|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Stripe-Webhook-Verarbeitung

### Signaturüberprüfung

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

### Handler-Muster (Streifen)

Jeder Handler folgt einem konsistenten Muster:

1. Prüfen Sie, ob es sich um ein Sponsor-Anzeigenabonnement handelt (Sonderbehandlung)
2. Abonnementdatensätze über `WebhookSubscriptionService` aktualisieren
3. Extrahieren Sie Kundeninformationen und bereiten Sie E-Mail-Daten vor
4. Senden Sie die entsprechende Benachrichtigungs-E-Mail
5. Erfolg oder Misserfolg protokollieren

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

## LemonSqueezy Webhook-Verarbeitung

### Ereignistypzuordnung

LemonSqueezy verwendet verschiedene Ereignisnamen, die der gemeinsamen Enumeration zugeordnet sind:

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

### Benutzerdefinierter Datenzugriff

LemonSqueezy verwendet `custom_data` und `meta.custom_data` für Metadaten (anstelle von Stripes `metadata`):

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Polar Webhook-Verarbeitung

Polar verwendet eine strukturiertere Architektur mit separaten Dateien für Routing, Handhabung und Typen.

### Router-Muster

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

Der Router validiert Ereignistypen vor dem Versenden anhand einer Zulassungsliste und verhindert so nicht validierte dynamische Methodenaufrufe.

### Signaturüberprüfung (Polar)

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

### Robuste E-Mail-Verarbeitung

Polar-Handler packen E-Mail-Vorgänge in verschachtelte Try/Catch-Blöcke ein, sodass E-Mail-Fehler nie den Webhook scheitern lassen:

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

## Umgang mit Sponsor-Anzeigen

Alle drei Anbieter erkennen Sponsor-Anzeigenabonnements anhand von Metadaten und leiten sie an spezielle Handler weiter:

|Aktion|Funktion|Beschreibung|
|--------|----------|-------------|
|Zahlung bestätigt|`handleSponsorAdActivation()`|Setzt den Anzeigenstatus auf „Überprüfung ausstehend“.|
|Abonnement gekündigt|`handleSponsorAdCancellation()`|Bricht die Sponsorenanzeige ab|
|Zahlung erneuert|`handleSponsorAdRenewal()`|Verlängert das Enddatum der Anzeige|

## Best Practices

1. **Signaturen immer überprüfen** – niemals ungeprüfte Webhooks verarbeiten
2. **Rohtext zur Signaturüberprüfung verwenden** – JSON nach der Überprüfung separat analysieren
3. **200 schnell zurückgeben** – Zahlungsanbieter versuchen es bei Nicht-2xx-Antworten erneut
4. **E-Mail-Fehler isolieren** – E-Mail-Versand in verschachtelte Try/Catch-Funktionen einbinden
5. **Ereignistypen validieren** – vor dem Versenden anhand einer Zulassungsliste prüfen
6. **Protokoll mit strukturierten Daten** – Fügen Sie Ereignis-IDs und -Typen in alle Protokolleinträge ein
7. **Singleton-Anbieter verwenden** – `getOrCreateStripeProvider()` verhindert mehrere Instanzen
