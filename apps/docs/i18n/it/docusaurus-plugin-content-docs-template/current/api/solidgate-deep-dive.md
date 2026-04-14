---
id: solidgate-deep-dive
title: "Approfondimento Solidgate"
sidebar_label: "Solidgate"
---

# Approfondimento Solidgate

Questa pagina copre la completa integrazione con Solidgate, inclusa la creazione del checkout, l'elaborazione dei webhook, la verifica dei pagamenti e il form di pagamento incorporato.

## Panoramica

Solidgate è un provider di infrastrutture di pagamento che supporta sia flussi di checkout ospitati che un SDK React incorporabile per form di pagamento inline. L'integrazione crea payment intent tramite l'API Solidgate e supporta l'elaborazione degli eventi webhook con protezione dell'idempotency. Solidgate usa HMAC-SHA512 per la verifica delle firme webhook.

## Tabella delle Route

| Metodo | Percorso | Auth | Descrizione |
|--------|------|------|-------------|
| `POST` | `/api/solidgate/checkout` | Sessione richiesta | Crea una sessione di checkout / payment intent |
| `POST` | `/api/solidgate/webhook` | Firma richiesta | Elabora gli eventi webhook in arrivo |
| `GET` | `/api/solidgate/webhook` | Nessuna | Restituisce la documentazione dell'endpoint |

## Creazione Checkout (POST)

### Corpo della Richiesta

L'endpoint di checkout usa la validazione Zod per un controllo rigoroso degli input:

```typescript
const checkoutSchema = z.object({
  amount: z.number().positive(),               // Importo del pagamento
  currency: z.string().default('USD'),         // Codice valuta
  mode: z.enum(['one_time', 'subscription']).default('one_time'),
  successUrl: z.string().url(),                // URL di reindirizzamento
  cancelUrl: z.string().url(),                 // URL di annullamento
  metadata: z.record(z.string(), z.any()).optional()
});
```

### Esempio di Richiesta

```bash
curl -X POST /api/solidgate/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "mode": "one_time",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel",
    "metadata": { "planId": "pro_plan", "planName": "Pro Plan" }
  }'
```

### Come Funziona

1. Autentica l'utente tramite `auth()`
2. Convalida il corpo della richiesta con lo schema Zod
3. Risolve o crea un cliente Solidgate
4. Crea un payment intent tramite l'API Solidgate
5. Restituisce l'ID pagamento e il client secret per l'SDK incorporato

### Implementazione del Provider

Il metodo `createPaymentIntent` costruisce la richiesta API:

```typescript
const paymentRequest: SolidgatePaymentRequest = {
  amount: paymentAmount,                    // Importo in centesimi
  currency: currency.toUpperCase(),
  order_id: `order_${crypto.randomUUID()}`,
  order_description: metadata?.planName || 'Payment',
  customer_email: metadata?.email,
  customer_id: customerId,
  redirect_url: successUrl || `${appUrl}/payment/success`,
  callback_url: `${appUrl}/api/solidgate/webhook`,
  metadata: { ...metadata, customerId, paymentIntentId }
};

const response = await this.makeApiRequest<SolidgatePaymentResponse>(
  '/payments', 'POST', paymentRequest
);
```

### Risposta di Successo (200)

```json
{
  "data": {
    "id": "payment_1234567890abcdef",
    "url": "pi_abc123-def456"
  },
  "status": 200,
  "message": "Checkout session created successfully"
}
```

Il campo `url` contiene l'ID del payment intent usato per inizializzare il Solidgate React SDK.

## Form di Pagamento Incorporato

Solidgate fornisce un React SDK per i form di pagamento inline. Il provider genera una firma per l'inizializzazione dell'SDK:

```typescript
private generatePaymentIntentSignature(paymentIntent: string, merchantId: string): string {
  const data = `${merchantId}${paymentIntent}`;
  return crypto.createHmac('sha512', this.secretKey).update(data).digest('hex');
}
```

Il metodo `getUIComponents()` restituisce un wrapper del form di pagamento configurato:

```typescript
getUIComponents(): UIComponents {
  const SolidgatePaymentFormWithConfig = (props: PaymentFormProps) => {
    const paymentIntent = props.clientSecret;
    const merchantId = this.getMerchantId();
    const signature = this.generatePaymentIntentSignature(paymentIntent, merchantId);

    return React.createElement(SolidgateElementsWrapper, {
      ...props,
      solidgatePublicKey: this.publishableKey,
      merchantId,
      paymentIntent,
      signature
    });
  };
  return { PaymentForm: SolidgatePaymentFormWithConfig, ... };
}
```

## Elaborazione dei Webhook

### Verifica della Firma

Solidgate usa HMAC-SHA512 per le firme webhook. L'header della firma può essere `x-signature` o `solidgate-signature`:

```typescript
const signature = headersList.get('x-signature') || headersList.get('solidgate-signature');
```

Il provider verifica la firma rispetto al corpo grezzo:

```typescript
const expectedSignature = this.generateSignature(rawBody, this.webhookSecret);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}

private generateSignature(data: string, secret: string): string {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}
```

### Protezione dell'Idempotency

L'endpoint webhook include la protezione dell'idempotency in-memory per prevenire l'elaborazione duplicata:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 ore

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true }); // Conferma senza elaborare
}

if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
In un ambiente serverless di produzione, il Set in-memory dovrebbe essere sostituito con Redis o una tabella di database per l'idempotency cross-istanza.
:::

### Mappatura degli Eventi

| Evento Solidgate | Tipo Interno |
|----------------|---------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

### Struttura degli Handler

Ogni handler delega a `WebhookSubscriptionService`:

```typescript
async function handleSubscriptionCreated(data: any) {
  try {
    await webhookSubscriptionService.handleSubscriptionCreated(data);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}
```

`WebhookSubscriptionService` viene inizializzato con la costante del provider `SOLIDGATE`:

```typescript
const webhookSubscriptionService = new WebhookSubscriptionService(PaymentProvider.SOLIDGATE);
```

## Verifica del Pagamento

Il provider supporta la verifica del pagamento tramite l'API Solidgate:

```typescript
async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
  const response = await this.makeApiRequest<SolidgatePaymentStatus>(
    `/payments/${paymentId}`, 'GET'
  );
  const isSuccess = response.transaction_status === 'success'
    || response.transaction_status === 'completed';

  return {
    isValid: isSuccess,
    paymentId: response.payment_id,
    status: response.transaction_status,
    details: {
      amount: response.amount / 100,
      currency: response.currency.toLowerCase(),
      orderId: response.order_id
    }
  };
}
```

## Gestione degli Abbonamenti

### Creazione degli Abbonamenti

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const response = await this.makeApiRequest('/subscriptions', 'POST', {
    customer_id: customerId,
    plan_id: priceId,
    metadata
  });
  // Restituisce SubscriptionInfo con stato mappato
}
```

### Cancellazione degli Abbonamenti

Supporta sia la cancellazione immediata che alla fine del periodo:

```typescript
const endpoint = cancelAtPeriodEnd
  ? `/subscriptions/${subscriptionId}/cancel`
  : `/subscriptions/${subscriptionId}/cancel-immediate`;
```

### Aggiornamento degli Abbonamenti

```typescript
const updateData: any = {};
if (priceId) updateData.plan_id = priceId;
if (cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = cancelAtPeriodEnd;
if (metadata) updateData.metadata = metadata;

await this.makeApiRequest(`/subscriptions/${subscriptionId}`, 'PUT', updateData);
```

## Comunicazione API

Tutte le chiamate API Solidgate usano un metodo centralizzato `makeApiRequest`:

```typescript
private async makeApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any
): Promise<T> {
  const url = `${this.apiBaseUrl}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  // Gestione errori e parsing JSON
}
```

## Gestione degli Errori

| Stato | Errore | Causa |
|--------|-------|-------|
| 400 | `Invalid request body` | Validazione Zod fallita |
| 400 | `Invalid JSON` | Corpo della richiesta malformato |
| 400 | `Failed to create customer` | Risoluzione cliente fallita |
| 400 | `No signature provided` | Firma webhook mancante |
| 400 | `Webhook not processed` | Verifica firma fallita |
| 401 | `Unauthorized` | Nessuna sessione autenticata |
| 500 | `Failed to create checkout session` | Errore API Solidgate |

Gli errori di validazione Zod restituiscono messaggi dettagliati a livello di campo:

```typescript
const errorMessage = result.error.issues
  .map(issue => `${issue.path.join('.')}: ${issue.message}`)
  .join(', ');
```

## Requisiti di Configurazione

| Variabile | Richiesto | Descrizione |
|----------|----------|-------------|
| `SOLIDGATE_API_KEY` | Sì | Chiave API Solidgate |
| `SOLIDGATE_SECRET_KEY` | Sì | Chiave segreta per la generazione delle firme |
| `SOLIDGATE_WEBHOOK_SECRET` | Sì | Segreto di firma webhook |
| `SOLIDGATE_PUBLISHABLE_KEY` | Sì | Chiave pubblica per il React SDK |
| `SOLIDGATE_MERCHANT_ID` | Sì | Identificatore merchant |
| `SOLIDGATE_API_BASE_URL` | No | URL base API (predefinito: `https://api.solidgate.com/v1`) |

## Considerazioni sulla Sicurezza

- HMAC-SHA512 viene usato sia per la verifica delle firme webhook che del payment intent
- La chiave segreta e il segreto webhook non vengono mai esposti al client
- La protezione dell'idempotency previene l'elaborazione duplicata dei webhook
- La validazione Zod garantisce un controllo rigoroso degli input sull'endpoint di checkout
- I trace degli stack degli errori sono inclusi solo in modalità sviluppo
- L'utilità `safeErrorMessage` sanitizza i messaggi di errore per la produzione

## Pagine Correlate

- [Approfondimento Stripe Checkout](./stripe-checkout-deep-dive.md)
- [Approfondimento LemonSqueezy](./lemonsqueezy-deep-dive.md)
- [Approfondimento Polar](./polar-deep-dive.md)
- [Architettura del Provider di Pagamento](./payment-provider-architecture.md)
