---
id: lemonsqueezy-deep-dive
title: Approfondimento LemonSqueezy
sidebar_label: LemonSqueezy
sidebar_position: 5
---

# Approfondimento LemonSqueezy

Questa pagina copre l'integrazione completa di LemonSqueezy, inclusa la creazione del checkout, la gestione degli abbonamenti, l'elaborazione dei webhook e la sincronizzazione dei prodotti.

## Panoramica

LemonSqueezy è un provider di pagamento merchant-of-record che gestisce la raccolta delle imposte, la conformità e l'elaborazione dei pagamenti. L'integrazione utilizza il flusso di checkout ospitato da LemonSqueezy, il modello di prodotto basato su varianti e il sistema di webhook. A differenza di Stripe, LemonSqueezy non supporta i setup intent o la gestione diretta dei metodi di pagamento -- tutta la gestione dei pagamenti avviene tramite la loro UI ospitata.

## Riepilogo delle Route

| Metodo | Percorso | Autenticazione | Descrizione |
|--------|------|------|-------------|
| `POST` | `/api/lemonsqueezy/checkout` | Sessione richiesta | Crea una sessione di checkout dal corpo JSON |
| `GET` | `/api/lemonsqueezy/checkout` | Nessuna | Crea una sessione di checkout dai parametri di query |
| `POST` | `/api/lemonsqueezy/webhook` | Firma richiesta | Elabora gli eventi webhook in arrivo |

## Creazione Checkout (POST)

### Corpo della Richiesta

```typescript
interface LemonSqueezyCheckoutRequest {
  variantId: string;                        // ID variante prodotto LemonSqueezy
  dark?: boolean;                           // Abilita il checkout in modalità scura
  customPrice?: number;                     // Prezzo personalizzato in centesimi (opzionale)
  metadata?: Record<string, string>;        // Metadati aggiuntivi
}
```

### Esempio di Richiesta

```bash
curl -X POST /api/lemonsqueezy/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "variantId": "123456",
    "dark": true,
    "metadata": { "plan": "pro", "source": "website" }
  }'
```

### Come Funziona

1. Autentica l'utente tramite `auth()`
2. Valida il corpo della richiesta usando `validateCheckoutRequestBody()`
3. Chiama `lemonsqueezyProvider.createCustomCheckout()` con i metadati dell'utente
4. Restituisce l'URL del checkout

### Implementazione del Provider

Il metodo `createCustomCheckout` crea un checkout LemonSqueezy con configurazione completa:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), Number(params.variantId), {
  customPrice: params.customPrice,
  productOptions: {
    redirectUrl: `${env.API_BASE_URL}/billing/success`,
    receiptButtonText: 'View Receipt',
    receiptLinkUrl: `${env.API_BASE_URL}/billing/receipt`,
    receiptThankYouNote: 'Thank you for your purchase!',
    enabledVariants: [Number(params.variantId)]
  },
  checkoutOptions: {
    embed: true,
    media: false,
    logo: false,
    dark: params.dark
  },
  checkoutData: {
    email: params.email,
    custom: params.metadata ?? {},
    variantQuantities: [{ variantId: Number(params.variantId), quantity: 1 }]
  },
  testMode: process.env.NODE_ENV === 'development',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
});
```

### Risposta di Successo (200)

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.lemonsqueezy.com/checkout/custom/abc123",
    "email": "user@example.com",
    "customPrice": 2999,
    "variantId": "123456",
    "metadata": {
      "userId": "user_123abc",
      "email": "user@example.com",
      "name": "John Doe",
      "plan": "pro"
    }
  },
  "message": "Checkout session created successfully"
}
```

## Checkout tramite Parametri di Query (GET)

L'endpoint GET supporta la creazione di checkout tramite parametri di query per scenari con link diretti:

| Parametro | Richiesto | Descrizione |
|-----------|----------|-------------|
| `variantId` | Sì | ID variante LemonSqueezy |
| `email` | Sì | Email del cliente |
| `customPrice` | No | Prezzo personalizzato in centesimi |
| `metadata` | No | Stringa JSON dei metadati |

## Gestione degli Abbonamenti

### Creazione degli Abbonamenti

Gli abbonamenti vengono creati tramite il flusso di checkout. Il metodo `createSubscription` avvolge l'API di checkout di LemonSqueezy:

```typescript
const { data, error } = await createCheckout(Number(this.storeId), finalProductId, {
  checkoutOptions: {
    embed: true,
    subscriptionPreview: true
  },
  checkoutData: {
    email: email || '',
    custom: metadata ?? {}
  }
});
```

### Cancellazione degli Abbonamenti

```typescript
async cancelSubscription(subscriptionId: string): Promise<SubscriptionInfo> {
  const { data, error } = await cancelSubscription(Number(subscriptionId));
  return {
    id: subscriptionId,
    status: 'canceled' as SubscriptionStatus,
    // ...
  };
}
```

### Aggiornamento degli Abbonamenti

Il metodo di aggiornamento supporta cambi di piano, messa in pausa, ripresa e riattivazione:

```typescript
// Cambio piano tramite ID variante
if (params.priceId) {
  updatePayload.variantId = Number(params.priceId);
}

// Metti in pausa l'abbonamento
if (params.metadata?.pauseMode) {
  updatePayload.pause = {
    mode: params.metadata.pauseMode as 'void' | 'free',
    resumesAt: params.metadata.pauseUntil || null
  };
}

// Riprendi l'abbonamento
if (params.metadata?.resumeAction) {
  if (currentSubscription?.status === 'paused') {
    updatePayload.pause = null;
  } else if (currentSubscription?.status === 'cancelled') {
    updatePayload.cancelled = false;
  }
}
```

## Elaborazione dei Webhook

### Verifica della Firma

LemonSqueezy usa HMAC SHA-256 per la verifica della firma del webhook. Il provider verifica le firme usando la Web Crypto API:

```typescript
const cryptoKey = await crypto.subtle.importKey(
  'raw', encoder.encode(this.webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
);
const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

if (calculatedSignature !== signature) {
  return { received: false, type: 'verification_failed', ... };
}
```

### Mappatura degli Eventi

| Evento LemonSqueezy | Tipo Interno |
|-------------------|---------------|
| `subscription_created` | `SUBSCRIPTION_CREATED` |
| `subscription_updated` | `SUBSCRIPTION_UPDATED` |
| `subscription_cancelled` | `SUBSCRIPTION_CANCELLED` |
| `subscription_payment_success` | `SUBSCRIPTION_PAYMENT_SUCCEEDED` |
| `subscription_payment_failed` | `SUBSCRIPTION_PAYMENT_FAILED` |
| `subscription_trial_will_end` | `SUBSCRIPTION_TRIAL_ENDING` |
| `order_created` | `PAYMENT_SUCCEEDED` |
| `order_refunded` | `REFUND_SUCCEEDED` |

### Struttura dell'Handler del Webhook

Ogni handler segue uno schema coerente:

```typescript
async function handleSubscriptionCreated(data: any) {
  if (isSponsorAdSubscription(data)) {
    await handleSponsorAdActivation(data);
    return;
  }
  try {
    const result = await webhookSubscriptionService.handleSubscriptionCreated(data);
    // ... log result
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

### Rilevamento degli Sponsor Ad

LemonSqueezy usa `custom_data` invece dei `metadata` di Stripe:

```typescript
function isSponsorAdSubscription(data: Record<string, unknown>): boolean {
  const customData = data.custom_data as Record<string, string> | undefined;
  const meta = data.meta as Record<string, unknown> | undefined;
  const metaCustomData = meta?.custom_data as Record<string, string> | undefined;
  return customData?.type === 'sponsor_ad' || metaCustomData?.type === 'sponsor_ad';
}
```

## Gestione dei Clienti

Il provider segue lo stesso schema di risoluzione del cliente in tre fasi degli altri provider:

1. Controlla i metadati utente per `lemonsqueezy_customer_id`
2. Query sulla tabella del database `PaymentAccount`
3. Crea un nuovo cliente tramite l'API LemonSqueezy

```typescript
const { data, error } = await createCustomer(Number(this.storeId), {
  email: params.email,
  name: params.name || '',
  city: params.metadata?.city || '',
  region: params.metadata?.region || '',
  country: params.metadata?.country || ''
});
```

## Gestione degli Errori

| Stato | Codice Errore | Causa |
|--------|-----------|-------|
| 400 | `VALIDATION_ERROR` | Corpo della richiesta o parametri non validi |
| 401 | `Unauthorized` | Nessuna sessione autenticata |
| 500 | `CONFIGURATION_ERROR` | Variabili d'ambiente mancanti |
| 500 | `INTERNAL_ERROR` | Errore non gestito |
| 503 | `PAYMENT_SERVICE_ERROR` | API LemonSqueezy non disponibile |

## Requisiti di Configurazione

| Variabile | Richiesta | Descrizione |
|----------|----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Sì | Chiave API LemonSqueezy |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Sì | Segreto per la firma del webhook |
| `LEMONSQUEEZY_STORE_ID` | Sì | ID numerico del negozio |

## Limitazioni

- **Nessun setup intent**: LemonSqueezy non supporta il salvataggio delle carte senza un acquisto. Il metodo `createSetupIntent` genera un errore.
- **Nessuna API di rimborso diretta**: I rimborsi devono essere elaborati tramite la dashboard LemonSqueezy.
- **Prezzi basati su varianti**: I prodotti usano ID variante invece di ID prezzo. I cambi di piano usano `variantId`.

## Considerazioni sulla Sicurezza

- Le firme dei webhook vengono verificate usando HMAC SHA-256
- Il testo grezzo del corpo viene usato per la verifica della firma per prevenire problemi di ri-serializzazione JSON
- Le chiavi API non vengono mai esposte al client
- Il logging in modalità sviluppo sanitizza le PII (gli indirizzi email vengono parzialmente oscurati)

## Pagine Correlate

- [Approfondimento Checkout Stripe](./stripe-checkout-deep-dive.md)
- [Approfondimento Polar](./polar-deep-dive.md)
- [Approfondimento Solidgate](./solidgate-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
