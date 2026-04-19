---
id: stripe-subscription-deep-dive
title: "Stripe Subscription Deep Dive"
sidebar_label: "Stripe Subscription Deep Dive"
---

# Stripe-Abonnement – Detailanalyse

Diese Seite behandelt alle Abonnementverwaltungsrouten: Erstellen, Aktualisieren, Kündigen und die zugrundeliegenden Provider-Methoden mit Anfrage-/Antwortbeispielen.

## Übersicht

Die Abonnement-API bietet vollständiges Lebenszyklusmanagement für Stripe-Abonnements. Sie unterstützt das Erstellen von Abonnements mit Zahlungsmethoden und Testzeiträumen, das Aktualisieren von Tarifen oder Kündigungseinstellungen und das Kündigen von Abonnements entweder sofort oder am Ende des Abrechnungszeitraums.

## Routentabelle

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|------|-------|
| `POST` | `/api/stripe/subscription` | Sitzung erforderlich | Neues Abonnement erstellen |
| `PUT` | `/api/stripe/subscription` | Sitzung erforderlich | Bestehendes Abonnement aktualisieren |
| `DELETE` | `/api/stripe/subscription` | Sitzung erforderlich | Abonnement kündigen |

## Abonnement erstellen (POST)

### Anfragekörper

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe-Preis-ID
  paymentMethodId: string;    // Stripe-Zahlungsmethoden-ID
  trialPeriodDays?: number;   // Optionaler Testzeitraum in Tagen
}
```

### Beispielanfrage

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

### Funktionsweise

Der Routen-Handler führt folgende Schritte aus:

1. Authentifiziert den Benutzer über `auth()`
2. Löst einen Stripe-Kunden über `stripeProvider.getCustomerId()` auf oder erstellt einen
3. Ruft `stripeProvider.createSubscription()` mit Kunden-ID, Preis, Zahlungsmethode, Testtagen und Metadaten auf

### Provider-Implementierung

Innerhalb von `StripeProvider.createSubscription()`:

```typescript
// Zahlungsmethode dem Kunden zuordnen
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Als Standard-Zahlungsmethode setzen
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Abonnement erstellen
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Ohne Testzeitraum: sofort belasten
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Erfolgsantwort (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | etc.
  currentPeriodEnd?: number;     // Unix-Zeitstempel
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Unix-Zeitstempel oder null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." falls verfügbar
}
```

## Abonnement aktualisieren (PUT)

### Anfragekörper

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Erforderlich: zu aktualisierendes Abonnement
  priceId?: string;                // Neue Preis-ID (Tarifwechsel)
  cancelAtPeriodEnd?: boolean;     // Kündigung planen
}
```

### Beispielanfrage

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

### Provider-Implementierung

Die Methode `updateSubscription` behandelt Tarifänderungen durch Ersetzen des Abonnement-Elements:

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

Sie unterstützt auch das Setzen von `cancel_at_period_end`, `cancel_at` und das Aktualisieren von Metadaten.

### Erfolgsantwort (200)

Gibt dieselbe `SubscriptionInfo`-Struktur mit den aktualisierten Werten zurück.

## Abonnement kündigen (DELETE)

### Anfragekörper

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Erforderlich: zu kündigendes Abonnement
  cancelAtPeriodEnd?: boolean;      // true = am Periodenende kündigen, false = sofort
}
```

### Beispielanfrage

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Provider-Implementierung

Die Kündigungslogik unterstützt zwei Strategien:

```typescript
if (cancelAtPeriodEnd) {
  // Sanfte Kündigung: Abonnement bleibt bis Periodenende aktiv
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Sofortige Kündigung: Abonnement endet sofort
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Erfolgsantwort (200)

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

## Abonnement-Status-Zuordnung

Der Provider ordnet Stripe-Status dem internen `SubscriptionStatus`-Enum zu:

| Stripe-Status | Interner Status |
|---------------|-----------------|
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |
| `trialing` | `TRIALING` |
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `unpaid` | `UNPAID` |

## Metadaten-Nachverfolgung

Alle Abonnement-Operationen hängen `userId` aus der Sitzung an die Abonnement-Metadaten an:

```typescript
metadata: {
  userId: session.user.id
}
```

Dies ermöglicht Webhook-Handlern, Abonnements mit internen Benutzerdatensätzen abzugleichen.

## Fehlerbehandlung

| Status | Fehler | Ursache |
|--------|--------|--------|
| 400 | `Failed to create customer` | Kundenauflösung fehlgeschlagen |
| 401 | `Unauthorized` | Keine authentifizierte Sitzung |
| 500 | `Failed to create subscription` | Stripe-API-Fehler beim Erstellen |
| 500 | `Failed to update subscription` | Stripe-API-Fehler beim Aktualisieren |
| 500 | `Failed to cancel subscription` | Stripe-API-Fehler beim Kündigen |

## Sicherheitsaspekte

- Alle Abonnement-Endpunkte erfordern Authentifizierung
- Zuordnung und Standardsetzung von Zahlungsmethoden erfolgen serverseitig
- Das `off_session`-Flag wird nur für Abonnements ohne Testzeitraum gesetzt, um automatische Abbuchungen zu ermöglichen
- Abonnement-Metadaten enthalten immer die ID des authentifizierten Benutzers für Prüfzwecke
- Im Entwicklungsmodus werden Abonnement-Aktualisierungen nur mit nicht-sensiblen Feldern protokolliert

## Verwandte Seiten

- [Stripe Checkout – Detailanalyse](./stripe-checkout-deep-dive.md)
- [Stripe Webhook – Detailanalyse](./stripe-webhook-deep-dive.md)
- [Stripe Payment Methods – Detailanalyse](./stripe-payment-methods-deep-dive.md)
- [Zahlungsanbieter-Architektur](./payment-provider-architecture.md)
