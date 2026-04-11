---
id: webhook-architecture
title: Architektura webhooka
sidebar_label: Haki internetowe
sidebar_position: 3
---

# Architektura webhooka

W tym przewodniku opisano system obsługi webhooka używany do przetwarzania zdarzeń z usług zewnętrznych, takich jak Stripe, LemonSqueezy i innych dostawców płatności, w tym weryfikację podpisu, routing zdarzeń, idempotencję i obsługę ponownych prób.

## Przegląd architektury

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

## Webhooki dostawców płatności

Szablon wykorzystuje wzorzec `PaymentServiceManager` do obsługi wielu dostawców płatności:

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

### Wzorzec obsługi trasy webhooka

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

## Weryfikacja podpisu

### Haki internetowe w paski

Stripe używa sygnatur HMAC-SHA256 ze znacznikiem czasu, aby zapobiec atakom poprzez powtórzenie:

```typescript
// Verification happens before JSON parsing
const event = stripe.webhooks.constructEvent(
  rawBody,       // Must be the raw string, not parsed JSON
  signature,     // From 'stripe-signature' header
  webhookSecret  // From STRIPE_WEBHOOK_SECRET env var
);
```

### Haki internetowe LemonSqueezy

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

## Trasowanie zdarzeń

### Typ zdarzenia na mapowanie procedury obsługi

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

## Idempotencja

### Zapobieganie duplikatom przetwarzania

Dostawcy webhook mogą ponownie wysyłać zdarzenia. Użyj identyfikatora zdarzenia, aby zapobiec dublowaniu przetwarzania:

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

## Ponów próbę obsługi

### Zachowanie ponawiania próby dostawcy

| Dostawca | Harmonogram ponownych prób | Maksymalna liczba ponownych prób | Limit czasu |
|---------|---------------|------------|-------------|
| Pasek | Wykładniczy zwrot w ciągu 3 dni | ~16 prób | 20 sekund |
| Wyciskacz cytrynowy | Wykładniczy zwrot | 5 prób | 15 sekund |

### Najlepsze praktyki dotyczące obsługi z możliwością ponownego podjęcia próby

1. **Zwróć szybko 200**: Potwierdź odbiór w ciągu 5 sekund. Odciąż ciężkie przetwarzanie.
2. **Idempotentne procedury obsługi**: Upewnij się, że ponowne przetworzenie tego samego zdarzenia daje ten sam wynik.
3. **Zwróć 4xx w przypadku trwałych błędów**: Zwróć 400 w przypadku nieprawidłowych podpisów. Dostawca nie podejmie ponownej próby.
4. **Zwróć 5xx w przypadku przejściowych błędów**: Zwróć 500, jeśli Twoja baza danych jest tymczasowo niedostępna. Dostawca spróbuje ponownie.

## Wzór kolejki niedostarczonych listów

W przypadku zdarzeń, których przetwarzanie wielokrotnie kończy się niepowodzeniem, zaimplementuj wzorzec martwej wiadomości:

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

## Względy bezpieczeństwa

1. **Zawsze sprawdzaj podpisy** przed przetworzeniem jakiegokolwiek ładunku webhooka.
2. **Użyj porównania bezpiecznego pod względem czasu** ( `crypto.timingSafeEqual` ), aby zapobiec atakom związanym z synchronizacją.
3. **Przeczytaj surową treść** przed analizą JSON – weryfikacja podpisu wymaga dokładnie otrzymanych bajtów.
4. **Ogranicz punkty końcowe webhooka** tylko do testu POST.
5. **Nie ujawniaj sekretów webhooka** w kodzie lub dziennikach po stronie klienta.
6. **Sprawdź dane zdarzenia** przed podjęciem działań — nie ufaj ślepo ładunkom webhooka.

## Względy wydajności

1. **Szybkie potwierdzenie**: Zwróć 200 w ramach limitu czasu dostawcy. Przenieś ciężką pracę na zadania w tle.
2. **Zapisy w bazie danych**: Minimalizuj operacje DB w procedurze obsługi webhooka. Aktualizacje wsadowe, jeśli to możliwe.
3. **Logowanie**: Rejestruj identyfikatory i typy zdarzeń na potrzeby debugowania, ale unikaj rejestrowania pełnych ładunków (może zawierać informacje umożliwiające identyfikację).

## Rozwiązywanie problemów

### Weryfikacja podpisu nie powiodła się

1. Upewnij się, że czytasz **surową treść żądania** (nieprzeanalizowaną JSON).
2. Sprawdź, czy sekret webhooka jest zgodny z sekretem w panelu dostawcy.
3. Sprawdź, czy treść żądania nie jest modyfikowana przez oprogramowanie pośredniczące, zanim dotrze ono do procedury obsługi.

### Przetworzono zduplikowane zdarzenia

1. Zaimplementuj idempotencję przy użyciu identyfikatora zdarzenia, jak opisano powyżej.
2. Sprawdź tabelę `webhookEvents` pod kątem duplikatów wpisów.
3. Użyj unikalnych ograniczeń na poziomie bazy danych w kolumnie identyfikatora zdarzenia.

### Upłynął limit czasu wydarzeń

1. Przenieś ciężkie przetwarzanie do zadań w tle za pomocą `BackgroundJobManager` .
2. Natychmiast potwierdź webhook i przetwarzaj asynchronicznie.
3. W razie potrzeby zwiększ limit czasu dla zewnętrznych wywołań API.

## Powiązana dokumentacja

- [Wzorce odzyskiwania po błędach](./error-recovery-patterns.md)
- [Architektura ograniczająca szybkość](./rate-limiting-architecture.md)
- [Architektura klienta API](./api-client-architecture.md)
