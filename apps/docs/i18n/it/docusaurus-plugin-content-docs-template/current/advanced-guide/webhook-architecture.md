---
id: webhook-architecture
title: Architettura del webhook
sidebar_label: Webhook
sidebar_position: 3
---

# Architettura webhook

Questa guida illustra il sistema di gestione dei webhook utilizzato per l'elaborazione di eventi da servizi esterni come Stripe, LemonSqueezy e altri fornitori di pagamenti, inclusa la verifica della firma, l'instradamento degli eventi, l'idempotenza e la gestione dei nuovi tentativi.

## Panoramica dell'architettura

```
Webhook Processing Pipeline
=============================

  External Service (Stripe, LemonSqueezy, etc.)
       |
       | POST /api/webhook/{provider}
       v
  +------------------------+
  | Signature Verification |  <-- HMAC / asymmetric verification
  +------------------------+
       |
       v
  +------------------------+
  | Raw Body Parsing       |  <-- Read raw body for signature check
  +------------------------+
       |
       v
  +------------------------+
  | Event Routing          |  <-- Map event type to handler
  +------------------------+
       |
       v
  +------------------------+
  | Idempotency Check      |  <-- Prevent duplicate processing
  +------------------------+
       |
       v
  +------------------------+
  | Event Handler          |  <-- Business logic execution
  +------------------------+
       |
       v
  +------------------------+
  | Response (200 / 4xx)   |  <-- Acknowledge receipt
  +------------------------+
```

## Webhook del fornitore di servizi di pagamento

Il modello utilizza il modello `PaymentServiceManager` per supportare più fornitori di servizi di pagamento:

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }
}
```

### Modello del gestore del percorso webhook

```typescript
// app/api/webhook/stripe/route.ts (typical pattern)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Step 1: Read raw body for signature verification
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  // Step 2: Verify webhook signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler
  try {
    await handleWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler failed:', error);
    return NextResponse.json(
      { error: 'Handler failed' },
      { status: 500 }
    );
  }
}
```

## Verifica della firma

### Webhook a strisce

Stripe utilizza le firme HMAC-SHA256 con un timestamp per prevenire attacchi di riproduzione:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### Webhook LemonSqueezy

```typescript
// HMAC verification for LemonSqueezy
import crypto from 'crypto';

function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## Instradamento degli eventi

### Mappatura del tipo di evento e del gestore

```typescript
type WebhookHandler = (event: WebhookEvent) => Promise<void>;

const eventHandlers: Record<string, WebhookHandler> = {
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,

  // Payment events
  'invoice.payment_succeeded': handlePaymentSucceeded,
  'invoice.payment_failed': handlePaymentFailed,

  // Checkout events
  'checkout.session.completed': handleCheckoutCompleted,
};

async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  const handler = eventHandlers[event.type];

  if (!handler) {
    console.log(`Unhandled webhook event type: ${event.type}`);
    return; // Return 200 for unhandled events
  }

  await handler(event);
}
```

## Idempotenza

### Prevenzione dell'elaborazione duplicata

I provider di webhook possono inviare nuovamente gli eventi. Utilizza l'ID evento per evitare elaborazioni duplicate:

```typescript
async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  // Check if event was already processed
  const existing = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  if (existing) {
    console.log(`Duplicate webhook event: ${event.id}`);
    return;
  }

  // Record event before processing
  await db.insert(webhookEvents).values({
    eventId: event.id,
    type: event.type,
    status: 'processing',
    receivedAt: new Date(),
  });

  try {
    const handler = eventHandlers[event.type];
    if (handler) await handler(event);

    await db.update(webhookEvents)
      .set({ status: 'completed' })
      .where(eq(webhookEvents.eventId, event.id));
  } catch (error) {
    await db.update(webhookEvents)
      .set({ status: 'failed', error: String(error) })
      .where(eq(webhookEvents.eventId, event.id));
    throw error;
  }
}
```

## Riprova a gestire

### Comportamento dei tentativi del provider

| Fornitore | Pianificazione tentativi | Numero massimo di tentativi | Timeout |
|----------|--------------|-----|---------|
| Striscia | Backoff esponenziale su 3 giorni | ~16 tentativi | 20 secondi |
| LemonSqueezy | Backoff esponenziale | 5 tentativi | 15 secondi |

### Migliori pratiche per i gestori Retry-Safe

1. **Restituisci 200 rapidamente**: conferma la ricezione entro 5 secondi. Elimina l'elaborazione pesante.
2. **Gestori idempotenti**: garantiscono che la rielaborazione dello stesso evento produca lo stesso risultato.
3. **Restituisce 4xx per errori permanenti**: restituisce 400 per firme non valide. Il provider non riproverà.
4. **Restituisce 5xx per errori temporanei**: restituisce 500 se il database è temporaneamente non disponibile. Il provider riproverà.

## Modello coda lettere non recapitate

Per gli eventi che ripetutamente falliscono l'elaborazione, implementa un modello di lettere non recapitabili:

```typescript
async function processWithDLQ(event: WebhookEvent): Promise<void> {
  const MAX_ATTEMPTS = 3;

  const record = await db.query.webhookEvents.findFirst({
    where: eq(webhookEvents.eventId, event.id)
  });

  const attempts = (record?.attempts ?? 0) + 1;

  if (attempts > MAX_ATTEMPTS) {
    // Move to dead letter queue for manual inspection
    await db.insert(deadLetterQueue).values({
      eventId: event.id,
      type: event.type,
      payload: JSON.stringify(event),
      failedAt: new Date(),
      attempts,
    });
    console.error(`Event ${event.id} moved to dead letter queue after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Attempt processing...
}
```

## Considerazioni sulla sicurezza

1. **Verifica sempre le firme** prima di elaborare qualsiasi payload webhook.
2. **Utilizzare il confronto timing-safe** ( `crypto.timingSafeEqual` ) per prevenire attacchi di timing.
3. **Leggi il corpo non elaborato** prima dell'analisi JSON: la verifica della firma richiede i byte esatti ricevuti.
4. **Limita gli endpoint webhook** solo al POST.
5. **Non esporre i segreti del webhook** nel codice o nei log lato client.
6. **Convalida i dati degli eventi** prima di agire su di essi: non fidarti ciecamente dei payload del webhook.

## Considerazioni sulle prestazioni

1. **Riconoscimento rapido**: restituisce 200 entro la finestra di timeout del provider. Scarica il lavoro pesante su lavori in background.
2. **Scritture database**: riduce al minimo le operazioni DB nel gestore webhook. Aggiornamenti batch ove possibile.
3. **Logging**: registra gli ID e i tipi di eventi per il debug, ma evita di registrare payload completi (potrebbero contenere PII).

## Risoluzione dei problemi

### La verifica della firma non riesce

1. Assicurati di leggere il **corpo della richiesta non elaborata** (JSON non analizzato).
2. Controlla che il segreto del webhook corrisponda a quello nella dashboard del tuo provider.
3. Verificare che non vi sia alcun middleware che modifichi il corpo della richiesta prima che raggiunga il gestore.

### Eventi duplicati elaborati

1. Implementare l'idempotenza utilizzando l'ID evento come descritto sopra.
2. Controllare la tabella `webhookEvents` per eventuali voci duplicate.
3. Utilizzare vincoli univoci a livello di database sulla colonna ID evento.

### Eventi scaduti

1. Spostare l'elaborazione pesante sui lavori in background utilizzando `BackgroundJobManager` .
2. Riconoscere immediatamente il webhook ed elaborarlo in modo asincrono.
3. Aumentare il timeout per le chiamate API esterne, se necessario.

## Documentazione correlata

- [Modelli di ripristino degli errori](./error-recovery-patterns.md)
- [Architettura di limitazione della velocità](./rate-limiting-architecture.md)
- [Architettura client API](./api-client-architecture.md)
