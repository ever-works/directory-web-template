---
id: polar-deep-dive
title: "Approfondimento Polar"
sidebar_label: "Polar"
---

# Approfondimento Polar

Questa pagina copre la completa integrazione con Polar, inclusa la creazione del checkout, la gestione degli abbonamenti, il portale clienti e l'elaborazione dei webhook.

## Panoramica

Polar è una piattaforma di pagamento moderna progettata per software e prodotti digitali. L'integrazione supporta sia i pagamenti una tantum che gli abbonamenti attraverso il sistema di checkout di Polar, con una gestione del ciclo di vita basata sui webhook. Polar utilizza prodotti con scope organizzazione e `@polar-sh/sdk` per le interazioni API.

## Tabella delle Route

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| `POST` | `/api/polar/checkout` | Sessione richiesta | Crea sessione di checkout (abbonamento o una tantum) |
| `GET` | `/api/polar/checkout` | Sessione richiesta | Recupera lo stato della sessione di checkout |
| `POST` | `/api/polar/webhook` | Firma richiesta | Elabora gli eventi webhook in arrivo |

## Creazione Checkout (POST)

### Corpo della Richiesta

```typescript
interface PolarCheckoutRequest {
  productId: string;                        // ID prodotto Polar
  mode?: 'one_time' | 'subscription';       // Predefinito: "subscription"
  successUrl: string;                       // URL di reindirizzamento dopo il successo
  cancelUrl: string;                        // URL di reindirizzamento dopo l'annullamento
  metadata?: {
    planId?: string;
    planName?: string;
    billingInterval?: string;
    [key: string]: any;
  };
}
```

### Esempio di Richiesta

```bash
curl -X POST /api/polar/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "productId": "prod_1234567890abcdef",
    "mode": "subscription",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Come Funziona

La route di checkout gestisce due flussi:

**Modalità Abbonamento:**
1. Autentica l'utente e risolve il cliente Polar
2. Sanitizza i metadati (rimuove i valori `undefined` -- Polar li rifiuta)
3. Chiama `polarProvider.createSubscription()` che crea una sessione di checkout
4. Restituisce l'URL di checkout dal risultato dell'abbonamento

**Modalità Pagamento Una Tantum:**
1. Autentica l'utente e risolve il cliente Polar
2. Usa direttamente il Polar SDK per creare un checkout
3. Restituisce l'URL di checkout

### Sanitizzazione dei Metadati

Polar richiede che tutti i valori dei metadati siano non-null e non-undefined:

```typescript
const sanitizedMetadata: Record<string, any> = {
  userId: session.user.id || ''
};
if (metadata.planId) sanitizedMetadata.planId = metadata.planId;
if (metadata.planName) sanitizedMetadata.planName = metadata.planName;
// Includi solo valori definiti
Object.entries(metadata).forEach(([key, value]) => {
  if (value !== undefined && value !== null) {
    sanitizedMetadata[key] = value;
  }
});
```

### Risposta di Successo (200)

```json
{
  "data": {
    "id": "checkout_1234567890abcdef",
    "url": "https://polar.sh/checkout/checkout_1234567890abcdef"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

## Recupero di una Sessione di Checkout (GET)

### Parametri di Query

| Parametro | Richiesto | Descrizione |
|-----------|----------|-------------|
| `checkout_id` | Sì | ID sessione di checkout Polar |

### Risposta di Successo (200)

```json
{
  "checkout": { "...oggetto checkout Polar completo..." },
  "status": "complete",
  "customer": "customer_1234567890abcdef",
  "subscription": "subscription_1234567890abcdef"
}
```

## Gestione degli Abbonamenti

### Creazione degli Abbonamenti

Il metodo `PolarProvider.createSubscription()` crea un checkout per l'abbonamento:

```typescript
const checkout = await this.polar.checkouts.create({
  products: [priceId],
  organizationId: this.organizationId,
  customerId: customerId,
  successUrl: metadata?.successUrl,
  metadata: sanitizedMetadata
});
```

### Cancellazione degli Abbonamenti

Polar supporta due strategie di cancellazione:

```typescript
// Annulla alla fine del periodo (cancellazione soft)
await cancelSubscriptionAtPeriodEnd({ polar, subscriptionId });

// Annulla immediatamente (cancellazione hard)
await cancelSubscriptionImmediately({ polar, subscriptionId });
```

Il provider convalida lo stato dell'abbonamento prima della cancellazione:

```typescript
const validateResult = validateSubscriptionId(subscriptionId);
if (!validateResult.isValid) {
  throw new PolarFatalError(validateResult.error);
}
```

### Riattivazione degli Abbonamenti

Gli abbonamenti programmati per la cancellazione possono essere riattivati:

```typescript
if (isScheduledForCancellation(subscription)) {
  const result = await reactivatePolarSubscription({
    polar, subscriptionId, subscription
  });
}
```

### Aggiornamento degli Abbonamenti

I cambi di piano vengono gestiti tramite `polar.subscriptions.update()`:

```typescript
const updated = await this.polar.subscriptions.update({
  id: subscriptionId,
  productId: newProductId
});
```

## Elaborazione dei Webhook

### Verifica della Firma

Polar usa la funzione `validateEvent` di `@polar-sh/sdk/webhooks` per la verifica. Il webhook richiede tre header:

| Header | Descrizione |
|--------|-------------|
| `webhook-signature` | Firma HMAC SHA256 (formato: `v1,<hex_signature>`) |
| `webhook-timestamp` | Timestamp Unix dell'evento |
| `webhook-id` | ID univoco di consegna webhook |

```typescript
const webhookResult = await polarProvider.handleWebhook(
  body,           // JSON analizzato
  signatureHeader, // Firma completa "v1,..."
  bodyText,        // Corpo grezzo per la verifica
  timestampHeader,
  webhookIdHeader
);
```

### Tipi di Evento

| Evento Polar | Mappatura Interna |
|-------------|------------------|
| `checkout.succeeded` | Pagamento riuscito |
| `checkout.failed` | Pagamento fallito |
| `subscription.created` | Abbonamento creato |
| `subscription.updated` | Abbonamento aggiornato |
| `subscription.canceled` | Abbonamento annullato |
| `invoice.paid` | Pagamento abbonamento riuscito |
| `invoice.payment_failed` | Pagamento abbonamento fallito |

### Router dei Webhook

Gli eventi vengono instradati attraverso un modulo router dedicato:

```typescript
await routeWebhookEvent(webhookResult.type, webhookResult.data);
```

Il router mappa i tipi di evento alle funzioni handler che aggiornano il database tramite `WebhookSubscriptionService` e inviano notifiche email.

### Validazione del Payload

L'endpoint webhook convalida la struttura del payload prima dell'elaborazione:

```typescript
if (!validateWebhookPayload(body)) {
  return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
}
```

## Gestione dei Clienti

Il provider segue il pattern di risoluzione standard in tre passaggi:

1. Controlla i metadati utente per l'ID cliente Polar
2. Esegue una query sulla tabella di database `PaymentAccount`
3. Crea un nuovo cliente tramite il Polar SDK

```typescript
const customer = await this.polar.customers.create({
  organizationId: this.organizationId,
  email: params.email,
  name: params.name,
  metadata: params.metadata
});
```

## Gestione degli Errori

| Stato | Errore | Causa |
|--------|-------|-------|
| 400 | `Product ID is required` | `productId` mancante nella richiesta |
| 400 | `Checkout ID is required` | Richiesta GET senza `checkout_id` |
| 400 | `No signature provided` | Header di firma mancante nel webhook |
| 401 | `Unauthorized` | Nessuna sessione autenticata |
| 500 | `Failed to create checkout` | URL di checkout non disponibile |
| 500 | `Configuration error` | Provider Polar non configurato |
| 503 | Configurazione pagamento incompleta | L'organizzazione non ha completato la configurazione dei pagamenti in Polar |

L'endpoint di checkout include il rilevamento speciale degli errori di configurazione pagamento:

```typescript
if (error.message.includes('Payments are currently unavailable') ||
    error.message.includes('needs to complete their payment setup')) {
  statusCode = 503;
  fallbackMessage = 'Polar payment setup incomplete...';
}
```

## Requisiti di Configurazione

| Variabile | Richiesto | Descrizione |
|----------|----------|-------------|
| `POLAR_ACCESS_TOKEN` | Sì | Token di accesso API Polar |
| `POLAR_WEBHOOK_SECRET` | Sì | Segreto di firma webhook |
| `POLAR_ORGANIZATION_ID` | Sì | ID organizzazione Polar |

## Considerazioni sulla Sicurezza

- Le firme dei webhook vengono verificate usando la funzione `validateEvent` dell'SDK ufficiale
- Il testo del corpo grezzo viene preservato per la verifica della firma (la ri-serializzazione JSON potrebbe alterare il corpo)
- Vengono controllati tre header separati: firma, timestamp e ID webhook
- I metadati vengono sanitizzati lato server per prevenire l'iniezione di valori undefined
- Le risposte di errore utilizzano `safeErrorResponse` per prevenire la divulgazione di informazioni

## Pagine Correlate

- [Approfondimento LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Approfondimento Solidgate](./solidgate-deep-dive.md)
- [Approfondimento Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
