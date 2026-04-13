---
id: lemonsqueezy-deep-dive
title: "LemonSqueezy Deep Dive"
sidebar_label: "LemonSqueezy Deep Dive"
---

# LemonSqueezy – Diepgaande uitleg

Deze pagina behandelt de volledige LemonSqueezy-integratie, inclusief het aanmaken van afrekenlinks, abonnementsbeheer, webhookverwerking en productsynchronisatie.

## Overzicht

LemonSqueezy is een merchant-of-record betalingsprovider die belastinginning, compliance en betalingsverwerking verzorgt. De integratie maakt gebruik van LemonSqueezy's gehoste afrekenflow, variant-gebaseerd productmodel en webhooksysteem. In tegenstelling tot Stripe ondersteunt LemonSqueezy geen setup intents of direct beheer van betaalmethoden — alle betalingsafhandeling vindt plaats via hun gehoste UI.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Sessie vereist | Afrekeningssessie aanmaken vanuit JSON-body |
| `GET` | `/api/lemonsqueezy/checkout` | Geen | Afrekeningssessie aanmaken via queryparameters |
| `POST` | `/api/lemonsqueezy/webhook` | Handtekening vereist | Inkomende webhook-evenementen verwerken |

## Afrekening aanmaken (POST)

### Aanvraagbody

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // LemonSqueezy product variant ID
  dark?: boolean;                           // Enable dark mode checkout
  customPrice?: number;                     // Custom price in cents (optional)
  metadata?: Record<string, string>;        // Additional metadata
}
```

### Voorbeeldaanvraag

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### Hoe het werkt

1. Authenticeert de gebruiker via `auth()`
2. Valideert de aanvraagbody met `validateCheckoutRequestBody()`
3. Roept `lemonsqueezyProvider.createCustomCheckout()` aan met gebruikersmetadata
4. Geeft de afrekenURL terug

### Provider-implementatie

De methode `createCustomCheckout` maakt een LemonSqueezy-afrekening aan met uitgebreide configuratie:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Geslaagde reactie (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Afrekening via queryparameters (GET)

Het GET-eindpunt ondersteunt het aanmaken van afrekenlinks via queryparameters voor directe linkscenario's:

| Parameter | Vereist | Beschrijving |
|-----------|----------|-------------|
| `variantId` | Ja | LemonSqueezy variant-ID |
| `email` | Ja | E-mailadres van klant |
| `customPrice` | Nee | Aangepaste prijs in centen |
| `metadata` | Nee | JSON-string met metadata |

## Abonnementsbeheer

### Abonnementen aanmaken

Abonnementen worden aangemaakt via de afrekenflow. De methode `createSubscription` omhult de LemonSqueezy checkout API:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Abonnementen opzeggen

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Abonnementen bijwerken

De bijwerkmethode ondersteunt planwijzigingen, pauzeren, hervatten en heractiveren:

```typescript
// Planwijziging via variant-ID
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Abonnement pauzeren
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Abonnement hervatten
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Webhookverwerking

### Handtekeningverificatie

LemonSqueezy gebruikt HMAC SHA-256 voor webhookhandtekeningverificatie. De provider verifieert handtekeningen met de Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Evenementmapping

| LemonSqueezy-evenement | Intern type |
|-------------------|---------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

### Structuur van webhookverwerker

Elke verwerker volgt een consistent patroon:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Herkenning van sponsor-advertenties

LemonSqueezy gebruikt `custom_data` in plaats van Stripe's `metadata`:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Klantbeheer

De provider volgt hetzelfde drietraps patroon voor klantresolutie als de andere providers:

1. Controleer gebruikersmetadata op `lemonsqueezy_customer_id`
2. Zoek de `PaymentAccount`-databasetabel op
3. Maak een nieuwe klant aan via de LemonSqueezy API

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Foutafhandeling

| Status | Foutcode | Oorzaak |
|--------|-----------|-------|
| 400 | `VALIDATION_ERROR` | Ongeldige aanvraagbody of parameters |
| 401 | `Unauthorized` | Geen geauthenticeerde sessie |
| 500 | `CONFIGURATION_ERROR` | Ontbrekende omgevingsvariabelen |
| 500 | `INTERNAL_ERROR` | Niet-afgehandelde fout |
| 503 | `PAYMENT_SERVICE_ERROR` | LemonSqueezy API niet beschikbaar |

## Configuratievereisten

| Variabele | Vereist | Beschrijving |
|----------|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Ja | LemonSqueezy API-sleutel |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Ja | Webhook-ondertekeningsgeheim |
| `LEMONSQUEEZY_STORE_ID` | Ja | Numerieke winkel-ID |

## Beperkingen

- **Geen setup intents**: LemonSqueezy ondersteunt het opslaan van kaarten zonder aankoop niet. De methode `createSetupIntent` gooit een fout.
- **Geen directe terugbetaalAPI**: Terugbetalingen moeten worden verwerkt via het LemonSqueezy-dashboard.
- **Variant-gebaseerde prijsstelling**: Producten gebruiken variant-ID's in plaats van prijs-ID's. Planwijzigingen gebruiken `variantId`.

## Beveiligingsoverwegingen

- Webhookhandtekeningen worden geverifieerd met HMAC SHA-256
- De onbewerkte body-tekst wordt gebruikt voor handtekeningverificatie om problemen met JSON-herserializatie te voorkomen
- API-sleutels worden nooit blootgesteld aan de client
- In de ontwikkelingsmodus worden logs gesaneerd voor PII (e-mailadressen worden gedeeltelijk verborgen)

## Gerelateerde pagina's

- [Stripe Checkout – Diepgaande uitleg](./stripe-checkout-deep-dive.md)
- [Polar – Diepgaande uitleg](./polar-deep-dive.md)
- [Solidgate – Diepgaande uitleg](./solidgate-deep-dive.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
