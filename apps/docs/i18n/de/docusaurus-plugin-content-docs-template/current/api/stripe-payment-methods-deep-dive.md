---
id: stripe-payment-methods-deep-dive
title: "Stripe Payment Methods Deep Dive"
sidebar_label: "Stripe Payment Methods Deep Dive"
---

# Stripe Payment Methods – Detailanalyse

Diese Seite behandelt die Auflistung von Zahlungsmethoden, Setup Intents zum Speichern von Karten, die Verwaltung von Standard-Zahlungsmethoden und die Kartenvalidierung.

## Übersicht

Das System für Zahlungsmethoden bietet zwei Hauptfunktionen: die Auflistung gespeicherter Zahlungsmethoden des Benutzers mit Standardstatus und die Erstellung von Setup Intents, die es Benutzern ermöglichen, neue Zahlungsmethoden für zukünftige Verwendung ohne sofortige Belastung zu speichern.

## Routentabelle

| Methode | Pfad | Authentifizierung | Beschreibung |
|---------|------|------|-------|
| `GET` | `/api/stripe/payment-methods/list` | Sitzung erforderlich | Alle Zahlungsmethoden des Benutzers auflisten |
| `POST` | `/api/stripe/setup-intent` | Sitzung erforderlich | Setup Intent zum Speichern einer neuen Zahlungsmethode erstellen |

## Zahlungsmethoden auflisten (GET)

### Funktionsweise

Der Listen-Endpunkt führt folgende Schritte aus:

1. Authentifiziert den Benutzer über `auth()`
2. Löst die Stripe-Kunden-ID des Benutzers über `getUserStripeCustomerId()` auf
3. Ruft den Kunden ab, um die Standard-Zahlungsmethode zu ermitteln
4. Listet alle Zahlungsmethoden vom Typ `card` auf (bis zu 100)
5. Formatiert und sortiert die Ergebnisse (Standard zuerst, dann nach Erstellungsdatum)

### Wichtige Implementierung

```typescript
// Kunden abrufen, um Standard-Zahlungsmethode zu ermitteln
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// Alle Zahlungsmethoden vom Typ 'card' auflisten
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Mit Standardstatus formatieren
const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
  id: pm.id,
  type: pm.type,
  card: pm.card ? {
    brand: pm.card.brand,
    last4: pm.card.last4,
    funding: pm.card.funding,
    country: pm.card.country
  } : null,
  billing_details: pm.billing_details,
  created: pm.created,
  metadata: pm.metadata,
  is_default: pm.id === defaultPaymentMethodId
}));

// Sortieren: Standard zuerst, dann nach neuesten
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Erfolgsantwort (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Vorhanden, wenn keine Zahlungsmethoden gefunden
}

interface PaymentMethodItem {
  id: string;                    // "pm_1234567890abcdef"
  type: string;                  // "card"
  card: {
    brand: string;               // "visa", "mastercard", "amex", "discover"
    last4: string;               // "4242"
    funding: string;             // "credit", "debit", "prepaid", "unknown"
    country: string;             // "US"
  } | null;
  billing_details: {
    name: string | null;
    email: string | null;
    phone: string | null;
    address: {
      line1: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string | null;
    } | null;
  };
  created: number;               // Unix-Zeitstempel
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Beispiel: Benutzer mit Zahlungsmethoden

```json
{
  "success": true,
  "data": [
    {
      "id": "pm_1234567890abcdef",
      "type": "card",
      "card": {
        "brand": "visa",
        "last4": "4242",
        "funding": "credit",
        "country": "US"
      },
      "billing_details": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": null,
        "address": null
      },
      "created": 1640995200,
      "metadata": {},
      "is_default": true
    }
  ],
  "meta": {
    "total": 1,
    "default_payment_method": "pm_1234567890abcdef",
    "customer_id": "cus_1234567890abcdef"
  }
}
```

### Beispiel: Keine Zahlungsmethoden

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Setup Intent erstellen (POST)

Setup Intents ermöglichen es Benutzern, eine Zahlungsmethode für zukünftige Verwendung zu speichern, ohne sofort belastet zu werden. Dies wird verwendet, wenn ein Benutzer eine Karte hinzufügen möchte, bevor er ein Abonnement abschließt, oder mehrere Zahlungsmethoden verwalten möchte.

### Funktionsweise

```typescript
async createSetupIntent(user: User | null): Promise<SetupIntent> {
  const customerId = user?.user_metadata?.customerId;
  const setupIntent = await this.stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card']
  });

  return { ...setupIntent, clientSecret: setupIntent.client_secret! };
}
```

### Erfolgsantwort (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix-Zeitstempel
}
```

### Frontend-Nutzung

Clientseitig wird `client_secret` verwendet, um den Setup Intent mit Stripe.js zu bestätigen:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```
