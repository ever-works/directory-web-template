---
id: stripe-payment-methods-deep-dive
title: "Stripe Payment Methods Deep Dive"
sidebar_label: "Stripe Payment Methods Deep Dive"
---

# Stripe Betaalmethoden – Diepgaande uitleg

Deze pagina behandelt het weergeven van betaalmethoden, setup intents voor het opslaan van kaarten, beheer van de standaard betaalmethode en kaartvalidatie.

## Overzicht

Het betaalmethodensysteem biedt twee kernmogelijkheden: het weergeven van de opgeslagen betaalmethoden van een gebruiker met de standaardstatus, en het aanmaken van setup intents waarmee gebruikers nieuwe betaalmethoden kunnen opslaan voor toekomstig gebruik zonder onmiddellijke afschrijving.

## Route-overzicht

| Methode | Pad | Authenticatie | Beschrijving |
|--------|------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Sessie vereist | Alle betaalmethoden van de gebruiker weergeven |
| `POST` | `/api/stripe/setup-intent` | Sessie vereist | Een setup intent aanmaken voor het opslaan van een nieuwe betaalmethode |

## Betaalmethoden weergeven (GET)

### Hoe het werkt

Het lijsteindpunt voert de volgende stappen uit:

1. Authenticeert de gebruiker via `auth()`
2. Lost de Stripe klant-ID van de gebruiker op via `getUserStripeCustomerId()`
3. Haalt de klant op om de standaard betaalmethode te bepalen
4. Toont alle betaalmethoden van het type `card` (tot 100)
5. Formatteert en sorteert resultaten (standaard eerst, vervolgens op aanmaakvolgorde)

### Belangrijkste implementatie

```typescript
// Klant ophalen voor detectie van standaard betaalmethode
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// Alle betaalmethoden van het type kaart weergeven
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Formatteren met standaardstatus
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

// Sorteren: standaard eerst, vervolgens nieuwste
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Geslaagde reactie (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Aanwezig wanneer geen betaalmethoden gevonden
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
  created: number;               // Unix-tijdstempel
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Voorbeeld: Gebruiker met betaalmethoden

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

### Voorbeeld: Geen betaalmethoden

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Setup Intent aanmaken (POST)

Setup intents stellen gebruikers in staat een betaalmethode op te slaan voor toekomstig gebruik zonder onmiddellijke afschrijving. Dit wordt gebruikt wanneer een gebruiker een kaart wil toevoegen voor het abonneren, of meerdere betaalmethoden wil beheren.

### Hoe het werkt

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

### Geslaagde reactie (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Unix-tijdstempel
}
```

### Gebruik aan de clientzijde

Aan de clientzijde wordt de `client_secret` gebruikt om de setup intent te bevestigen met Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```
