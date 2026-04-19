---
id: stripe-checkout-deep-dive
title: "Stripe Checkout Deep Dive"
sidebar_label: "Stripe Checkout Deep Dive"
---

# Stripe Checkout – Diepgaande uitleg

Deze pagina behandelt de volledige Stripe afrekenflow, inclusief het aanmaken van sessies, het oplossen van prijs-ID's, valutaafhandeling, omleidings-URL's, succes-/annuleringsflows en het doorgeven van metadata.

## Overzicht

De Stripe afrekenintegratie biedt een server-side API die Stripe Checkout-sessies aanmaakt voor zowel eenmalige betalingen als abonnementen. De flow authenticeert de gebruiker, lost een Stripe-klant op of maakt er een aan, bouwt regelitems op met optionele proefperiodeondersteuning en geeft een gehoste afrekenURL terug.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `POST` | `/api/stripe/checkout` | Sessie vereist | Een nieuwe afrekeningssessie aanmaken |
| `GET` | `/api/stripe/checkout` | Sessie vereist | Een bestaande afrekeningssessie ophalen |

## Afrekeningssessie aanmaken (POST)

### Aanvraagbody

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (e.g., "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Defaults to "one_time"
  trialPeriodDays?: number;                 // Trial days (subscription mode only, default: 0)
  billingInterval?: 'month' | 'year';       // Billing interval (default: "month")
  trialAmountId?: string;                   // Price ID for trial setup fee
  isAuthorizedTrialAmount?: boolean;        // Whether trial amount is authorized
  successUrl: string;                       // Redirect URL after success
  cancelUrl: string;                        // Redirect URL after cancel
  metadata?: Record<string, string>;        // Custom metadata (planId, planName, etc.)
}
```

### Voorbeeldaanvraag

```bash
curl -X POST /api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "priceId": "price_1234567890abcdef",
    "mode": "subscription",
    "trialPeriodDays": 14,
    "billingInterval": "month",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": {
      "planId": "pro_plan",
      "planName": "Pro Plan"
    }
  }'
```

### Geslaagde reactie (200)

```json
{
  "data": {
    "id": "cs_test_1234567890abcdef",
    "url": "https://checkout.stripe.com/pay/cs_test_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Modusmapping

De API koppelt inkomende modi aan het verwachte `Mode`-type van Stripe:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` wordt gekoppeld aan de Stripe `payment`-modus
- `subscription` wordt gekoppeld aan de Stripe `subscription`-modus
- Elke andere waarde wordt gekoppeld aan de `setup`-modus

## Klantresolutie

Voor het aanmaken van een afrekeningssessie lost de API een Stripe-klant op of maakt deze aan:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

De methode `getCustomerId` volgt een drietraps resolutie:

1. **Metadatacontrole** — Zoekt naar `stripe_customer_id` in gebruikersmetadata
2. **Databaseopzoeking** — Zoekt in de tabel `PaymentAccount` naar een bestaand record
3. **Nieuw aanmaken** — Maakt een nieuwe Stripe-klant aan en synchroniseert met de database

Als het aanmaken van de klant mislukt, geeft het eindpunt een `400`-fout terug.

## Proefperiodeconfiguratie

Proefperioden vereisen dat aan twee voorwaarden wordt voldaan:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Wanneer een proefperiode is ingeschakeld, is `trialAmountId` vereist. Hiermee kan een installatiekosten worden berekend tijdens de proefperiode. De hulpfunctie `buildCheckoutLineItems` bouwt regelitems op die zowel de abonnementsprijs als het optionele proefbedrag bevatten.

Als `hasTrial` waar is maar `trialAmountId` ontbreekt, geeft het eindpunt het volgende terug:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Abonnementsspecifieke configuratie

Wanneer de modus `subscription` is, wordt aanvullende configuratie toegepast via `applySubscriptionConfig`:

```typescript
if (stripeMode === 'subscription') {
  applySubscriptionConfig(checkoutParams, {
    userId: session.user.id || '',
    planId: metadata.planId,
    planName: metadata.planName,
    billingInterval,
    trialPeriodDays: hasTrial ? trialPeriodDays : 0
  });
}
```

Dit koppelt abonnementsmetadata inclusief `userId`, `planId`, `planName` en factureringsinterval aan de `subscription_data` van de afrekeningssessie.

## Metadata doorgeven

Metadata uit de aanvraag wordt samengevoegd met de sessiegebruikersgegevens:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Dit zorgt ervoor dat gebruikersidentiteitsinformatie (ID, e-mail, naam) altijd is gekoppeld aan de afrekeningssessie voor reconciliatie in webhookverwerkers.

## Afrekeningssessie ophalen (GET)

### Queryparameters

| Parameter | Vereist | Beschrijving |
|-----------|----------|-------------|
| `session_id` | Ja | Stripe afrekeningssessie-ID |

### Voorbeeldaanvraag

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Geslaagde reactie (200)

```json
{
  "session": { "...volledig Stripe checkout-sessieobject..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

De sessie wordt opgehaald met uitgebreide `line_items`- en `subscription`-gegevens:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Ondersteuning voor meerdere valuta

Valutaafhandeling wordt geconfigureerd via `stripe.config.ts`. Het `STRIPE_CONFIG`-object koppelt plannen aan valutaspecifieke prijs-ID's:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '€' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Gebruik `getStripePriceConfig(plan, currency, interval)` om de juiste prijs-ID op te lossen voor een gegeven plan, valuta en factureringsinterval.

## Dynamische prijsstelling

Wanneer `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, haalt het eindpunt `/api/stripe/products` producten en prijzen rechtstreeks op uit de Stripe API met een cache-TTL van 5 minuten. Producten moeten de volgende metadatasleutels hebben ingesteld in het Stripe Dashboard:

- `plan` — Plantype (`free`, `standard`, `premium`)
- `type` — Producttype (`subscription`, `sponsor_ad`)
- `features` — JSON-array van functiestrings
- `annualDiscount` — Jaarlijks kortingspercentage

## Configuratievereisten

| Variabele | Vereist | Beschrijving |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Ja | Stripe geheime API-sleutel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ja | Stripe publiceerbare sleutel |
| `STRIPE_WEBHOOK_SECRET` | Ja | Webhook-ondertekeningsgeheim |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Nee | Dynamische prijsstelling inschakelen |
| `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD` | Voorwaardelijk | Prijs-ID's per plan/valuta |

## Foutafhandeling

| Status | Fout | Oorzaak |
|--------|-------|-------|
| 400 | `Failed to create customer` | Klantresolutie/-aanmaak mislukt |
| 400 | `Invalid trial configuration` | Proefperiode ingeschakeld zonder `trialAmountId` |
| 400 | `Session ID is required` | GET-aanvraag mist de parameter `session_id` |
| 401 | `Unauthorized` | Geen geauthenticeerde sessie |
| 500 | `Failed to create checkout session` | Stripe API-fout of interne fout |

In de ontwikkelingsmodus bevatten foutreacties een veld `details` met de stacktrace.

## Beveiligingsoverwegingen

- Alle afrekeningseindpunten vereisen een geauthenticeerde sessie via `auth()`
- De Stripe geheime sleutel wordt nooit blootgesteld aan de client
- Metadata wordt server-side samengevoegd; clients kunnen gebruikersidentiteit niet vervalsen
- Afrekeningssessies zijn gekoppeld aan de Stripe-klant van de geauthenticeerde gebruiker
- Foutberichten worden gesaneerd via `safeErrorMessage` om informatielekken in productie te voorkomen

## Gerelateerde pagina's

- [Stripe Abonnementen – Diepgaande uitleg](./stripe-subscription-deep-dive.md)
- [Stripe Webhooks – Diepgaande uitleg](./stripe-webhook-deep-dive.md)
- [Stripe Betaalmethoden – Diepgaande uitleg](./stripe-payment-methods-deep-dive.md)
- [Architectuur van betalingsproviders](./payment-provider-architecture.md)
