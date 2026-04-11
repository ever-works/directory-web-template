---
id: webhooks
title: Webhook di pagamento
sidebar_label: Webhook
sidebar_position: 7
---

# Webhook di pagamento

Il modello Ever Works elabora i webhook di pagamento di tutti e quattro i fornitori supportati tramite percorsi API dedicati. Ogni endpoint webhook gestisce la verifica della firma, il routing degli eventi, la gestione del ciclo di vita della sottoscrizione e le notifiche e-mail.

## Posizioni delle fonti

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Architettura del webhook

Tutti i percorsi dei webhook del provider seguono lo stesso schema:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Ciascun percorso delega la logica aziendale al `WebhookSubscriptionService` condiviso, che normalizza i dati specifici del provider in un formato comune prima di aggiornare il database.

## Tipi di eventi webhook

Il modello definisce un insieme completo di tipi di eventi in cui tutti i fornitori vengono mappati:

```ts
enum WebhookEventType {
  // Payment events
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_SUCCEEDED = 'refund_succeeded',

  // Subscription lifecycle
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',

  // Stripe-specific
  PAYMENT_INTENT_SUCCEEDED = 'payment_intent_succeeded',
  CHARGE_SUCCEEDED = 'charge_succeeded',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',

  // Billing portal
  BILLING_PORTAL_SESSION_CREATED = 'billing_portal_session_created',
  // ... additional billing portal events
}
```

## Gestore webhook Solidgate

### Punto finale

```
POST /api/solidgate/webhook
```

### Verifica della firma

Il percorso del webhook Solidgate legge la firma dall'intestazione `x-signature` o `solidgate-signature` :

```ts
const headersList = await headers();
const signature =
  headersList.get('x-signature') ||
  headersList.get('solidgate-signature');

if (!signature) {
  return NextResponse.json(
    { error: 'No signature provided' },
    { status: 400 }
  );
}
```

Il provider verifica la firma utilizzando HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotenza

Il gestore implementa il controllo dell'idempotenza in memoria per impedire l'elaborazione di eventi duplicati:

```ts
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Check for duplicates
const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  console.log(`Duplicate webhook ignored: ${webhookId}`);
  return NextResponse.json({ received: true });
}

// Track and auto-expire
if (webhookId) {
  processedWebhooks.add(webhookId);
  setTimeout(() => processedWebhooks.delete(webhookId), WEBHOOK_EXPIRY_MS);
}
```

:::note
In un ambiente serverless di produzione, sostituisci il `Set` in memoria con Redis o una tabella di database per un'idempotenza affidabile tra le istanze.
:::

### Instradamento degli eventi

Dopo la verifica, gli eventi vengono instradati a gestori specifici:

```ts
switch (webhookResult.type) {
  case 'payment_succeeded':
    await handlePaymentSucceeded(webhookResult.data);
    break;
  case 'payment_failed':
    await handlePaymentFailed(webhookResult.data);
    break;
  case 'subscription_created':
    await handleSubscriptionCreated(webhookResult.data);
    break;
  case 'subscription_updated':
    await handleSubscriptionUpdated(webhookResult.data);
    break;
  case 'subscription_cancelled':
    await handleSubscriptionCancelled(webhookResult.data);
    break;
  case 'subscription_payment_succeeded':
    await handleSubscriptionPaymentSucceeded(webhookResult.data);
    break;
  case 'subscription_payment_failed':
    await handleSubscriptionPaymentFailed(webhookResult.data);
    break;
  case 'subscription_trial_ending':
    await handleSubscriptionTrialEnding(webhookResult.data);
    break;
  default:
    console.log(`Unhandled webhook event: ${webhookResult.type}`);
}
```

### Mappatura eventi Solidgate

Il provider associa i nomi degli eventi specifici di Solidgate ai tipi generici del modello:

| Evento Solidgate | Evento modello |
|-----------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## Servizio di abbonamento al webhook

Tutti i gestori webhook delegano al `WebhookSubscriptionService` condiviso. Questo servizio viene istanziato per provider:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Normalizzazione dei dati

Il servizio normalizza i payload del webhook in un formato `WebhookSubscriptionData` comune:

```ts
interface WebhookSubscriptionData {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startDate: Date;
  endDate: Date;
  subscriptionId: string;
  priceId: string;
  customerId: string;
  currency: string;
  amount: number;
  interval: string;
  intervalCount: number;
  trialStart: number;
  trialEnd: number;
  cancelledAt?: Date;
  cancelAtPeriodEnd: boolean;
  cancelReason: string;
  metadata: Record<string, any>;
  // ... additional fields
}
```

### Metodi del gestore

Il servizio fornisce gestori per ciascun tipo di evento webhook:

| Metodo | Evento | Descrizione |
|--------|-------|-----|
| `handlePaymentSucceeded` | Pagamento completato | Aggiorna il record di pagamento, attiva l'e-mail di conferma |
| `handlePaymentFailed` | Pagamento non riuscito | Errore nei registri, può avvisare l'utente |
| `handleSubscriptionCreated` | Nuovo abbonamento | Crea il record di abbonamento nel database |
| `handleSubscriptionUpdated` | Cambio di programma | Aggiorna i dettagli dell'abbonamento |
| `handleSubscriptionCancelled` | Cancellazione | Aggiorna lo stato, imposta la data di cancellazione |
| `handleSubscriptionPaymentSucceeded` | Pagamento ricorrente | Estende il periodo di abbonamento |
| `handleSubscriptionPaymentFailed` | Guasto ricorrente | Contrassegna come scaduto, avvisa l'utente |
| `handleSubscriptionTrialEnding` | Fine della prova | Invia notifica di fine prova |

## Formato di risposta del webhook

Tutti gli endpoint webhook restituiscono un formato coerente:

**Successo (200):**
```json
{ "received": true }
```

**Errore cliente (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Restituire uno stato 200 è fondamentale per confermare la ricezione. Se viene restituito un valore 400 o 500, i fornitori di servizi di pagamento in genere ritentano la consegna del webhook.

## OTTIENI endpoint

Ogni percorso webhook gestisce anche le richieste GET per scopi diagnostici:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Configurazione dei webhook nelle dashboard dei provider

### Solidgate

1. Passare alla dashboard di Solidgate
2. Vai su **Impostazioni** quindi **Webhook**
3. Aggiungi l'URL del tuo webhook: `https://yourdomain.com/api/solidgate/webhook` 4. Seleziona gli eventi a cui iscriverti: pagamenti, abbonamenti, rimborsi
5. Copia il segreto del webhook nella tua variabile di ambiente `SOLIDGATE_WEBHOOK_SECRET` ### Modello URL webhook

Ogni provider ha il proprio endpoint dedicato:

| Fornitore | URL del webhook |
|----------|-------------|
| Striscia | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| LemonSqueezy | `/api/lemonsqueezy/webhook` |
| Polare | `/api/polar/webhook` |

## Test dei webhook in locale

### Usando ngrok o un tunnel simile

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Quindi configura l'URL ngrok come endpoint webhook nella dashboard del provider (ad esempio, `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Test manuale con arricciatura

```bash
# Test the GET diagnostic endpoint
curl http://localhost:3000/api/solidgate/webhook

# Send a test webhook (requires valid signature)
curl -X POST http://localhost:3000/api/solidgate/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: your-computed-hmac-signature" \
  -d '{
    "id": "evt_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_456",
      "amount": 2999,
      "currency": "USD"
    }
  }'
```

## Gestione degli errori

Ogni funzione del gestore è racchiusa in try/catch per evitare che un singolo errore del gestore causi una risposta 400/500:

```ts
async function handlePaymentSucceeded(data: any) {
  console.log('Payment succeeded:', data.id);
  try {
    await webhookSubscriptionService.handlePaymentSucceeded(data);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}
```

Ciò garantisce che il webhook venga sempre riconosciuto con una risposta 200, anche se l'elaborazione interna fallisce. Gli errori di elaborazione vengono registrati per l'indagine senza causare cicli di tentativi del provider.

## Considerazioni sulla sicurezza

- **Verifica sempre le firme**: non elaborare mai i payload del webhook senza la convalida della firma
- **Utilizza corpo non elaborato**: analizza il testo della richiesta non elaborata per la verifica della firma, non il corpo analizzato da JSON
- **Idempotenza**: implementa la deduplicazione per gestire correttamente i tentativi del provider
- **Logging**: registra gli ID webhook e i tipi di eventi per gli audit trail
- **Solo HTTPS**: gli endpoint webhook devono essere serviti tramite HTTPS in produzione
