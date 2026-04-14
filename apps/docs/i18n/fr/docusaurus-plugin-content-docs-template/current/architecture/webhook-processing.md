---
id: webhook-processing
title: Traitement des webhooks
sidebar_label: Webhooks
sidebar_position: 67
---

# Traitement des webhooks

## Aperçu

Le modèle Ever Works traite les webhooks entrants de trois fournisseurs de paiement : **Stripe**, **Lemon Squeezy** et **Polar**. Chaque fournisseur dispose d'une route API dédiée qui vérifie les signatures, normalise les types d'événements en une énumération `WebhookEventType` commune et distribue au gestionnaire les fonctions pour la gestion des abonnements, le suivi des paiements et les notifications par e-mail.

## Architecture

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

## Fichiers sources

|Fichier|Objectif|
|------|---------|
|`template/app/api/stripe/webhook/route.ts`|Gestionnaire de webhooks Stripe|
|`template/app/api/lemonsqueezy/webhook/route.ts`|Gestionnaire de webhook LemonSqueezy|
|`template/app/api/polar/webhook/route.ts`|Point d'entrée du webhook polaire|
|`template/app/api/polar/webhook/router.ts`|Routage des événements polaires|
|`template/app/api/polar/webhook/handlers.ts`|Gestionnaires d'événements polaires|
|`template/app/api/polar/webhook/types.ts`|Définitions des types de webhooks polaires|
|`template/app/api/polar/webhook/utils.ts`|Fonctions utilitaires polaires|

## Types d'événements courants

Tous les fournisseurs normalisent leurs événements selon l'énumération partagée `WebhookEventType` :

|WebhookEventType|Rayure|CitronSqueezy|Polaire|
|------------------|--------|--------------|-------|
|`SUBSCRIPTION_CREATED`|`customer.subscription.created`|`subscription_created`|`subscription.created`|
|`SUBSCRIPTION_UPDATED`|`customer.subscription.updated`|`subscription_updated`|`subscription.updated`|
|`SUBSCRIPTION_CANCELLED`|`customer.subscription.deleted`|`subscription_cancelled`|`subscription.canceled`|
|`PAYMENT_SUCCEEDED`|`payment_intent.succeeded`|`order_created`|`checkout.succeeded`|
|`PAYMENT_FAILED`|`payment_intent.payment_failed`| -- |`checkout.failed`|
|`SUBSCRIPTION_PAYMENT_SUCCEEDED`|`invoice.payment_succeeded`|`subscription_payment_success`|`invoice.paid`|
|`SUBSCRIPTION_PAYMENT_FAILED`|`invoice.payment_failed`|`subscription_payment_failed`|`invoice.payment_failed`|
|`SUBSCRIPTION_TRIAL_ENDING`|`customer.subscription.trial_will_end`|`subscription_trial_will_end`| -- |

## Traitement des webhooks Stripe

### Vérification des signatures

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

### Modèle de gestionnaire (rayure)

Chaque gestionnaire suit un modèle cohérent :

1. Vérifier s'il s'agit d'un abonnement à une annonce sponsor (traitement particulier)
2. Mettre à jour les enregistrements d'abonnement via `WebhookSubscriptionService`
3. Extraire les informations client et préparer les données de courrier électronique
4. Envoyer un e-mail de notification approprié
5. Enregistrer le succès ou l'échec

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

## Traitement des webhooks LemonSqueezy

### Mappage des types d'événements

LemonSqueezy utilise différents noms d'événements mappés à l'énumération commune :

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

### Accès aux données personnalisé

LemonSqueezy utilise `custom_data` et `meta.custom_data` pour les métadonnées (au lieu du `metadata` de Stripe) :

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
    const customData = data.custom_data as Record<string, string> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
    return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Traitement des webhooks polaires

Polar utilise une architecture plus structurée avec des fichiers séparés pour le routage, la gestion et les types.

### Modèle de routeur

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

Le routeur valide les types d'événements par rapport à une liste autorisée avant la distribution, empêchant ainsi les appels de méthode dynamique non validés.

### Vérification de la signature (Polar)

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

### Gestion résiliente des e-mails

Les gestionnaires Polar encapsulent les opérations de courrier électronique dans des blocs try/catch imbriqués afin que les échecs de courrier électronique ne fassent jamais échouer le webhook :

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

## Gestion des publicités des sponsors

Les trois fournisseurs détectent les abonnements aux publicités des sponsors via des métadonnées et les acheminent vers des gestionnaires dédiés :

|Action|Fonction|Descriptif|
|--------|----------|-------------|
|Paiement confirmé|`handleSponsorAdActivation()`|Définit le statut de l'annonce sur En attente d'examen|
|Abonnement annulé|`handleSponsorAdCancellation()`|Annule l'annonce du sponsor|
|Paiement renouvelé|`handleSponsorAdRenewal()`|Prolonge la date de fin de l'annonce|

## Meilleures pratiques

1. **Toujours vérifier les signatures** : ne traitez jamais de webhooks non vérifiés
2. **Utiliser le corps brut pour la vérification de la signature** -- analyser JSON séparément après vérification
3. **Renvoyer 200 rapidement** : les fournisseurs de paiement réessayent sur des réponses non-2xx
4. **Isoler les échecs de courrier électronique** - envelopper l'envoi de courrier électronique dans un essai/catch imbriqué
5. **Valider les types d'événements** - vérifier par rapport à une liste verte avant de les envoyer
6. **Journal avec données structurées** : incluez les ID et les types d'événements dans toutes les entrées du journal.
7. **Utiliser des fournisseurs singleton** -- `getOrCreateStripeProvider()` empêche plusieurs instances
