---
id: stripe-subscription-deep-dive
title: "Stripe Subscription Deep Dive"
sidebar_label: "Stripe Subscription Deep Dive"
---

# Stripe Abonnementen – Diepgaande uitleg

Deze pagina behandelt alle routes voor abonnementsbeheer: aanmaken, bijwerken, opzeggen en de onderliggende providermethoden met voorbeelden van aanvragen en reacties.

## Overzicht

De abonnements-API biedt volledig levenscyclusbeheer voor Stripe-abonnementen. De API ondersteunt het aanmaken van abonnementen met betaalmethoden en proefperioden, het bijwerken van plannen of opzeggingsinstellingen, en het opzeggen van abonnementen onmiddellijk of aan het einde van de factureringsperiode.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/stripe/subscription` | Sessie vereist | Een nieuw abonnement aanmaken |
| `PUT` | `/api/stripe/subscription` | Sessie vereist | Een bestaand abonnement bijwerken |
| `DELETE` | `/api/stripe/subscription` | Sessie vereist | Een abonnement opzeggen |

## Abonnement aanmaken (POST)

### Aanvraagbody

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Optional trial period in days
}
```

### Voorbeeldaanvraag

```bash
curl -X POST /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "paymentMethodId": "pm_1234567890abcdef",
    "trialPeriodDays": 14
  }'
```

### Hoe het werkt

De route-handler voert de volgende stappen uit:

1. Authenticeert de gebruiker via `auth()`
2. Lost een Stripe-klant op of maakt er een aan via `stripeProvider.getCustomerId()`
3. Roept `stripeProvider.createSubscription()` aan met de klant-ID, prijs, betaalmethode, proefdagen en metadata

### Provider-implementatie

Binnen `StripeProvider.createSubscription()`:

```typescript
// Betaalmethode koppelen aan klant
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Instellen als standaard betaalmethode
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Abonnement aanmaken
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Zonder proefperiode: onmiddellijk afschrijven
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Geslaagde reactie (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix-tijdstempel
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix-tijdstempel of null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." indien beschikbaar
}
```

## Abonnement bijwerken (PUT)

### Aanvraagbody

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Vereist: te bijwerken abonnement
  priceId?: string;                // Nieuwe prijs-ID (planwijziging)
  cancelAtPeriodEnd?: boolean;     // Opzegging plannen
}
```

### Voorbeeldaanvraag

```bash
curl -X PUT /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "priceId": "price_0987654321fedcba",
    "cancelAtPeriodEnd": false
  }'
```

### Provider-implementatie

De methode `updateSubscription` verwerkt planwijzigingen door het abonnementsitem te vervangen:

```typescript
if (priceId) {
  const existingSubscription = await this.stripe.subscriptions.retrieve(subscriptionId);
  if (existingSubscription.items.data[0]) {
    updateParams.items = [{
      id: existingSubscription.items.data[0].id,
      price: priceId
    }];
  }
}
```

De methode ondersteunt ook het instellen van `cancel_at_period_end`, `cancel_at` en het bijwerken van metadata.

### Geslaagde reactie (200)

Geeft dezelfde `SubscriptionInfo`-structuur terug met de bijgewerkte waarden.

## Abonnement opzeggen (DELETE)

### Aanvraagbody

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Vereist: te opzeggen abonnement
  cancelAtPeriodEnd?: boolean;      // true = opzeggen aan het einde van de periode, false = onmiddellijk
}
```

### Voorbeeldaanvraag

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Provider-implementatie

De opzeggingslogica ondersteunt twee strategieën:

```typescript
if (cancelAtPeriodEnd) {
  // Zachte opzegging: abonnement blijft actief tot einde van de periode
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Harde opzegging: abonnement eindigt onmiddellijk
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Geslaagde reactie (200)

```json
{
  "id": "sub_1234567890abcdef",
  "customerId": "cus_1234567890abcdef",
  "status": "active",
  "cancelAtPeriodEnd": true,
  "cancelAt": null,
  "currentPeriodEnd": 1643673600,
  "trialEnd": null,
  "priceId": "price_1234567890abcdef"
}
```

## Statusmapping voor abonnementen

De provider koppelt Stripe-statussen aan de interne `SubscriptionStatus`-opsomming:

| Stripe-status | Interne status |
|---------------|-----------------|
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |
| `trialing` | `TRIALING` |
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `unpaid` | `UNPAID` |

## Metadatatracering

Alle abonnementsoperaties voegen `userId` uit de sessie toe aan de abonnementsmetadata:

```typescript
metadata: {
  userId: session.user.id
}
```

Hierdoor kunnen webhookverwerkers abonnementen reconciliëren met interne gebruikersrecords.

## Foutafhandeling

| Status | Fout | Oorzaak |
|--------|-------|-------|
| 400 | `Failed to create customer` | Klantresolutie mislukt |
| 401 | `Unauthorized` | Geen geauthenticeerde sessie |
| 500 | `Failed to create subscription` | Stripe API-fout bij aanmaken |
| 500 | `Failed to update subscription` | Stripe API-fout bij bijwerken |
| 500 | `Failed to cancel subscription` | Stripe API-fout bij opzeggen |

## Beveiligingsoverwegingen

- Alle abonnementseindpunten vereisen authenticatie
- Koppeling van betaalmethoden en instelling als standaard worden server-side uitgevoerd
- De vlag `off_session` wordt alleen ingesteld voor abonnementen zonder proefperiode om automatische afschrijvingen mogelijk te maken
- Abonnementsmetadata bevat altijd de ID van de geauthenticeerde gebruiker voor auditering
- In de ontwikkelingsmodus worden abonnementsupdates gelogd met alleen niet-gevoelige velden

## Gerelateerde pagina's

- [Stripe Checkout – Diepgaande uitleg](./stripe-checkout-deep-dive.md)
- [Stripe Webhooks – Diepgaande uitleg](./stripe-webhook-deep-dive.md)
- [Stripe Betaalmethoden – Diepgaande uitleg](./stripe-payment-methods-deep-dive.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
