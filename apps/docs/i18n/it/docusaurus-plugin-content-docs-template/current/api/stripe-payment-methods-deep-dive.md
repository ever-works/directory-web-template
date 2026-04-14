---
id: stripe-payment-methods-deep-dive
title: "Approfondimento Metodi di Pagamento Stripe"
sidebar_label: "Metodi di Pagamento Stripe"
---

# Approfondimento Metodi di Pagamento Stripe

Questa pagina copre l'elenco dei metodi di pagamento, i setup intent per il salvataggio delle carte, la gestione del metodo predefinito e la validazione delle carte.

## Panoramica

Il sistema dei metodi di pagamento offre due funzionalità chiave: l'elenco dei metodi di pagamento salvati dall'utente con lo stato predefinito, e la creazione di setup intent che consentono agli utenti di salvare nuovi metodi di pagamento per uso futuro senza un addebito immediato.

## Tabella delle Route

| Metodo | Percorso | Auth | Descrizione |
|--------|----------|------|-------------|
| `GET` | `/api/stripe/payment-methods/list` | Sessione richiesta | Elenca tutti i metodi di pagamento dell'utente |
| `POST` | `/api/stripe/setup-intent` | Sessione richiesta | Crea un setup intent per salvare un nuovo metodo di pagamento |

## Elenco dei Metodi di Pagamento (GET)

### Come Funziona

L'endpoint di elenco esegue questi passaggi:

1. Autentica l'utente tramite `auth()`
2. Risolve il Stripe customer ID dell'utente tramite `getUserStripeCustomerId()`
3. Recupera il cliente per determinare il metodo di pagamento predefinito
4. Elenca tutti i metodi di pagamento di tipo `card` (fino a 100)
5. Formatta e ordina i risultati (predefinito prima, poi per data di creazione)

### Implementazione Principale

```typescript
// Recupera il cliente per rilevare il metodo di pagamento predefinito
const customer = await stripe.customers.retrieve(stripeCustomerId);
const defaultPaymentMethodId = customer.invoice_settings?.default_payment_method;

// Elenca tutti i metodi di pagamento di tipo carta
const paymentMethods = await stripe.paymentMethods.list({
  customer: stripeCustomerId,
  type: 'card',
  limit: 100
});

// Formatta con lo stato predefinito
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

// Ordina: predefinito prima, poi per più recente
formattedPaymentMethods.sort((a, b) => {
  if (a.is_default && !b.is_default) return -1;
  if (!a.is_default && b.is_default) return 1;
  return b.created - a.created;
});
```

### Risposta di Successo (200)

```typescript
interface PaymentMethodListResponse {
  success: boolean;
  data: PaymentMethodItem[];
  meta: {
    total: number;
    default_payment_method: string | null;
    customer_id: string;
  };
  message?: string;  // Presente quando non ci sono metodi di pagamento
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
  created: number;               // Timestamp Unix
  metadata: Record<string, string>;
  is_default: boolean;
}
```

### Esempio: Utente con Metodi di Pagamento

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

### Esempio: Nessun Metodo di Pagamento

```json
{
  "success": true,
  "data": [],
  "message": "No payment methods found"
}
```

## Creazione di un Setup Intent (POST)

I setup intent consentono agli utenti di salvare un metodo di pagamento per uso futuro senza essere addebitati immediatamente. Vengono utilizzati quando un utente vuole aggiungere una carta prima di abbonarsi, o gestire più metodi di pagamento.

### Come Funziona

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

### Risposta di Successo (200)

```typescript
interface SetupIntentResponse {
  id: string;                    // "seti_1234567890abcdef"
  client_secret: string;         // "seti_1234567890abcdef_secret_xyz"
  status: string;                // "requires_payment_method"
  usage: string;                 // "off_session"
  customer: string;              // "cus_1234567890abcdef"
  created: number;               // Timestamp Unix
}
```

### Utilizzo nel Frontend

Lato client, il `client_secret` viene utilizzato per confermare il setup intent con Stripe.js:

```typescript
const { error } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'John Doe' }
  }
});
```

## Gestione del Metodo di Pagamento Predefinito

Il metodo di pagamento predefinito viene determinato dall'`invoice_settings.default_payment_method` del cliente Stripe. Quando si crea un abbonamento, il metodo di pagamento viene impostato automaticamente come predefinito:

```typescript
// Durante la creazione dell'abbonamento
await this.stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId
  }
});
```

Il flag `is_default` nella risposta dell'elenco dei metodi di pagamento consente al frontend di visualizzare il badge della carta predefinita.

## Gestione degli Errori

| Stato | Errore | Causa |
|-------|--------|-------|
| 401 | `Unauthorized` | Nessuna sessione autenticata |
| 404 | `Customer not found` | Il cliente Stripe è stato eliminato |
| 400 | Errore Stripe | Richiesta non valida all'API Stripe |
| 500 | `Failed to list payment methods` | Errore interno |
| 500 | `Failed to create setup intent` | Creazione del setup intent fallita |

Gli errori specifici di Stripe vengono rilevati e gestiti:

```typescript
if (error instanceof Stripe.errors.StripeError) {
  const msg = safeErrorMessage(error, 'Stripe request failed');
  return NextResponse.json({ success: false, error: msg }, { status: 400 });
}
```

## Considerazioni sulla Sicurezza

- Tutti gli endpoint richiedono sessioni autenticate
- L'endpoint di elenco restituisce solo i metodi di pagamento appartenenti al cliente Stripe dell'utente autenticato
- I numeri di carta non vengono mai memorizzati o restituiti -- vengono esposti solo le ultime 4 cifre e il circuito
- Il `client_secret` dei setup intent deve essere passato solo all'SDK frontend Stripe.js
- Gli ID cliente vengono risolti lato server e non possono essere sovrascritti dalle richieste client

## Requisiti di Configurazione

| Variabile | Richiesta | Descrizione |
|-----------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Sì | Chiave API segreta di Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sì | Per l'inizializzazione di Stripe.js nel frontend |

## Pagine Correlate

- [Approfondimento Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Approfondimento Abbonamenti Stripe](./stripe-subscription-deep-dive.md)
- [Approfondimento Webhook Stripe](./stripe-webhook-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
