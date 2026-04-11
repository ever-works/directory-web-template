---
id: webhook-architecture
title: Webhook-Architektur
sidebar_label: Webhooks
sidebar_position: 3
---

# Webhook-Architektur

Dieser Leitfaden behandelt das Webhook-Verarbeitungssystem, das zur Verarbeitung von Ereignissen von externen Diensten wie Stripe, LemonSqueezy und anderen Zahlungsanbietern verwendet wird, einschließlich Signaturüberprüfung, Ereignisweiterleitung, Idempotenz und Wiederholungsbehandlung.

## Architekturübersicht

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

## Zahlungsanbieter-Webhooks

Die Vorlage verwendet das `PaymentServiceManager` -Muster, um mehrere Zahlungsanbieter zu unterstützen:

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

### Webhook-Routenhandlermuster

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

## Signaturüberprüfung

### Stripe-Webhooks

Stripe verwendet HMAC-SHA256-Signaturen mit Zeitstempel, um Replay-Angriffe zu verhindern:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### LemonSqueezy Webhooks

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

## Ereignisweiterleitung

### Zuordnung von Ereignistyp zu Handler

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

## Idempotenz

### Doppelte Verarbeitung verhindern

Webhook-Anbieter können Ereignisse erneut senden. Verwenden Sie die Ereignis-ID, um eine doppelte Verarbeitung zu verhindern:

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

## Wiederholen Sie die Behandlung

### Wiederholungsversuchsverhalten des Anbieters

| Anbieter | Wiederholungsplan | Max. Wiederholungen | Zeitüberschreitung |
|----------|---------------|-------------|---------|
| Streifen | Exponentieller Backoff über 3 Tage | ~16 Versuche | 20 Sekunden |
| LemonSqueezy | Exponentielles Backoff | 5 Versuche | 15 Sekunden |

### Best Practices für wiederholsichere Handler

1. **Schnell 200 zurückgeben**: Empfang innerhalb von 5 Sekunden bestätigen. Entlasten Sie schwere Verarbeitungsvorgänge.
2. **Idempotente Handler**: Stellen Sie sicher, dass die erneute Verarbeitung desselben Ereignisses zum gleichen Ergebnis führt.
3. **Bei dauerhaften Fehlern 4xx zurückgeben**: Bei ungültigen Signaturen 400 zurückgeben. Der Anbieter wird es nicht erneut versuchen.
4. **Bei vorübergehenden Fehlern 5xx zurückgeben**: Geben Sie 500 zurück, wenn Ihre Datenbank vorübergehend nicht verfügbar ist. Der Anbieter wird es erneut versuchen.

## Warteschlangenmuster für unzustellbare Nachrichten

Implementieren Sie für Ereignisse, deren Verarbeitung wiederholt fehlschlägt, ein Muster für unzustellbare Nachrichten:

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

## Sicherheitsüberlegungen

1. **Signaturen immer überprüfen**, bevor Webhook-Nutzdaten verarbeitet werden.
2. **Verwenden Sie einen zeitsicheren Vergleich** ( `crypto.timingSafeEqual` ), um Timing-Angriffe zu verhindern.
3. **Lesen Sie den Rohtext** vor dem JSON-Parsing – für die Signaturüberprüfung sind die genauen empfangenen Bytes erforderlich.
4. **Webhook-Endpunkte** nur auf POST beschränken.
5. **Legen Sie keine Webhook-Geheimnisse offen** in clientseitigem Code oder Protokollen.
6. **Validieren Sie Ereignisdaten**, bevor Sie darauf reagieren – vertrauen Sie Webhook-Payloads nicht blind.

## Leistungsüberlegungen

1. **Schnelle Bestätigung**: 200 innerhalb des Timeout-Fensters des Anbieters zurückgeben. Verlagern Sie schwere Arbeit auf Hintergrundjobs.
2. **Datenbankschreibvorgänge**: DB-Vorgänge im Webhook-Handler minimieren. Batch-Updates, sofern möglich.
3. **Protokollierung**: Protokollieren Sie Ereignis-IDs und -Typen zum Debuggen, vermeiden Sie jedoch die Protokollierung vollständiger Nutzlasten (kann personenbezogene Daten enthalten).

## Fehlerbehebung

### Signaturüberprüfung schlägt fehl

1. Stellen Sie sicher, dass Sie den **rohen Anforderungstext** (nicht geparstes JSON) lesen.
2. Überprüfen Sie, ob das Webhook-Geheimnis mit dem in Ihrem Anbieter-Dashboard übereinstimmt.
3. Stellen Sie sicher, dass keine Middleware den Anforderungstext ändert, bevor er den Handler erreicht.

### Doppelte Ereignisse verarbeitet

1. Implementieren Sie Idempotenz mithilfe der Ereignis-ID wie oben beschrieben.
2. Überprüfen Sie die Tabelle `webhookEvents` auf doppelte Einträge.
3. Verwenden Sie eindeutige Einschränkungen auf Datenbankebene für die Ereignis-ID-Spalte.

### Zeitüberschreitung bei Ereignissen

1. Verlagern Sie schwere Verarbeitungsvorgänge mithilfe von `BackgroundJobManager` in Hintergrundjobs.
2. Bestätigen Sie den Webhook sofort und verarbeiten Sie ihn asynchron.
3. Erhöhen Sie bei Bedarf das Timeout für externe API-Aufrufe.

## Verwandte Dokumentation

- [Fehlerbehebungsmuster](./error-recovery-patterns.md)
- [Rate-Limiting-Architektur](./rate-limiting-architecture.md)
- [API-Client-Architektur](./api-client-architecture.md)
