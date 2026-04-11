---
id: webhooks
title: Haki internetowe płatności
sidebar_label: Haki internetowe
sidebar_position: 7
---

# Webhook płatności

Szablon Ever Works przetwarza webhooki płatności od wszystkich czterech obsługiwanych dostawców za pośrednictwem dedykowanych tras API. Każdy punkt końcowy elementu webhook obsługuje weryfikację podpisu, routing zdarzeń, zarządzanie cyklem życia subskrypcji i powiadomienia e-mail.

## Lokalizacje źródłowe

```
app/api/solidgate/webhook/route.ts          # Solidgate webhook handler
app/api/stripe/                             # Stripe webhooks (see Stripe docs)
app/api/lemonsqueezy/                       # LemonSqueezy webhooks
app/api/polar/                              # Polar webhooks
lib/services/webhook-subscription.service.ts # Shared subscription logic
lib/payment/types/payment-types.ts          # WebhookEventType enum
```

## Architektura webhooka

Wszystkie trasy webhook dostawcy mają ten sam wzorzec:

```
Incoming POST --> Signature Verification --> Event Parsing --> Event Routing --> Service Handler
```

Każda trasa deleguje logikę biznesową do wspólnego `WebhookSubscriptionService` , który normalizuje dane specyficzne dla dostawcy do wspólnego formatu przed aktualizacją bazy danych.

## Typy zdarzeń webhooka

Szablon definiuje kompleksowy zestaw typów zdarzeń, na które mapują wszyscy dostawcy:

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

## Obsługa webhooka Solidgate

### Punkt końcowy

```
POST /api/solidgate/webhook
```

### Weryfikacja podpisu

Trasa webhooka Solidgate odczytuje podpis z nagłówka `x-signature` lub `solidgate-signature` :

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

Dostawca weryfikuje podpis za pomocą HMAC-SHA512:

```ts
const expectedSignature = this.generateSignature(
  rawBody, this.webhookSecret
);
if (signature !== expectedSignature) {
  throw new Error('Invalid webhook signature');
}
```

### Idempotencja

Procedura obsługi implementuje sprawdzanie idempotencji w pamięci, aby zapobiec duplikowaniu przetwarzania zdarzeń:

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

:::uwaga
W produkcyjnym środowisku bezserwerowym zamień wartość `Set` w pamięci na Redis lub tabelę bazy danych, aby uzyskać niezawodną idempotencję między instancjami.
:::

### Trasowanie zdarzeń

Po weryfikacji zdarzenia są kierowane do określonych procedur obsługi:

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

### Mapowanie zdarzeń Solidgate

Dostawca mapuje nazwy zdarzeń specyficzne dla Solidgate na typy ogólne szablonu:

| Wydarzenie Solidgate | Szablon wydarzenia |
|--------------------------------|----------------|
| `payment.succeeded` / `payment.completed` | `payment_succeeded` |
| `payment.failed` / `payment.declined` | `payment_failed` |
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` / `subscription.canceled` | `subscription_cancelled` |
| `refund.processed` / `refund.completed` | `refund_succeeded` |

## Usługa subskrypcji webhooka

Wszystkie procedury obsługi webhook delegują do udostępnionego pliku `WebhookSubscriptionService` . Ta usługa jest tworzona dla każdego dostawcy:

```ts
const webhookSubscriptionService = new WebhookSubscriptionService(
  PaymentProvider.SOLIDGATE
);
```

### Normalizacja danych

Usługa normalizuje ładunki webhooka do wspólnego formatu `WebhookSubscriptionData` :

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

### Metody obsługi

Usługa udostępnia procedury obsługi dla każdego typu zdarzenia elementu webhook:

| Metoda | Wydarzenie | Opis |
|--------|-------|------------|
| `handlePaymentSucceeded` | Płatność zakończona | Aktualizuje rekord płatności, uruchamia e-mail z potwierdzeniem |
| `handlePaymentFailed` | Płatność nie powiodła się | Błąd logów, może powiadomić użytkownika |
| `handleSubscriptionCreated` | Nowa subskrypcja | Tworzy zapis subskrypcji w bazie danych |
| `handleSubscriptionUpdated` | Zmiana planu | Aktualizuje szczegóły subskrypcji |
| `handleSubscriptionCancelled` | Anulowanie | Aktualizuje status, ustawia datę anulowania |
| `handleSubscriptionPaymentSucceeded` | Płatność cykliczna | Przedłuża okres subskrypcji |
| `handleSubscriptionPaymentFailed` | Powtarzająca się awaria | Oznacza jako przeterminowane, powiadamia użytkownika |
| `handleSubscriptionTrialEnding` | Zakończenie próby | Wysyła powiadomienie o zakończeniu okresu próbnego |

## Format odpowiedzi webhooka

Wszystkie punkty końcowe webhooka zwracają spójny format:

**Sukces (200):**
```json
{ "received": true }
```

**Błąd klienta (400):**
```json
{ "error": "No signature provided" }
// or
{ "error": "Webhook not processed" }
// or
{ "error": "Webhook processing failed" }
```

Zwrócenie statusu 200 ma kluczowe znaczenie dla potwierdzenia odbioru. Jeśli zwrócono kwotę 400 lub 500, dostawcy usług płatniczych zazwyczaj ponawiają próbę dostarczenia elementu webhook.

## POBIERZ punkt końcowy

Każda trasa webhooka obsługuje również żądania GET w celach diagnostycznych:

```ts
export async function GET() {
  return NextResponse.json({
    message: 'Solidgate webhook endpoint',
    instructions: 'This endpoint accepts POST requests from Solidgate webhooks',
    method: 'POST',
  });
}
```

## Konfigurowanie webhooków w pulpitach dostawców

### Solidgate

1. Przejdź do panelu kontrolnego Solidgate
2. Przejdź do **Ustawienia**, a następnie **Webhooki**
3. Dodaj adres URL webhooka: `https://yourdomain.com/api/solidgate/webhook` 4. Wybierz wydarzenia, które chcesz subskrybować: płatności, subskrypcje, zwroty pieniędzy
5. Skopiuj sekret webhooka do zmiennej środowiskowej `SOLIDGATE_WEBHOOK_SECRET` ### Wzorzec adresu URL webhooka

Każdy dostawca ma swój własny dedykowany punkt końcowy:

| Dostawca | Adres URL webhooka |
|--------------|------------|
| Pasek | `/api/stripe/webhook` |
| Solidgate | `/api/solidgate/webhook` |
| Wyciskacz cytrynowy | `/api/lemonsqueezy/webhook` |
| Polarny | `/api/polar/webhook` |

## Lokalne testowanie webhooków

### Używanie ngrok lub podobnego tunelu

```bash
# Start your dev server
pnpm dev

# In another terminal, expose port 3000
ngrok http 3000
```

Następnie skonfiguruj adres URL ngrok jako punkt końcowy webhooka w panelu dostawcy (np. `https://abc123.ngrok.io/api/solidgate/webhook` ).

### Testowanie ręczne z zawinięciem

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

## Obsługa błędów

Każda funkcja obsługi jest opakowana w try/catch, aby zapobiec niepowodzeniu pojedynczej procedury obsługi powodującej odpowiedź 400/500:

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

Dzięki temu element webhook jest zawsze potwierdzany odpowiedzią 200, nawet jeśli przetwarzanie wewnętrzne nie powiedzie się. Błędy przetwarzania są rejestrowane w celu sprawdzenia, bez powodowania pętli ponawiania prób przez dostawcę.

## Względy bezpieczeństwa

- **Zawsze weryfikuj podpisy** — nigdy nie przetwarzaj ładunków webhooka bez sprawdzenia poprawności podpisu
- **Użyj nieprzetworzonej treści** — przeanalizuj nieprzetworzony tekst żądania w celu weryfikacji podpisu, a nie treść przetworzoną w formacie JSON
- **Idempotencja** — zaimplementuj deduplikację, aby sprawnie obsługiwać ponowne próby dostawcy
- **Logowanie** — rejestrowanie identyfikatorów webhooków i typów zdarzeń na potrzeby ścieżek audytu
– **Tylko HTTPS** – punkty końcowe webhooka muszą być obsługiwane przez protokół HTTPS w środowisku produkcyjnym
