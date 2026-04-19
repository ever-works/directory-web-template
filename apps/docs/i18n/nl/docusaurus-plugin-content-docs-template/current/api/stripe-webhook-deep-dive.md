---
id: stripe-webhook-deep-dive
title: "Stripe Webhook Deep Dive"
sidebar_label: "Stripe Webhook Deep Dive"
---

# Stripe Webhook – Diepgaande uitleg

Deze pagina behandelt de Stripe webhook-verwerker op `/api/stripe/webhook`, inclusief handtekeningverificatie, evenementstypen, verwerkingslogica en e-mailmeldingen.

## Overzicht

De webhook-verwerker verwerkt 9 Stripe-evenementstypen verdeeld over drie categorieën: afrekeningsuitkomsten, levenscyclus van abonnementen en facturering/betalingen. Elke handler werkt de database bij via `stripeProvider.handleWebhookEvent()` en verstuurt waar van toepassing e-mails.

## Handtekeningverificatie

Alle binnenkomende webhook-aanvragen worden geverifieerd via de Stripe-handtekeningmechanismen onder gebruikmaking van de `stripe-signature`-header en `STRIPE_WEBHOOK_SECRET`:

```typescript
const body = await request.text();
const signature = headers().get('stripe-signature');

const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

Als de handtekeningverificatie mislukt, wordt een 400-reactie geretourneerd en het evenement niet verwerkt.

## Mapping van evenementstypen

| Stripe-evenement | Interne handler | Beschrijving |
|-----------------|-----------------|-------------|
| `checkout.session.completed` | `handleCheckoutSessionCompleted` | Afrekeningssessie succesvol afgerond |
| `checkout.session.expired` | `handleCheckoutSessionExpired` | Afrekeningssessie verlopen zonder voltooiing |
| `customer.subscription.created` | `handleSubscriptionCreated` | Nieuw abonnement aangemaakt |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Abonnement gewijzigd (plan, status, opzegging) |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Abonnement opgezegd of verwijderd |
| `invoice.payment_succeeded` | `handleInvoicePaymentSucceeded` | Factuurebetaling geslaagd |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | Factuurebetaling mislukt |
| `customer.subscription.trial_will_end` | `handleTrialWillEnd` | Proefperiode eindigt binnenkort (3 dagen voor afloop) |
| `payment_intent.payment_failed` | `handlePaymentIntentFailed` | Directe betaalintent mislukt |

## Verwerkingsverloop

```typescript
// 1. Onbewerkte aanvraaginhoud lezen voor handtekeningverificatie
const body = await request.text();
const signature = headers().get('stripe-signature');

// 2. Webhook-handtekening verifiëren
const event = stripe.webhooks.constructEvent(body, signature, secret);

// 3. Evenementobject ophalen
const session = event.data.object;

// 4. Evenement routeren naar juiste handler
switch (event.type) {
  case 'checkout.session.completed':
    await handleCheckoutSessionCompleted(session);
    break;
  // ... overige handlers
}

// 5. 200 OK retourneren om bezorging te bevestigen
return NextResponse.json({ received: true });
```

## Beschrijving van eventhandlers

### 1. `handleCheckoutSessionCompleted`
Verwerkt succesvolle afrekeningssessies. Haalt het abonnement op via de sessiemetadata, werkt de databasestatus bij en verstuurt een welkomstmail. Als de sessie abonnementsmetadata bevat, wordt het abonnement actief gemaakt.

### 2. `handleCheckoutSessionExpired`
Verwerkt verlopen afrekeningssessies. Registreert het evenement voor debugdoeleinden; in de meeste configuraties zijn er geen databasewijzigingen nodig, aangezien er nog geen abonnement is aangemaakt.

### 3. `handleSubscriptionCreated`
Slaat het nieuwe abonnement op of werkt het bij in de database, waarbij de Stripe-abonnements-ID, klant-ID, status, huidige periode en proefdatums worden opgenomen. Werkt het abonnementsveld van de gebruiker bij.

### 4. `handleSubscriptionUpdated`
Verwerkt statuswijzigingen, planwijzigingen en opzeggingsschemawijzigingen. Werkt alle relevante abonnementsvelden bij, inclusief plankenmerken en actieve status.

### 5. `handleSubscriptionDeleted`
Stelt de abonnementsstatus in op `CANCELED` in de database. Werkt de gebruikersrecord bij om aan te geven dat er geen actief abonnement meer is.

### 6. `handleInvoicePaymentSucceeded`
Verwerkt geslaagde factuurbetalingen voor bestaande abonnementen. Werkt de factureringsperiode en de betalingsstatus bij. Verstuurt een betalingsbevestigingsmail indien geconfigureerd.

### 7. `handleInvoicePaymentFailed`
Verwerkt mislukte factuurbetalingen. Logt het mislukte bedrag en de factureringsperiode. Verstuurt een melding voor mislukte betaling en kan de abonnementsstatus bijwerken naar `PAST_DUE`.

### 8. `handleTrialWillEnd`
Verwerkt het evenement `customer.subscription.trial_will_end`, dat 3 dagen voor het einde van de proefperiode door Stripe wordt verstuurd. Verstuurt een herinneringsmail aan de gebruiker over het aanstaande einde van de proefperiode.

### 9. `handlePaymentIntentFailed`
Verwerkt mislukte betaalintents los van de factuurstroom. Logt de foutcode en het foutbericht voor foutopsporing.

## E-mailmeldingen

De webhook-verwerker verstuurt transactionele e-mails voor de volgende evenementen:

| Evenement | E-mailtype | Ontvanger |
|-------|------------|----------|
| `checkout.session.completed` | Welkomstmail | Gebruiker |
| `invoice.payment_failed` | Melding mislukte betaling | Gebruiker |
| `customer.subscription.trial_will_end` | Herinnering einde proefperiode | Gebruiker |

## Verwerking van sponsoradvertenties

De `handleCheckoutSessionCompleted`-handler bevat speciale logica voor afrekeningssessies die betrekking hebben op sponsoradvertenties (geïdentificeerd via sessiemetadata):

```typescript
// Detecteren of deze afrekening betrekking heeft op een sponsoradvertentie
const isSponsorAdCheckout = session.metadata?.type === 'sponsor_ad';

if (isSponsorAdCheckout) {
  // Sponsoradvertenties activeren na geslaagde betaling
  await activateSponsorAd(session.metadata.sponsorAdId, session);
} else {
  // Standaardstroom voor activering van abonnement
  await activateSubscription(session, stripeCustomerId);
}
```

## Plankenmerken

Wanneer een abonnement aangemaakt of bijgewerkt wordt, worden de bijbehorende plankenmerken in de database opgeslagen:

```typescript
// Plankenmerken ophalen en opslaan bij aanmaken van abonnement
const price = await stripe.prices.retrieve(priceId, {
  expand: ['product']
});
const features = price.product.metadata?.features
  ? JSON.parse(price.product.metadata.features)
  : [];

await updateUserPlanFeatures(userId, features);
```

## Foutafhandeling

| Status | Situatie | Behandeling |
|--------|----------|------------|
| 400 | Handtekening ontbreekt | Geeft fout terug, verwerkt niet |
| 400 | Handtekeningverificatie mislukt | Geeft fout terug, verwerkt niet |
| 200 | Onbekend evenementstype | Logt en bevestigt ontvangst |
| 500 | Databaseverwerking mislukt | Logt fout; Stripe kan opnieuw proberen |

:::caution
Webhook-handlers moeten idempotent zijn. Stripe kan hetzelfde evenement meerdere keren bezorgen bij netwerkstoringen of timeouts. Gebruik evenement-ID's als idempotentiesleutels bij het uitvoeren van databaseschrijfoperaties.
:::

## Gerelateerde pagina's

- [Stripe Checkout – Diepgaande uitleg](./stripe-checkout-deep-dive.md)
- [Stripe Abonnementen – Diepgaande uitleg](./stripe-subscription-deep-dive.md)
- [Stripe Betaalmethoden – Diepgaande uitleg](./stripe-payment-methods-deep-dive.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
