---
id: stripe-checkout-deep-dive
title: "Approfondimento Stripe Checkout"
sidebar_label: "Stripe Checkout"
---

# Approfondimento Stripe Checkout

Questa pagina copre il flusso completo di Stripe Checkout, incluse la creazione della sessione, la risoluzione del price ID, la gestione della valuta, gli URL di reindirizzamento, i flussi di successo/annullamento e la propagazione dei metadati.

## Panoramica

L'integrazione Stripe Checkout fornisce un'API lato server che crea Sessioni Stripe Checkout per pagamenti una tantum e abbonamenti. Il flusso autentica l'utente, risolve o crea un cliente Stripe, costruisce le voci di acquisto con supporto opzionale per i trial e restituisce un URL di checkout ospitato.

## Tabella delle Route

| Metodo | Percorso | Auth | Descrizione |
|--------|----------|------|-------------|
| `POST` | `/api/stripe/checkout` | Sessione richiesta | Crea una nuova sessione di checkout |
| `GET` | `/api/stripe/checkout` | Sessione richiesta | Recupera una sessione di checkout esistente |

## Creazione di una Sessione di Checkout (POST)

### Corpo della Richiesta

```typescript
interface CreateCheckoutRequest {
  priceId: string;                          // Stripe price ID (es. "price_1234567890abcdef")
  mode?: 'one_time' | 'subscription';       // Predefinito: "one_time"
  trialPeriodDays?: number;                 // Giorni di trial (solo modalità abbonamento, predefinito: 0)
  billingInterval?: 'month' | 'year';       // Intervallo di fatturazione (predefinito: "month")
  trialAmountId?: string;                   // Price ID per la quota di attivazione del trial
  isAuthorizedTrialAmount?: boolean;        // Se l'importo del trial è autorizzato
  successUrl: string;                       // URL di reindirizzamento dopo il successo
  cancelUrl: string;                        // URL di reindirizzamento dopo l'annullamento
  metadata?: Record<string, string>;        // Metadati personalizzati (planId, planName, ecc.)
}
```

### Esempio di Richiesta

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

### Risposta di Successo (200)

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

## Mappatura delle Modalità

L'API mappa le modalità in ingresso al tipo `Mode` atteso da Stripe:

```typescript
const stripeMode: 'payment' | 'setup' | 'subscription' =
  mode === 'one_time' ? 'payment'
    : mode === 'subscription' ? 'subscription'
    : 'setup';
```

- `one_time` viene mappato alla modalità Stripe `payment`
- `subscription` viene mappato alla modalità Stripe `subscription`
- Qualsiasi altro valore viene mappato alla modalità `setup`

## Risoluzione del Cliente

Prima di creare una sessione di checkout, l'API risolve o crea un cliente Stripe:

```typescript
const stripeCustomerId = await stripeProvider.getCustomerId(session.user);
```

Il metodo `getCustomerId` segue una risoluzione in tre fasi:

1. **Controllo dei metadati** -- Cerca `stripe_customer_id` nei metadati dell'utente
2. **Ricerca nel database** -- Interroga la tabella `PaymentAccount` per un record esistente
3. **Creazione nuovo** -- Crea un nuovo cliente Stripe e lo sincronizza con il database

Se la creazione del cliente fallisce, l'endpoint restituisce un errore `400`.

## Configurazione del Trial

I trial richiedono che due condizioni siano soddisfatte:

```typescript
const hasTrial = trialPeriodDays > 0 && isAuthorizedTrialAmount;
```

Quando un trial è abilitato, `trialAmountId` è obbligatorio. Ciò consente di addebitare una quota di attivazione durante il periodo di trial. Il helper `buildCheckoutLineItems` costruisce le voci di acquisto includendo sia il prezzo dell'abbonamento che l'eventuale importo del trial.

Se `hasTrial` è true ma `trialAmountId` è assente, l'endpoint restituisce:

```json
{
  "error": "Invalid trial configuration",
  "message": "trialAmountId is required when trial is enabled"
}
```

## Configurazione Specifica per Abbonamenti

Quando la modalità è `subscription`, viene applicata una configurazione aggiuntiva tramite `applySubscriptionConfig`:

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

Questo aggiunge ai `subscription_data` della sessione di checkout i metadati dell'abbonamento, inclusi `userId`, `planId`, `planName` e l'intervallo di fatturazione.

## Propagazione dei Metadati

I metadati della richiesta vengono uniti ai dati della sessione utente:

```typescript
metadata: {
  ...metadata,
  ...session.user
}
```

Ciò garantisce che le informazioni sull'identità dell'utente (ID, email, nome) siano sempre allegate alla sessione di checkout per la riconciliazione nei gestori webhook.

## Recupero di una Sessione di Checkout (GET)

### Parametri di Query

| Parametro | Obbligatorio | Descrizione |
|-----------|--------------|-------------|
| `session_id` | Sì | ID della sessione Stripe Checkout |

### Esempio di Richiesta

```bash
curl -X GET "/api/stripe/checkout?session_id=cs_test_1234567890abcdef" \
  -H "Cookie: session=..."
```

### Risposta di Successo (200)

```json
{
  "session": { "...oggetto completo della sessione Stripe Checkout..." },
  "status": "complete",
  "customer": "cus_1234567890abcdef",
  "subscription": "sub_1234567890abcdef"
}
```

La sessione viene recuperata con i dati `line_items` e `subscription` espansi:

```typescript
const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Supporto Multi-Valuta

La gestione della valuta è configurata tramite `stripe.config.ts`. L'oggetto `STRIPE_CONFIG` mappa i piani ai price ID specifici per valuta:

```typescript
export const STRIPE_CONFIG: Record<PlanName, PlanConfig> = {
  premium: {
    usd: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'USD', symbol: '$' },
    eur: { amount: { monthly: 'price_...', yearly: 'price_...' }, currency: 'EUR', symbol: '$' },
    // ... gbp, cad
  },
  standard: { /* ... */ },
  free: { productId: undefined }
};
```

Usa `getStripePriceConfig(plan, currency, interval)` per risolvere il price ID corretto per un dato piano, valuta e intervallo di fatturazione.

## Prezzi Dinamici

Quando `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING=true`, l'endpoint `/api/stripe/products` recupera prodotti e prezzi direttamente dall'API Stripe con una cache TTL di 5 minuti. I prodotti devono avere le seguenti chiavi di metadati impostate nel Dashboard Stripe:

- `plan` -- Tipo di piano (`free`, `standard`, `premium`)
- `type` -- Tipo di prodotto (`subscription`, `sponsor_ad`)
- `features` -- Array JSON di stringhe di funzionalità
- `annualDiscount` -- Percentuale di sconto annuale

## Requisiti di Configurazione

| Variabile | Richiesta | Descrizione |
|-----------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Sì | Chiave API segreta di Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sì | Chiave pubblicabile di Stripe |
| `STRIPE_WEBHOOK_SECRET` | Sì | Segreto di firma del webhook |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Abilita i prezzi dinamici |
| `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID_USD` | Condizionale | Price ID per piano/valuta |

## Gestione degli Errori

| Stato | Errore | Causa |
|-------|--------|-------|
| 400 | `Failed to create customer` | Risoluzione/creazione del cliente fallita |
| 400 | `Invalid trial configuration` | Trial abilitato senza `trialAmountId` |
| 400 | `Session ID is required` | Richiesta GET senza parametro `session_id` |
| 401 | `Unauthorized` | Nessuna sessione autenticata |
| 500 | `Failed to create checkout session` | Errore API Stripe o errore interno |

In modalità sviluppo, le risposte di errore includono un campo `details` con lo stack trace.

## Considerazioni sulla Sicurezza

- Tutti gli endpoint di checkout richiedono una sessione autenticata tramite `auth()`
- La chiave segreta Stripe non viene mai esposta al client
- I metadati vengono uniti lato server; i client non possono falsificare l'identità dell'utente
- Le sessioni di checkout sono limitate al cliente Stripe dell'utente autenticato
- I messaggi di errore sono sanificati tramite `safeErrorMessage` per prevenire fughe di informazioni in produzione

## Pagine Correlate

- [Approfondimento Abbonamenti Stripe](./stripe-subscription-deep-dive.md)
- [Approfondimento Webhook Stripe](./stripe-webhook-deep-dive.md)
- [Approfondimento Metodi di Pagamento Stripe](./stripe-payment-methods-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
