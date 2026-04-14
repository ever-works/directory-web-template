---
id: payment-endpoints
title: "Payment API Endpoints"
sidebar_label: "Payment API Endpoints"
---

# Betaal API Eindpunten

De template ondersteunt vier betalingsproviders: **Stripe**, **Lemon Squeezy**, **Polar** en **Solidgate**. Elke provider heeft zijn eigen set API-routes voor afrekening, abonnementsbeheer en webhookverwerking. Een generieke `/api/payment`-groep biedt provider-onafhankelijke abonnementsvragen.

## Stripe (`/api/stripe`)

Stripe is de meest volledige integratie met 17 route-handlers voor afrekening, abonnementen, betaalmethoden, setup-intents en producten.

### Afrekening

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/stripe/checkout` | Stripe Checkout-sessie aanmaken |

### Abonnementen

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/stripe/subscription` | Actief abonnement van huidige gebruiker ophalen |
| `POST` | `/api/stripe/subscription` | Nieuw abonnement aanmaken |
| `GET` | `/api/stripe/subscriptions` | Alle gebruikersabonnementen weergeven |
| `POST` | `/api/stripe/subscription/[subscriptionId]/cancel` | Abonnement opzeggen |
| `POST` | `/api/stripe/subscription/[subscriptionId]/reactivate` | Opgezegd abonnement heractiveren |
| `POST` | `/api/stripe/subscription/[subscriptionId]/update` | Abonnement bijwerken (plan wijzigen) |
| `POST` | `/api/stripe/subscription/portal` | Stripe Klantportaal-sessie aanmaken |

### Betaalmethoden

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Opgeslagen betaalmethoden weergeven |
| `POST` | `/api/stripe/payment-methods/create` | Nieuwe betaalmethode toevoegen |
| `PUT` | `/api/stripe/payment-methods/update` | Standaard betaalmethode bijwerken |
| `DELETE` | `/api/stripe/payment-methods/delete` | Betaalmethode verwijderen |
| `GET` | `/api/stripe/payment-methods/[id]` | Details van betaalmethode ophalen |

### Setup Intents

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/stripe/setup-intent` | Setup Intent aanmaken voor opslaan van betaalmethode |
| `GET` | `/api/stripe/setup-intent/[id]` | Status van Setup Intent ophalen |

### Betaalintents

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/stripe/payment-intent` | Eenmalige betaalintent aanmaken |

### Producten

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/stripe/products` | Beschikbare Stripe producten/prijzen weergeven |

### Webhook

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/stripe/webhook` | Stripe webhook-evenementverwerker |

De Stripe webhook-verwerker verwerkt evenementen zoals:
- `checkout.session.completed` - Voltooiing van afrekening
- `customer.subscription.created` - Nieuw abonnement
- `customer.subscription.updated` - Wijzigingen in abonnement
- `customer.subscription.deleted` - Opzegging van abonnement
- `invoice.payment_succeeded` - Geslaagde betaling
- `invoice.payment_failed` - Mislukte betaling

## Lemon Squeezy (`/api/lemonsqueezy`)

Lemon Squeezy biedt een eenvoudiger abonnementsmodel met 7 eindpunten.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Lemon Squeezy-afrekening aanmaken |
| `GET` | `/api/lemonsqueezy/list` | Abonnementen van gebruiker weergeven |
| `POST` | `/api/lemonsqueezy/cancel` | Abonnement opzeggen |
| `POST` | `/api/lemonsqueezy/reactivate` | Opgezegd abonnement heractiveren |
| `POST` | `/api/lemonsqueezy/update` | Abonnementsgegevens bijwerken |
| `POST` | `/api/lemonsqueezy/update-plan` | Abonnementsplan wijzigen |
| `POST` | `/api/lemonsqueezy/webhook` | Lemon Squeezy webhook-verwerker |

### Webhook-evenementen

De Lemon Squeezy webhook verwerkt:
- `subscription_created` - Nieuw abonnement
- `subscription_updated` - Planwijzigingen
- `subscription_cancelled` - Opzegging
- `subscription_payment_success` - Betalingsbevestiging
- `subscription_payment_failed` - Betalingsfout

## Polar (`/api/polar`)

Polar biedt 5 eindpunten voor afrekening en abonnementsbeheer.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/polar/checkout` | Polar-afrekeningssessie aanmaken |
| `POST` | `/api/polar/subscription/[subscriptionId]/cancel` | Abonnement opzeggen |
| `POST` | `/api/polar/subscription/[subscriptionId]/reactivate` | Abonnement heractiveren |
| `POST` | `/api/polar/subscription/portal` | Abonnementsportaal raadplegen |
| `POST` | `/api/polar/webhook` | Polar webhook-verwerker |

## Solidgate (`/api/solidgate`)

Solidgate is de minimaalste integratie met 2 eindpunten.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Solidgate-afrekening aanmaken |
| `POST` | `/api/solidgate/webhook` | Solidgate webhook-verwerker |

## Generieke betaling (`/api/payment`)

Provider-onafhankelijke betaaleindpunten voor het beheren van abonnementen ongeacht de onderliggende betalingsprovider.

| Methode | Pad | Beschrijving |
|--------|------|-------------|
| `GET` | `/api/payment/[subscriptionId]` | Abonnementsdetails ophalen via ID |
| `GET` | `/api/payment/account` | Betaalaccount voor huidige gebruiker ophalen |
| `GET` | `/api/payment/account/[userId]` | Betaalaccount ophalen voor specifieke gebruiker (beheerder) |

## Webhook-beveiliging

Alle webhook-eindpunten implementeren provider-specifieke handtekeningverificatie:

### Stripe

Stripe-webhooks verifiëren de `stripe-signature`-header met de omgevingsvariabele `STRIPE_WEBHOOK_SECRET` en de methode `stripe.webhooks.constructEvent()`.

### Lemon Squeezy

Lemon Squeezy-webhooks verifiëren de `x-signature`-header met HMAC-SHA256 en de `LEMONSQUEEZY_WEBHOOK_SECRET`.

### Polar

Polar-webhooks verifiëren aanvraaghandtekeningen met de `POLAR_WEBHOOK_SECRET`.

### Solidgate

Solidgate-webhooks gebruiken de ingebouwde handtekeningverificatie van de SDK met de `SOLIDGATE_SECRET_KEY`.

## Omgevingsvariabelen

### Stripe

| Variabele | Beschrijving |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API-geheime sleutel |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publiceerbare sleutel (clientzijde) |
| `STRIPE_WEBHOOK_SECRET` | Webhook-ondertekeningsgeheim |

### Lemon Squeezy

| Variabele | Beschrijving |
|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Lemon Squeezy API-sleutel |
| `LEMONSQUEEZY_STORE_ID` | Winkelidentificator |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook-ondertekeningsgeheim |

### Polar

| Variabele | Beschrijving |
|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Polar API-toegangstoken |
| `POLAR_WEBHOOK_SECRET` | Webhook-ondertekeningsgeheim |
| `POLAR_ORGANIZATION_ID` | Organisatie-identificator |

### Solidgate

| Variabele | Beschrijving |
|----------|-------------|
| `SOLIDGATE_MERCHANT_ID` | Handelaar-identificator |
| `SOLIDGATE_SECRET_KEY` | API-geheime sleutel |

## Authenticatievereisten

| Type eindpunt | Authenticatie vereist |
|--------------|---------------|
| Afrekening aanmaken | Ja (geauthenticeerde gebruiker) |
| Abonnementsbeheer | Ja (abonnementseigenaar) |
| Beheer van betaalmethoden | Ja (Stripe-klant) |
| Productoverzicht | Openbaar (Stripe producten) |
| Webhook-verwerkers | Handtekeningverificatie (geen sessie) |
| Generieke betaalvragen | Ja (accounteigenaar of beheerder) |
