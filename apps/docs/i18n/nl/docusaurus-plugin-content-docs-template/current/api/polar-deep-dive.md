---
id: polar-deep-dive
title: "Polar Deep Dive"
sidebar_label: "Polar Deep Dive"
---

# Polar – Diepgaande uitleg

Deze pagina behandelt de volledige Polar-integratie, inclusief het aanmaken van afrekenlinks, abonnementsbeheer, klantportaal en webhookverwerking.

## Overzicht

Polar is een modern betalingsplatform ontworpen voor software- en digitale producten. De integratie ondersteunt zowel eenmalige betalingen als abonnementen via het afrekeningssysteem van Polar, met webhookgestuurde levenscyclusbeheer. Polar gebruikt organisatie-gebonden producten en de `@polar-sh/sdk` voor API-interacties.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/polar/checkout` | Sessie vereist | Afrekeningssessie aanmaken (abonnement of eenmalig) |
| `GET` | `/api/polar/checkout` | Sessie vereist | Status van afrekeningssessie ophalen |
| `POST` | `/api/polar/webhook` | Handtekening vereist | Inkomende webhook-evenementen verwerken |

## Afrekening aanmaken (POST)

### Aanvraagbody

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // Polar product ID
  mode?: 'one_time' | 'subscription';       // Defaults to "subscription"
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Voorbeeldaanvraag

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Hoe het werkt

De afrekenroute verwerkt twee flows:

**Abonnementsmodus:**
1. Authenticeert de gebruiker en lost de Polar-klant op
2. Saniteert metadata (verwijdert `undefined`-waarden — Polar weigert ze)
3. Roept `polarProvider.createSubscription()` aan, wat een afrekeningssessie aanmaakt
4. Geeft de afrekenURL terug uit het abonnementsresultaat

**Eenmalige betalingsmodus:**
1. Authenticeert de gebruiker en lost de Polar-klant op
2. Gebruikt de Polar SDK rechtstreeks om een afrekening aan te maken
3. Geeft de afrekenURL terug

### Metadata-sanering

Polar vereist dat alle metadatawaarden niet-null en niet-undefined zijn:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Voeg alleen gedefinieerde waarden toe
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Geslaagde reactie (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Afrekeningssessie ophalen (GET)

### Queryparameters

| Parameter | Vereist | Beschrijving |
|-----------|----------|-------------|
| `checkout_id` | Ja | Polar afrekeningssessie-ID |

### Geslaagde reactie (200)

```json
{
  "checkout": { "...volledig Polar checkout-object..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Abonnementsbeheer

### Abonnementen aanmaken

De methode `PolarProvider.createSubscription()` maakt een afrekening voor het abonnement aan:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Abonnementen opzeggen

Polar ondersteunt twee opzeggingsstrategieën:

```typescript
// Opzeggen aan het einde van de periode (zachte opzegging)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Onmiddellijk opzeggen (harde opzegging)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

De provider valideert de abonnementsstatus voor opzegging:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Abonnementen heractiveren

Abonnementen die gepland zijn voor opzegging kunnen worden heractiveerd:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Abonnementen bijwerken

Planwijzigingen worden afgehandeld via `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Webhookverwerking

### Handtekeningverificatie

Polar gebruikt de functie `validateEvent` uit `@polar-sh/sdk/webhooks` voor verificatie. De webhook vereist drie headers:

| Header | Beschrijving |
|--------|-------------|
| `webhook-signature` | HMAC SHA256-handtekening (formaat: `v1,<hex_signature>`) |
| `webhook-timestamp` | Unix-tijdstempel van het evenement |
| `webhook-id` | Unieke webhook-afleveringsID |

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // Verwerkte JSON
  signatureHeader, // Volledige "v1,..."-handtekening
  bodyText,        // Onbewerkte body voor verificatie
  timestampHeader,
  webhookIdHeader
);
```

### Evenementtypen

| Polar-evenement | Interne mapping |
|-------------|-----------------|
| `checkout.succeeded` | Betaling geslaagd |
| `checkout.failed` | Betaling mislukt |
| `subscription.created` | Abonnement aangemaakt |
| `subscription.updated` | Abonnement bijgewerkt |
| `subscription.canceled` | Abonnement opgezegd |
| `invoice.paid` | Abonnementsbetaling geslaagd |
| `invoice.payment_failed` | Abonnementsbetaling mislukt |

### Webhook-router

Evenementen worden verzonden via een speciaal routermodule:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

De router koppelt evenementtypen aan verwerkersfuncties die de database bijwerken via `WebhookSubscriptionService` en e-mailmeldingen verzenden.

### Payload-validatie

Het webhook-eindpunt valideert de payloadstructuur voor verwerking:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Klantbeheer

De provider volgt het standaard drietraps resolutiepatroon:

1. Controleer gebruikersmetadata op de Polar klant-ID
2. Zoek de `PaymentAccount`-databasetabel op
3. Maak een nieuwe klant aan via de Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Foutafhandeling

| Status | Fout | Oorzaak |
|--------|-------|-------|
| 400 | `Product ID is required` | Ontbrekend `productId` in aanvraag |
| 400 | `Checkout ID is required` | GET-aanvraag mist `checkout_id` |
| 400 | `No signature provided` | Webhook mist handtekeningheader |
| 401 | `Unauthorized` | Geen geauthenticeerde sessie |
| 500 | `Failed to create checkout` | Afreken-URL niet beschikbaar |
| 500 | `Configuration error` | Polar-provider niet geconfigureerd |
| 503 | Betalingsconfiguratie onvolledig | Organisatie heeft de betalingsconfiguratie in Polar niet voltooid |

Het afrekeningseindpunt bevat speciale detectie voor betalingsconfiguratieproblemen:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Configuratievereisten

| Variabele | Vereist | Beschrijving |
|----------|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Ja | Polar API-toegangstoken |
| `POLAR_WEBHOOK_SECRET` | Ja | Webhook-ondertekeningsgeheim |
| `POLAR_ORGANIZATION_ID` | Ja | Polar organisatie-ID |

## Beveiligingsoverwegingen

- Webhookhandtekeningen worden geverifieerd met de functie `validateEvent` uit de officiële SDK
- Onbewerkte bodytekst wordt bewaard voor handtekeningverificatie (JSON-herserializatie kan de body wijzigen)
- Drie afzonderlijke headers worden gecontroleerd: handtekening, tijdstempel en webhook-ID
- Metadata wordt server-side gesaneerd om injectie van undefined-waarden te voorkomen
- Foutreacties gebruiken `safeErrorResponse` om informatielekken te voorkomen

## Gerelateerde pagina's

- [LemonSqueezy – Diepgaande uitleg](./lemonsqueezy-deep-dive.md)
- [Solidgate – Diepgaande uitleg](./solidgate-deep-dive.md)
- [Stripe Checkout – Diepgaande uitleg](./stripe-checkout-deep-dive.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
