---
id: webhook-api-endpoints
title: "Webhook API Endpoints"
sidebar_label: "Webhook API Endpoints"
---

# Webhook API-eindpunten

De template ondersteunt betalingswebhook-afhandelaars voor vier providers: Stripe, LemonSqueezy, Polar en Solidgate. Elk webhook-eindpunt verwerkt inkomende events van de bijbehorende betalingsprovider en beheert de levenscyclus van abonnementen, betalingsmeldingen en e-mailbezorging. Alle eindpunten verifiëren aanvraaghandtekeningen voor beveiliging.

## Overzicht

| Eindpunt | Provider | Handtekeningheader | Beschrijving |
|---|---|---|---|
| `/api/stripe/webhook` | Stripe | `stripe-signature` | Stripe betalings- en abonnementsevenementen verwerken |
| `/api/lemonsqueezy/webhook` | LemonSqueezy | `x-signature` | LemonSqueezy betalingsevenementen verwerken |
| `/api/polar/webhook` | Polar | `webhook-signature` | Polar betalingsevenementen verwerken |
| `/api/solidgate/webhook` | Solidgate | `x-signature` | Solidgate betalingsevenementen verwerken |

Alle webhook-eindpunten accepteren alleen POST-aanvragen en geven bij succes `{"received": true}` terug.

## Gedeelde architectuur

Alle vier webhook-afhandelaars volgen hetzelfde algemene patroon:

1. De onbewerkte aanvraagbody als tekst lezen (nodig voor handtekeningverificatie)
2. De handtekening extraheren uit providerspecifieke headers
3. De body en handtekening doorgeven aan de methode `handleWebhook()` van de provider voor verificatie en verwerking
4. Het verwerkte event doorsturen naar de juiste afhandelaar op basis van `WebhookEventType`
5. Bedrijfslogica uitvoeren (database-updates, e-mailmeldingen)
6. `{"received": true}` teruggeven om de webhook te bevestigen

### Veelgebruikte eventtypen

De enum `WebhookEventType` uit `lib/payment/types/payment-types` standaardiseert events voor alle providers:

| Eventtype | Beschrijving |
|---|---|
| `SUBSCRIPTION_CREATED` | Nieuw abonnement geactiveerd |
| `SUBSCRIPTION_UPDATED` | Abonnementsplan of details gewijzigd |
| `SUBSCRIPTION_CANCELLED` | Abonnement geannuleerd |
| `PAYMENT_SUCCEEDED` | Eenmalige betaling voltooid |
| `PAYMENT_FAILED` | Betaalpoging mislukt |
| `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Terugkerende abonnementsbetaling voltooid |
| `SUBSCRIPTION_PAYMENT_FAILED` | Terugkerende abonnementsbetaling mislukt |
| `SUBSCRIPTION_TRIAL_ENDING` | Proefperiode loopt bijna af |
| `REFUND_SUCCEEDED` | Terugbetaling verwerkt |
| `BILLING_PORTAL_SESSION_UPDATED` | Factureringsportaalsessie gewijzigd (alleen Stripe) |

## Stripe Webhook

```
POST /api/stripe/webhook
```

Verwerkt Stripe-webhookgebeurtenissen met handtekeningverificatie via de header `stripe-signature`. Dit is de meest uitgebreide webhook-afhandelaar, inclusief e-mailmeldingen voor alle eventtypen en beheer van sponsor-advertentieabonnementen.

**Vereiste header:**

| Header | Beschrijving |
|---|---|
| `stripe-signature` | Stripe-webhookhandtekening (formaat `t=...,v1=...`) |

**Ondersteunde events:**

| Stripe-event | Toegewezen type | Acties |
|---|---|---|
| `customer.subscription.created` | `SUBSCRIPTION_CREATED` | Database-update, welkomstmail |
| `customer.subscription.updated` | `SUBSCRIPTION_UPDATED` | Database-update, updatemail |
| `customer.subscription.deleted` | `SUBSCRIPTION_CANCELLED` | Database-update, annuleringsmail |
| `invoice.payment_succeeded` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` | Database-update, ontvangstmail |
| `invoice.payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` | Database-update, herinnering |
| `payment_intent.succeeded` | `PAYMENT_SUCCEEDED` | Bevestigingsmail |
| `payment_intent.payment_failed` | `PAYMENT_FAILED` | Mislukking-notificatiemail |
| `customer.subscription.trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` | Mail over aflopend proefabonnement |
| `billing_portal.session.updated` | `BILLING_PORTAL_SESSION_UPDATED` | Alleen loggen |

**Beheer van sponsor-advertenties:**

Stripe-webhooks detecteren sponsor-advertentieabonnementen via `metadata.type === "sponsor_ad"` in de abonnementsgegevens. Wanneer dit wordt gedetecteerd, activeren specifieke afhandelaars sponsor-advertenties, annuleren ze of verlengen ze deze, in plaats van reguliere abonnementen te verwerken.

**Foutreacties:**

| Status | Voorwaarde |
|---|---|
| 400 | Ontbrekende header `stripe-signature` |
| 400 | Webhook niet verwerkt (ongeldige handtekening) |
| 400 | Verwerking van webhook mislukt |

**Bron:** `template/app/api/stripe/webhook/route.ts`

## LemonSqueezy Webhook

```
POST /api/lemonsqueezy/webhook
```

Verwerkt LemonSqueezy-webhookgebeurtenissen met handtekeningverificatie via de header `x-signature`. Gebruikt een eventmapping-functie om LemonSqueezy-specifieke eventnamen te vertalen naar het generieke `WebhookEventType`.

**Vereiste header:**

| Header | Beschrijving |
|---|---|
| `x-signature` | LemonSqueezy-webhookhandtekening |

**Eventmapping:**

| LemonSqueezy-event | Toegewezen type |
|---|---|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

**Beheer van sponsor-advertenties:**

LemonSqueezy gebruikt `custom_data.type === "sponsor_ad"` of `meta.custom_data.type === "sponsor_ad"` om sponsor-advertentieabonnementen te identificeren.

**Bron:** `template/app/api/lemonsqueezy/webhook/route.ts`

## Polar Webhook

```
POST /api/polar/webhook
```

Verwerkt Polar-webhookgebeurtenissen met handtekeningverificatie via meerdere headers. Polar gebruikt drie headers voor beveiligingsverificatie en delegeert eventrouting naar een apart routermodule.

**Vereiste headers:**

| Header | Beschrijving |
|---|---|
| `webhook-signature` | HMAC SHA256-handtekening (formaat `v1,<hex_signature>`) |
| `webhook-timestamp` | Unix-tijdstempel van de webhookgebeurtenis |
| `webhook-id` | Unieke identificator voor de webhookbezorging |

**Ondersteunde events:**

| Polar-event | Beschrijving |
|---|---|
| `checkout.succeeded` | Checkout voltooid |
| `checkout.failed` | Checkout mislukt |
| `subscription.created` | Abonnement aangemaakt |
| `subscription.updated` | Abonnement bijgewerkt |
| `subscription.canceled` | Abonnement geannuleerd |
| `invoice.paid` | Factuurbetaling voltooid |
| `invoice.payment_failed` | Factuurbetaling mislukt |

**Verwerking:**

In tegenstelling tot de andere providers gebruikt de Polar-webhookafhandelaar een aparte functie `routeWebhookEvent()` uit een `router`-module en een hulpfunctie `validateWebhookPayload()` voor het valideren van de payloadstructuur voor handtekeningverificatie.

**Bron:** `template/app/api/polar/webhook/route.ts`

## Solidgate Webhook

```
POST /api/solidgate/webhook
```

Verwerkt Solidgate-webhookgebeurtenissen met handtekeningverificatie. Bevat in-memory idempotentiebescherming om dubbele verwerking van dezelfde webhookgebeurtenis te voorkomen.

**Vereiste header:**

| Header | Beschrijving |
|---|---|
| `x-signature` of `solidgate-signature` | Solidgate-webhookhandtekening |

**Idempotentie:**

De afhandelaar houdt een in-memory `Set` bij van verwerkte webhook-ID's. Dubbele webhooks geven `{"received": true}` terug zonder herverwerking. Webhook-ID's verlopen na 24 uur uit de cache.

**Opmerking:** De in-memory idempotentiecache blijft niet bewaard bij serverless functieaanroepen. In productie-serverless-omgevingen moet dit worden vervangen door een Redis- of database-ondersteunde oplossing.

**Ondersteunde events:**

De afhandelaar accepteert zowel de generieke `WebhookEventType`-constanten als op strings gebaseerde eventnamen (bijv. zowel `WebhookEventType.PAYMENT_SUCCEEDED` als `"payment_succeeded"`).

| Event | Acties |
|---|---|
| `payment_succeeded` | Betaling registreren |
| `payment_failed` | Mislukking registreren |
| `subscription_created` | Abonnement aanmaken |
| `subscription_updated` | Abonnement bijwerken |
| `subscription_cancelled` | Abonnement annuleren |
| `subscription_payment_succeeded` | Abonnementsbetaling registreren |
| `subscription_payment_failed` | Mislukte abonnementsbetaling registreren |
| `subscription_trial_ending` | Aflopend proefabonnement afhandelen |
| `refund_processed` | Terugbetaling loggen |

**GET-eindpunt:**

Solidgate biedt ook een GET-afhandelaar die een informatief bericht retourneert over het webhook-eindpunt:

```json
{
  "message": "Solidgate webhook endpoint",
  "instructions": "This endpoint accepts POST requests from Solidgate webhooks",
  "method": "POST"
}
```

**Bron:** `template/app/api/solidgate/webhook/route.ts`

## E-mailmeldingen

De Stripe-webhookafhandelaar verstuurt de meest uitgebreide e-mailmeldingen. Alle providers delegeren aan de `WebhookSubscriptionService` voor databasebewerkingen, maar e-mailsjablonen verschillen per provider.

| E-mailtype | Trigger |
|---|---|
| Welkom / Nieuw abonnement | Abonnement aangemaakt |
| Abonnementsupdate | Abonnementsplan gewijzigd |
| Annuleringsbevestiging | Abonnement geannuleerd |
| Betalingsontvangst | Abonnement of eenmalige betaling geslaagd |
| Betaling mislukt / Herinnering | Betaalpoging mislukt |
| Proefabonnement verloopt | Proefperiode loopt bijna af |

E-mailconfiguratie wordt geladen uit `lib/config/server-config` via `getEmailConfig()` en bevat de bedrijfsnaam, bedrijfs-URL en het ondersteunings-e-mailadres.

## Belangrijke implementatiedetails

- **Handtekeningverificatie:** Alle providers verifiëren webhookhandtekeningen voor de verwerking van events. Ongeldige handtekeningen resulteren in een 400-reactie.
- **Onbewerkte body-verwerking:** Webhooks lezen de aanvraagbody als tekst via `request.text()` in plaats van `request.json()`, omdat handtekeningverificatie de onbewerkte, ongewijzigde payload vereist.
- **WebhookSubscriptionService:** De gedeelde klasse `WebhookSubscriptionService` verwerkt databasebewerkingen voor abonnementslevenscyclus-events voor alle providers.
- **Sponsor-advertentiedetectie:** Stripe- en LemonSqueezy-webhooks detecteren sponsor-advertentieabonnementen via metadata en sturen ze door naar aparte afhandelaars voor activering, annulering en verlenging van advertenties.
- **Graceful foutafhandeling:** E-mailverzendingsfouten worden opgevangen en gelogd, maar zorgen er niet voor dat de webhook een fout retourneert. De webhook bevestigt altijd ontvangst om herhaalpogingen van de provider te voorkomen.
