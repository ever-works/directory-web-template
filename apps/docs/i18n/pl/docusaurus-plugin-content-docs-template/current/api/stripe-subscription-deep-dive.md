---
id: stripe-subscription-deep-dive
title: "Subskrypcje Stripe – szczegółowe omówienie"
sidebar_label: "Subskrypcje Stripe"
---

# Subskrypcje Stripe – szczegółowe omówienie

Ta strona omawia kompletną integrację subskrypcji Stripe, w tym tworzenie, aktualizację, anulowanie i mapowanie statusu.

## Tabela tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `POST` | `/api/stripe/subscription` | Wymagana sesja | Utwórz nową subskrypcję |
| `PUT` | `/api/stripe/subscription` | Wymagana sesja | Zaktualizuj istniejącą subskrypcję |
| `DELETE` | `/api/stripe/subscription` | Wymagana sesja | Anuluj subskrypcję |

## Interfejs CreateSubscriptionRequest

```typescript
interface CreateSubscriptionRequest {
  priceId: string;              // Stripe price ID
  paymentMethodId?: string;     // Payment method to attach
  trialDays?: number;           // Trial period in days
  metadata?: Record<string, string>;
  couponId?: string;            // Coupon to apply
}
```

## Jak to działa (tworzenie subskrypcji)

1. **Uwierzytelnianie** — weryfikuje sesję użytkownika przez `auth()`
2. **Rozwiązywanie klienta** — pobiera lub tworzy klienta Stripe przez `resolveStripeCustomer`
3. **Tworzenie subskrypcji** — wywołuje `stripe.subscriptions.create()` z parametrami

### Implementacja dostawcy

```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
  const { customerId, priceId, paymentMethodId, trialDays, metadata } = params;

  // Attach and set default payment method if provided
  if (paymentMethodId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });
  }

  const subscriptionParams: Stripe.SubscriptionCreateParams = {
    customer: customerId,
    items: [{ price: priceId }],
    metadata: { ...metadata },
    expand: ['latest_invoice.payment_intent']
  };

  if (trialDays) {
    subscriptionParams.trial_period_days = trialDays;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);
  return this.mapToSubscriptionInfo(subscription);
}
```

### Interfejs SubscriptionInfo

```typescript
interface SubscriptionInfo {
  id: string;
  status: SubscriptionStatus;
  priceId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  metadata: Record<string, string>;
}
```

## Aktualizacja subskrypcji (PUT)

### Interfejs UpdateSubscriptionRequest

```typescript
interface UpdateSubscriptionRequest {
  subscriptionId: string;
  priceId?: string;             // For plan change
  cancelAtPeriodEnd?: boolean;  // Soft cancel toggle
  metadata?: Record<string, string>;
}
```

Zmiana planu aktualizuje pozycję subskrypcji za pomocą `stripe.subscriptions.update()`:

```typescript
// Plan change: update the subscription item
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
await stripe.subscriptions.update(subscriptionId, {
  items: [{
    id: subscription.items.data[0].id,
    price: priceId
  }],
  proration_behavior: 'create_prorations'
});
```

Miękkie anulowanie ustawia `cancel_at_period_end` bez natychmiastowego zakończenia subskrypcji:

```typescript
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true
});
```

## Anulowanie subskrypcji (DELETE)

### Interfejs CancelSubscriptionRequest

```typescript
interface CancelSubscriptionRequest {
  subscriptionId: string;
  cancelAtPeriodEnd?: boolean;  // true = soft cancel, false = immediate
  reason?: string;               // Optional cancellation reason
}
```

Dla `cancelAtPeriodEnd: false` (anulowanie natychmiastowe):

```typescript
await stripe.subscriptions.cancel(subscriptionId);
```

Dla `cancelAtPeriodEnd: true` (miękkie anulowanie):

```typescript
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true
});
```

## Mapowanie statusu

| Status Stripe | Status wewnętrzny |
|---------------|------------------|
| `active` | `active` |
| `trialing` | `trialing` |
| `past_due` | `past_due` |
| `canceled` | `cancelled` |
| `unpaid` | `unpaid` |
| `incomplete` | `incomplete` |
| `incomplete_expired` | `incomplete_expired` |
| `paused` | `paused` |

## Śledzenie metadanych

Subskrypcje zawierają metadane do wewnętrznego śledzenia:

```typescript
metadata: {
  userId,          // Internal user ID
  priceId,         // Stripe price ID
  planName,        // Human-readable plan name
  ...customMetadata
}
```

## Obsługa błędów

| Kod | Treść | Przyczyna |
|-----|-------|-----------|
| 400 | `Missing subscriptionId` | Brak ID subskrypcji w żądaniu PUT/DELETE |
| 400 | `Failed to create customer` | Rozwiązywanie klienta nie powiodło się |
| 401 | `Unauthorized` | Brak uwierzytelnionej sesji |
| 404 | `Subscription not found` | Subskrypcja nie istnieje |
| 500 | `Failed to create subscription` | Błąd API Stripe |

## Kwestie bezpieczeństwa

- Subskrypcje są weryfikowane pod kątem przynależności do zalogowanego użytkownika przed aktualizacją lub anulowaniem
- Metody płatności są dołączane do klienta Stripe, a nie przechowywane lokalnie
- Klucz API Stripe jest przechowywany wyłącznie po stronie serwera i nigdy nie jest ujawniany klientowi
