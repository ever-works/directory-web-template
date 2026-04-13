---
id: stripe-subscription-deep-dive
title: "Approfondimento Abbonamenti Stripe"
sidebar_label: "Abbonamenti Stripe"
---

# Approfondimento Abbonamenti Stripe

Questa pagina copre tutte le route di gestione degli abbonamenti: creazione, aggiornamento, annullamento e i metodi provider sottostanti con esempi di richiesta/risposta.

## Panoramica

L'API degli abbonamenti fornisce una gestione completa del ciclo di vita degli abbonamenti Stripe. Supporta la creazione di abbonamenti con metodi di pagamento e periodi di trial, l'aggiornamento dei piani o delle impostazioni di annullamento, e l'annullamento degli abbonamenti immediatamente o alla fine del periodo di fatturazione.

## Tabella delle Route

| Metodo | Percorso | Auth | Descrizione |
|--------|----------|------|-------------|
| `POST` | `/api/stripe/subscription` | Sessione richiesta | Crea un nuovo abbonamento |
| `PUT` | `/api/stripe/subscription` | Sessione richiesta | Aggiorna un abbonamento esistente |
| `DELETE` | `/api/stripe/subscription` | Sessione richiesta | Annulla un abbonamento |

## Creazione di un Abbonamento (POST)

### Corpo della Richiesta

```typescript
interface CreateSubscriptionRequest {
  priceId: string;            // Stripe price ID
  paymentMethodId: string;    // Stripe payment method ID
  trialPeriodDays?: number;   // Periodo di trial opzionale in giorni
}
```

### Esempio di Richiesta

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

### Come Funziona

Il gestore della route esegue questi passaggi:

1. Autentica l'utente tramite `auth()`
2. Risolve o crea un cliente Stripe tramite `stripeProvider.getCustomerId()`
3. Chiama `stripeProvider.createSubscription()` con l'ID cliente, il prezzo, il metodo di pagamento, i giorni di trial e i metadati

### Implementazione del Provider

All'interno di `StripeProvider.createSubscription()`:

```typescript
// Allega il metodo di pagamento al cliente
if (paymentMethodId) {
  await this.stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId
  });
  // Imposta come metodo di pagamento predefinito
  await this.stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId }
  });
}

// Crea l'abbonamento
const subscriptionParams: Stripe.SubscriptionCreateParams = {
  customer: customerId,
  items: [{ price: priceId }],
  default_payment_method: paymentMethodId,
  expand: ['latest_invoice'],
  metadata,
  collection_method: 'charge_automatically'
};

// Senza trial: addebita immediatamente
if (trialPeriodDays === 0) {
  subscriptionParams.off_session = true;
  subscriptionParams.payment_settings = {
    save_default_payment_method: 'on_subscription'
  };
} else {
  subscriptionParams.trial_period_days = trialPeriodDays;
}
```

### Risposta di Successo (200)

```typescript
interface SubscriptionInfo {
  id: string;                    // "sub_1234567890abcdef"
  customerId: string;            // "cus_1234567890abcdef"
  status: SubscriptionStatus;    // "active" | "trialing" | ecc.
  currentPeriodEnd?: number;     // Timestamp Unix
  cancelAtPeriodEnd: boolean;    // false
  cancelAt: number | null;       // null
  trialEnd: number | null;       // Timestamp Unix o null
  priceId: string;               // "price_1234567890abcdef"
  paymentIntentId?: string;      // "pi_..." se disponibile
}
```

## Aggiornamento di un Abbonamento (PUT)

### Corpo della Richiesta

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;          // Obbligatorio: abbonamento da aggiornare
  priceId?: string;                // Nuovo price ID (cambio piano)
  cancelAtPeriodEnd?: boolean;     // Pianifica annullamento
}
```

### Esempio di Richiesta

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

### Implementazione del Provider

Il metodo `updateSubscription` gestisce i cambi di piano sostituendo la voce dell'abbonamento:

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

Supporta anche l'impostazione di `cancel_at_period_end`, `cancel_at` e l'aggiornamento dei metadati.

### Risposta di Successo (200)

Restituisce la stessa struttura `SubscriptionInfo` con i valori aggiornati.

## Annullamento di un Abbonamento (DELETE)

### Corpo della Richiesta

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;           // Obbligatorio: abbonamento da annullare
  cancelAtPeriodEnd?: boolean;      // true = annulla alla fine del periodo, false = immediatamente
}
```

### Esempio di Richiesta

```bash
curl -X DELETE /api/stripe/subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "subscriptionId": "sub_1234567890abcdef",
    "cancelAtPeriodEnd": true
  }'
```

### Implementazione del Provider

La logica di annullamento supporta due strategie:

```typescript
if (cancelAtPeriodEnd) {
  // Annullamento soft: l'abbonamento rimane attivo fino alla fine del periodo
  subscription = await this.stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
} else {
  // Annullamento hard: l'abbonamento termina immediatamente
  subscription = await this.stripe.subscriptions.cancel(subscriptionId);
}
```

### Risposta di Successo (200)

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

## Mappatura degli Stati dell'Abbonamento

Il provider mappa gli stati Stripe all'enum interno `SubscriptionStatus`:

| Stato Stripe | Stato Interno |
|--------------|---------------|
| `incomplete` | `INCOMPLETE` |
| `incomplete_expired` | `INCOMPLETE_EXPIRED` |
| `trialing` | `TRIALING` |
| `active` | `ACTIVE` |
| `past_due` | `PAST_DUE` |
| `canceled` | `CANCELED` |
| `unpaid` | `UNPAID` |

## Tracciamento dei Metadati

Tutte le operazioni sugli abbonamenti allegano `userId` dalla sessione ai metadati dell'abbonamento:

```typescript
metadata: {
  userId: session.user.id
}
```

Ciò consente ai gestori webhook di riconciliare gli abbonamenti con i record utente interni.

## Gestione degli Errori

| Stato | Errore | Causa |
|-------|--------|-------|
| 400 | `Failed to create customer` | Risoluzione del cliente fallita |
| 401 | `Unauthorized` | Nessuna sessione autenticata |
| 500 | `Failed to create subscription` | Errore API Stripe durante la creazione |
| 500 | `Failed to update subscription` | Errore API Stripe durante l'aggiornamento |
| 500 | `Failed to cancel subscription` | Errore API Stripe durante l'annullamento |

## Considerazioni sulla Sicurezza

- Tutti gli endpoint degli abbonamenti richiedono l'autenticazione
- L'allegato del metodo di pagamento e l'impostazione predefinita vengono eseguiti lato server
- Il flag `off_session` viene impostato solo per gli abbonamenti senza trial per abilitare gli addebiti automatici
- I metadati dell'abbonamento includono sempre l'ID dell'utente autenticato a fini di audit
- In modalità sviluppo, gli aggiornamenti degli abbonamenti vengono registrati solo con campi non sensibili

## Pagine Correlate

- [Approfondimento Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Approfondimento Webhook Stripe](./stripe-webhook-deep-dive.md)
- [Approfondimento Metodi di Pagamento Stripe](./stripe-payment-methods-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
