---
id: stripe-checkout-deep-dive
title: "Stripe Checkout Deep Dive"
sidebar_label: "Stripe Checkout Deep Dive"
---

# Stripe Checkout – Detailanalyse

Diese Seite behandelt den vollständigen Stripe-Checkout-Ablauf, einschließlich Sitzungserstellung, Preis-ID-Auflösung, Währungsbehandlung, Weiterleitungs-URLs, Erfolgs-/Abbruchabläufe und Metadaten-Weitergabe.

## Übersicht

Die Stripe-Checkout-Integration bietet eine serverseitige API, die Stripe-Checkout-Sitzungen für Einmalzahlungen und Abonnements erstellt. Der Ablauf authentifiziert den Benutzer, löst einen Stripe-Kunden auf oder erstellt ihn, erstellt Positionselemente mit optionalem Testunterstützung und gibt eine gehostete Checkout-URL zurück.

## Routentabelle

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|------|-------|
| `POST` | `/api/stripe/checkout` | Sitzung erforderlich | Neue Checkout-Sitzung erstellen |
| `GET` | `/api/stripe/checkout` | Sitzung erforderlich | Bestehende Checkout-Sitzung abrufen |

## Checkout-Sitzung erstellen (POST)

### Anfragekörper

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe-Preis-ID (z.B. "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Standard: "one_time"
  trialPeriodDays?: number;                 // Testtage (nur Abonnementmodus, Standard: 0)
  billingInterval?: 'month' | 'year';       // Abrechnungsintervall (Standard: "month")
  trialAmountId?: string;                   // Preis-ID für Test-Einrichtungsgebühr
  isAuthorizedTrialAmount?: boolean;        // Ob der Testbetrag autorisiert ist
  successUrl: string;                       // Weiterleitungs-URL nach Erfolg
  cancelUrl: string;                        // Weiterleitungs-URL nach Abbruch
  metadata?: Record<string, string>;        // Benutzerdefinierte Metadaten (planId, planName usw.)
}
```

### Beispielanfrage

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

### Erfolgsantwort (200)

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

## Modus-Zuordnung

Die API ordnet eingehende Modi dem von Stripe erwarteten `Mode`-Typ zu:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` wird auf den Stripe-`payment`-Modus abgebildet
- `subscription` wird auf den Stripe-`subscription`-Modus abgebildet
- Jeder andere Wert wird auf den `setup`-Modus abgebildet

## Kunden-Auflösung

Vor dem Erstellen einer Checkout-Sitzung löst die API einen Stripe-Kunden auf oder erstellt einen:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

Die `getCustomerId`-Methode folgt einer dreistufigen Auflösung:

1. **Metadaten-Prüfung** – Sucht nach `stripe_customer_id` in Benutzer-Metadaten
2. **Datenbankabfrage** – Fragt die `PaymentAccount`-Tabelle nach einem vorhandenen Eintrag ab
3. **Neu erstellen** – Erstellt einen neuen Stripe-Kunden und synchronisiert ihn mit der Datenbank

Fehlschlägt die Kundenerstellung, gibt der Endpunkt einen `400`-Fehler zurück.

## Testzeitraum-Konfiguration

Für Tests müssen zwei Bedingungen erfüllt sein:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Wenn ein Test aktiviert ist, ist `trialAmountId` erforderlich. Dies ermöglicht die Erhebung einer Einrichtungsgebühr während des Testzeitraums. Der `buildCheckoutLineItems`-Hilfsblock erstellt Positionselemente, die sowohl den Abonnementpreis als auch den optionalen Testbetrag enthalten.

Ist `hasTrial` true, aber `trialAmountId` fehlt, gibt der Endpunkt zurück:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Abonnementspezifische Konfiguration

Wenn der Modus `subscription` ist, wird über `applySubscriptionConfig` zusätzliche Konfiguration angewendet:

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

Diese hängt Abonnement-Metadaten wie `userId`, `planId`, `planName` und Abrechnungsintervall an die `subscription_data` der Checkout-Sitzung an.

## Metadaten-Weitergabe

Metadaten aus der Anfrage werden mit Sitzungsbenutzerdaten zusammengeführt:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Dadurch werden Benutzeridentitätsinformationen (ID, E-Mail, Name) immer an die Checkout-Sitzung für den Abgleich in Webhook-Handlern angefügt.

## Checkout-Sitzung abrufen (GET)

### Abfrageparameter

| Parameter | Erforderlich | Beschreibung |
|-----------|---------|-------|
| `session_id` | Ja | Stripe-Checkout-Sitzungs-ID |

### Beispielanfrage

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Erfolgsantwort (200)

```json
{
  "session": { "...vollständiges Stripe-Checkout-Sitzungsobjekt..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

Die Sitzung wird mit erweiterten `line_items`- und `subscription`-Daten abgerufen:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Mehrwährungs-Unterstützung

Die Währungsverarbeitung wird über `stripe.config.ts` konfiguriert. Das `STRIPE_CONFIG`-Objekt ordnet Tarifen währungsspezifische Preis-IDs zu:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '\u20ac' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Verwende `getStripePriceConfig(plan, currency, interval)`, um die korrekte Preis-ID für einen bestimmten Tarif, Währung und Abrechnungsintervall aufzulösen.

## Dynamische Preisgestaltung

Wenn `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, ruft der `/api/stripe/products`-Endpunkt Produkte und Preise direkt von der Stripe-API mit einer 5-Minuten-Cache-TTL ab. Produkte müssen folgende Metadatenschlüssel im Stripe-Dashboard gesetzt haben:

- `plan` – Tariftyp (`free`, `standard`, `premium`)
- `type` – Produkttyp (`subscription`, `sponsor_ad`)
- `features` – JSON-Array mit Feature-Strings
- `annualDiscount` – Jährlicher Rabatt in Prozent

## Konfigurationsanforderungen

| Variable | Erforderlich | Beschreibung |
|----------|---------|-------|
| `STRIPE_SECRET_KEY` | Ja | Geheimer Stripe-API-Schlüssel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ja | Öffentlicher Stripe-Schlüssel |
| `STRIPE_WEBHOOK_SECRET` | Ja | Webhook-Signierungsgeheimnis |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | Nein | Dynamische Preisgestaltung aktivieren |
| `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD` | Bedingt | Preis-IDs pro Tarif/Währung |

## Fehlerbehandlung

| Status | Fehler | Ursache |
|--------|--------|--------|
| 400 | `Failed to create customer` | Kundenauflösung/-erstellung fehlgeschlagen |
| 400 | `Invalid trial configuration` | Test ohne `trialAmountId` aktiviert |
| 400 | `Session ID is required` | GET-Anfrage fehlt `session_id`-Parameter |
| 401 | `Unauthorized` | Keine authentifizierte Sitzung |
| 500 | `Failed to create checkout session` | Stripe-API-Fehler oder interner Fehler |

Im Entwicklungsmodus enthalten Fehlerantworten ein `details`-Feld mit dem Stack-Trace.

## Sicherheitsaspekte

- Alle Checkout-Endpunkte erfordern eine authentifizierte Sitzung über `auth()`
- Der geheime Stripe-Schlüssel wird nie dem Client offenbart
- Metadaten werden serverseitig zusammengeführt; Clients können die Benutzeridentität nicht fälschen
- Checkout-Sitzungen sind auf den Stripe-Kunden des authentifizierten Benutzers beschränkt
- Fehlermeldungen werden über `safeErrorMessage` bereinigt, um in der Produktion keine Informationen zu leaken

## Verwandte Seiten

- [Stripe-Abonnement – Detailanalyse](./stripe-subscription-deep-dive.md)
- [Stripe Webhook – Detailanalyse](./stripe-webhook-deep-dive.md)
- [Stripe Payment Methods – Detailanalyse](./stripe-payment-methods-deep-dive.md)
- [Zahlungsanbieter-Architektur](./payment-provider-architecture.md)
