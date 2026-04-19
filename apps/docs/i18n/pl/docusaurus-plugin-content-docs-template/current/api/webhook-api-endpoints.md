---
id: webhook-api-endpoints
title: "Punkty końcowe API webhooków"
sidebar_label: "Punkty końcowe webhooków"
---

# Punkty końcowe API webhooków

Ta strona dokumentuje punkty końcowe webhooków dla wszystkich czterech dostawców płatności, w tym weryfikację podpisu, mapowanie zdarzeń i wysyłanie powiadomień.

## Przegląd

| Dostawca | Ścieżka | Metoda weryfikacji |
|----------|---------|-------------------|
| Stripe | `/api/stripe/webhook` | HMAC-SHA256 (`stripe-signature`) |
| LemonSqueezy | `/api/lemonsqueezy/webhook` | HMAC-SHA256 (`x-signature`) |
| Polar | `/api/polar/webhook` | Nagłówki Bearer + podpis |
| Solidgate | `/api/solidgate/webhook` | HMAC-SHA512 (`x-signature`) |

## Wspólna architektura

Wszystkie punkty końcowe webhooków implementują ten sam wzorzec pięcioetapowy:

```
POST /api/{provider}/webhook
          |
          v
    1. Pobierz surową treść (text())
          |
          v
    2. Zweryfikuj podpis
          |
          v
    3. Parsuj payloada zdarzenia
          |
          v
    4. Zmapuj typ zdarzenia na obsługę
          |
          v
    5. Deleguj do WebhookSubscriptionService
          |
          v
    { received: true }
```

## Wspólne typy WebhookEventType

Wszystkie cztery integracje mapują zdarzenia specyficzne dla dostawcy na wspólne typy zdarzeń:

```typescript
enum WebhookEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_PAYMENT_SUCCEEDED = 'subscription_payment_succeeded',
  SUBSCRIPTION_PAYMENT_FAILED = 'subscription_payment_failed',
  TRIAL_WILL_END = 'trial_will_end',
  REFUND_SUCCEEDED = 'refund_succeeded',
  UNKNOWN = 'unknown'
}
```

## Webhook Stripe

### Obsługiwane zdarzenia

| Zdarzenie Stripe | Typ wewnętrzny | Akcja |
|----------------|----------------|-------|
| `customer.subscription.created` | `subscription_created` | Utwórz rekord subskrypcji |
| `customer.subscription.updated` | `subscription_updated` | Zaktualizuj status/cechy planu |
| `customer.subscription.deleted` | `subscription_cancelled` | Oznacz jako anulowaną |
| `invoice.payment_succeeded` | `payment_succeeded` | Zarejestruj płatność, wyślij e-mail |
| `invoice.payment_failed` | `payment_failed` | Wyślij e-mail o nieudanej płatności |
| `invoice.paid` | `subscription_payment_succeeded` | Odśwież cechy planu |
| `customer.subscription.trial_will_end` | `trial_will_end` | Wyślij przypomnienie o końcu próby |
| `payment_intent.succeeded` | `payment_succeeded` | Zarejestruj płatność jednorazową |

### Obsługa reklam sponsorowanych

Punkt końcowy webhooka Stripe wykrywa płatności reklam sponsorowanych na podstawie metadanych faktury:

```typescript
function isSponsorAdSubscription(invoice: Stripe.Invoice): boolean {
  return invoice.metadata?.type === 'sponsor_ad' || !!invoice.metadata?.sponsorAdId;
}
```

Gdy reklama sponsorowana jest wykryta, webhook aktywuje reklamę zamiast wysyłać standardowy e-mail płatniczy.

### Odpowiedzi błędów Stripe

| Kod | Treść | Przyczyna |
|-----|-------|-----------|
| 400 | `No signature provided` | Brak nagłówka `stripe-signature` |
| 400 | `Webhook verification failed` | Nieprawidłowy podpis lub nieaktualny payload |
| 400 | `Invalid payload` | Nie można sparsować treści JSON |

## Webhook LemonSqueezy

### Mapowanie zdarzeń

| Zdarzenie LemonSqueezy | Typ wewnętrzny |
|-----------------------|----------------|
| `subscription_created` | `subscription_created` |
| `subscription_updated` | `subscription_updated` |
| `subscription_cancelled` | `subscription_cancelled` |
| `subscription_payment_success` | `subscription_payment_succeeded` |
| `subscription_payment_failed` | `subscription_payment_failed` |
| `order_created` | `payment_succeeded` |

### Wykrywanie reklam sponsorowanych

LemonSqueezy wykrywa reklamy sponsorowane na podstawie metadanych encji niestandardowej:

```typescript
function isSponsorAdCheckout(data: LemonSqueezyEvent): boolean {
  const customData = data.meta?.custom_data;
  return customData?.type === 'sponsor_ad' || !!customData?.sponsorAdId;
}
```

## Webhook Polar

### Wymagane nagłówki

Punkt końcowy webhooka Polar wymaga trzech nagłówków do weryfikacji:

| Nagłówek | Opis |
|----------|------|
| `webhook-id` | Unikalny identyfikator webhooka |
| `webhook-timestamp` | Znacznik czasu Unix zdarzenia |
| `webhook-signature` | HMAC podpis treści |

### Obsługiwane zdarzenia

| Zdarzenie Polar | Typ wewnętrzny |
|----------------|----------------|
| `subscription.created` | `subscription_created` |
| `subscription.updated` | `subscription_updated` |
| `subscription.cancelled` | `subscription_cancelled` |
| `order.created` | `payment_succeeded` |
| `subscription.revoked` | `subscription_cancelled` |

## Webhook Solidgate

### Ochrona przed idempotencją

Soldigate implementuje pamięciową ochronę przed idempotencją z 24-godzinnym wygasaniem:

```typescript
const processedWebhooks = new Set<string>();
const WEBHOOK_EXPIRY_MS = 24 * 60 * 60 * 1000;

const webhookId = parsedBody.id || headersList.get('x-request-id');
if (webhookId && processedWebhooks.has(webhookId)) {
  return NextResponse.json({ received: true }); // Acknowledge without reprocessing
}
```

### Punkt końcowy GET

Solidgate jako jedyny dostawca udostępnia punkt końcowy GET zwracający dokumentację konfiguracji:

```
GET /api/solidgate/webhook
→ Returns endpoint documentation and expected event format
```

### Mapowanie zdarzeń i akcje

| Zdarzenie Solidgate | Typ wewnętrzny | Akcja |
|--------------------|----------------|-------|
| `payment.succeeded` | `payment_succeeded` | Zarejestruj płatność |
| `payment.failed` | `payment_failed` | Wyślij e-mail o nieudanej płatności |
| `subscription.created` | `subscription_created` | Utwórz subskrypcję |
| `subscription.updated` | `subscription_updated` | Zaktualizuj status |
| `subscription.cancelled` | `subscription_cancelled` | Anuluj subskrypcję |

## Powiadomienia e-mail

Serwis e-mail płatności jest wspólny dla wszystkich czterech webhooków dostawców:

| Zdarzenie | Typ e-maila | Odbiorca |
|-----------|-------------|---------|
| `payment_succeeded` | E-mail z potwierdzeniem płatności | Płatnik |
| `payment_failed` | E-mail o nieudanej płatności | Właściciel konta |
| `subscription_cancelled` | E-mail z potwierdzeniem anulowania | Subskrybent |
| `trial_will_end` | Przypomnienie o końcu okresu próbnego | Subskrybent |
| `refund_succeeded` | E-mail z potwierdzeniem zwrotu | Kupujący |

## Kluczowe szczegóły implementacji

| Aspekt | Podejście |
|--------|-----------|
| Weryfikacja podpisu | Każdy dostawca używa własnego algorytmu HMAC |
| Odczyt treści | Wszystkie handlery używają `request.text()` (nie `request.json()`) |
| Delegowanie obsługi | `WebhookSubscriptionService` unifikuje przetwarzanie zdarzeń |
| Obsługa błędów | Błędy obsługi nie przerywają odpowiedzi — Stripe/inni wymagają `200` |
| Idempotencja | Zdarzenia mogą być wysyłane wielokrotnie — handlery są idempotentne |
