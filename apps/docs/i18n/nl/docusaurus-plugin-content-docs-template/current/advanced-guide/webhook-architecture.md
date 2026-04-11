---
id: webhook-architecture
title: Webhook-architectuur
sidebar_label: Webhaken
sidebar_position: 3
---

# Webhook-architectuur

Deze handleiding behandelt het webhook-verwerkingssysteem dat wordt gebruikt voor het verwerken van gebeurtenissen van externe services zoals Stripe, LemonSqueezy en andere betalingsproviders, inclusief handtekeningverificatie, gebeurtenisroutering, idempotentie en afhandeling van nieuwe pogingen.

## Architectuuroverzicht

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

## Webhooks van betalingsproviders

De sjabloon gebruikt het `PaymentServiceManager` -patroon om meerdere betalingsproviders te ondersteunen:

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

### Webhook Route Handler-patroon

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

## Handtekeningverificatie

### Gestreepte webhooks

Stripe gebruikt HMAC-SHA256-handtekeningen met een tijdstempel om replay-aanvallen te voorkomen:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### LemonSqueezy-webhooks

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

## Gebeurtenisroutering

### Gebeurtenistype aan handlertoewijzing

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

## Idempotentie

### Dubbele verwerking voorkomen

Webhookproviders kunnen evenementen opnieuw verzenden. Gebruik de gebeurtenis-ID om dubbele verwerking te voorkomen:

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

## Probeer de afhandeling opnieuw

### Gedrag van opnieuw proberen van provider

| Aanbieder | Schema opnieuw proberen | Max. nieuwe pogingen | Time-out |
|----------|---------------|------------|---------|
| Streep | Exponentieel uitstel over 3 dagen | ~16 pogingen | 20 seconden |
| CitroenSqueezy | Exponentieel uitstel | 5 pogingen | 15 seconden |

### Best practices voor Retry-Safe-handlers

1. **200 snel retourneren**: Bevestig de ontvangst binnen 5 seconden. Ontlast zware verwerking.
2. **Idempotente handlers**: Zorg ervoor dat het opnieuw verwerken van dezelfde gebeurtenis hetzelfde resultaat oplevert.
3. **Retourneer 4xx voor permanente fouten**: Retourneer 400 voor ongeldige handtekeningen. De provider zal het niet opnieuw proberen.
4. **Retourneer 5xx voor tijdelijke fouten**: Retourneer 500 als uw database tijdelijk niet beschikbaar is. De provider zal het opnieuw proberen.

## Wachtrijpatroon met dode letters

Voor gebeurtenissen die herhaaldelijk mislukken, implementeert u een patroon met dode letters:

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

## Beveiligingsoverwegingen

1. **Verifieer altijd handtekeningen** voordat u een webhook-payload verwerkt.
2. **Gebruik timing-veilige vergelijking** ( `crypto.timingSafeEqual` ) om timingaanvallen te voorkomen.
3. **Lees de onbewerkte tekst** voordat JSON wordt geparseerd: handtekeningverificatie vereist de exacte ontvangen bytes.
4. **Beperk webhookeindpunten** tot alleen POST.
5. **Maak geen webhookgeheimen openbaar** in code of logboeken aan de clientzijde.
6. **Valideer gebeurtenisgegevens** voordat u er actie op onderneemt: vertrouw webhook-payloads niet blindelings.

## Prestatieoverwegingen

1. **Snelle bevestiging**: Retourneer 200 binnen de time-outperiode van de provider. Verplaats zwaar werk naar achtergrondbanen.
2. **Database schrijft**: Minimaliseer DB-bewerkingen in de webhook-handler. Batch-updates waar mogelijk.
3. **Logging**: log gebeurtenis-ID's en typen voor foutopsporing, maar vermijd het loggen van volledige payloads (kan PII bevatten).

## Problemen oplossen

### Handtekeningverificatie mislukt

1. Zorg ervoor dat u de **onbewerkte verzoektekst** leest (niet geparseerde JSON).
2. Controleer of het webhookgeheim overeenkomt met dat in uw providerdashboard.
3. Controleer of er geen middleware is die de hoofdtekst van het verzoek wijzigt voordat deze de handler bereikt.

### Dubbele gebeurtenissen verwerkt

1. Implementeer idempotentie met behulp van de gebeurtenis-ID zoals hierboven beschreven.
2. Controleer de tabel `webhookEvents` op dubbele invoer.
3. Gebruik unieke beperkingen op databaseniveau voor de gebeurtenis-ID-kolom.

### Time-out van evenementen

1. Verplaats zware verwerking naar achtergrondtaken met behulp van `BackgroundJobManager` .
2. Bevestig de webhook onmiddellijk en verwerk deze asynchroon.
3. Verhoog indien nodig de time-out voor externe API-aanroepen.

## Gerelateerde documentatie

- [Foutherstelpatronen] (./error-recovery-patterns.md)
- [Rate-limiting-architectuur](./rate-limiting-architecture.md)
- [API-clientarchitectuur] (./api-client-architectuur.md)
