---
id: payment-endpoints
title: "Punkty końcowe API Płatności"
sidebar_label: "Punkty końcowe Płatności"
---

# Punkty końcowe API Płatności

Szablon obsługuje czterech dostawców płatności: **Stripe**, **LemonSqueezy**, **Polar** i **Solidgate**. Które punkty końcowe są aktywne, zależy od skonfigurowanej zmiennej środowiskowej `PAYMENT_PROVIDER`. Istnieje również centralny punkt końcowy `/api/payment` do obsługi ogólnej bramki płatności.

## Przegląd dostawców

| Dostawca | Zmienne środowiskowe | Specjalizacja |
|----------|----------------------|---------------|
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Subskrypcje, metody płatności, setup intents |
| LemonSqueezy | `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_WEBHOOK_SECRET` | Proste zakupy i subskrypcje |
| Polar | `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET` | Open-source i zakupy sponsorowane |
| Solidgate | `SOLIDGATE_PUBLIC_KEY`, `SOLIDGATE_SECRET_KEY` | Przekierowania płatności |

---

## Punkty końcowe Stripe

Wszystkie trasy Stripe są zlokalizowane w `app/api/stripe/`.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/stripe/checkout` | Utwórz sesję Checkout Stripe |
| `GET` | `/api/stripe/checkout` | Pobierz sesję Checkout według ID |
| `GET` | `/api/stripe/subscriptions` | Wyświetl subskrypcje użytkownika |
| `POST` | `/api/stripe/subscriptions` | Utwórz lub zaktualizuj subskrypcję |
| `DELETE` | `/api/stripe/subscriptions/[id]` | Anuluj subskrypcję |
| `GET` | `/api/stripe/payment-methods` | Wyświetl metody płatności użytkownika |
| `POST` | `/api/stripe/payment-methods` | Dodaj nową metodę płatności |
| `DELETE` | `/api/stripe/payment-methods/[id]` | Usuń metodę płatności |
| `POST` | `/api/stripe/setup-intents` | Utwórz Setup Intent do zbierania metod płatności |
| `GET` | `/api/stripe/payment-intents/[id]` | Pobierz Payment Intent |
| `POST` | `/api/stripe/payment-intents` | Utwórz Payment Intent |
| `GET` | `/api/stripe/products` | Wyświetl dostępne produkty Stripe |
| `GET` | `/api/stripe/products/[id]` | Pobierz szczegóły produktu |
| `POST` | `/api/stripe/billing-portal` | Utwórz sesję portalu rozliczeń |
| `POST` | `/api/stripe/webhook` | Przetwórz webhooks Stripe |
| `GET` | `/api/stripe/invoices` | Wyświetl faktury użytkownika |
| `GET` | `/api/stripe/invoices/[id]` | Pobierz szczegóły faktury |

### Bezpieczeństwo Webhook Stripe

Wszystkie webhooks Stripe są weryfikowane przy użyciu SDK Stripe:

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  request.headers.get('stripe-signature')!,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

---

## Punkty końcowe LemonSqueezy

Wszystkie trasy LemonSqueezy są zlokalizowane w `app/api/lemonsqueezy/`.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/lemonsqueezy/checkout` | Utwórz URL checkout LemonSqueezy |
| `GET` | `/api/lemonsqueezy/checkout` | Pobierz sesję checkout przez parametry zapytania |
| `GET` | `/api/lemonsqueezy/subscriptions` | Wyświetl subskrypcje użytkownika |
| `DELETE` | `/api/lemonsqueezy/subscriptions/[id]` | Anuluj subskrypcję |
| `PATCH` | `/api/lemonsqueezy/subscriptions/[id]` | Zaktualizuj/zmień plan subskrypcji |
| `GET` | `/api/lemonsqueezy/products` | Wyświetl dostępne produkty/warianty |
| `POST` | `/api/lemonsqueezy/webhook` | Przetwórz webhooks LemonSqueezy |

### Bezpieczeństwo Webhook LemonSqueezy

Wehooks są weryfikowane przy użyciu HMAC SHA-256 przez nagłówek `x-signature`.

---

## Punkty końcowe Polar

Wszystkie trasy Polar są zlokalizowane w `app/api/polar/`.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/polar/checkout` | Utwórz sesję checkout Polar |
| `GET` | `/api/polar/subscriptions` | Wyświetl subskrypcje użytkownika |
| `DELETE` | `/api/polar/subscriptions/[id]` | Anuluj subskrypcję |
| `GET` | `/api/polar/products` | Wyświetl produkty Polar |
| `POST` | `/api/polar/webhook` | Przetwórz webhooks Polar |

### Bezpieczeństwo Webhook Polar

Wehooks są weryfikowane przy użyciu SDK Polar z sekretu konfiguracji webhooka.

---

## Punkty końcowe Solidgate

Wszystkie trasy Solidgate są zlokalizowane w `app/api/solidgate/`.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/solidgate/checkout` | Utwórz sesję płatności Solidgate |
| `POST` | `/api/solidgate/webhook` | Przetwórz webhooks Solidgate |

---

## Ogólny Punkt końcowy Płatności

Centralny punkt końcowy `/api/payment` zapewnia ujednolicony interfejs dla wielodostawczych operacji płatności.

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `POST` | `/api/payment` | Zainicjuj płatność u aktywnego dostawcy |
| `GET` | `/api/payment` | Pobierz status płatności |
| `POST` | `/api/payment/webhook` | Ujednolicony odbiornik webhooków |

### Treść żądania (POST /api/payment)

```typescript
{
  planId: string;              // ID planu wewnętrznego
  billingCycle: "monthly" | "yearly";
  provider?: string;           // Opcjonalne nadpisanie dostawcy
}
```

---

## Bezpieczeństwo Webhooków

Każdy dostawca płatności używa własnego mechanizmu weryfikacji podpisu. **Nigdy nie polegaj na treści webhooka bez weryfikacji podpisu.**

| Dostawca | Nagłówek | Metoda weryfikacji |
|----------|---------|-------------------|
| Stripe | `stripe-signature` | `stripe.webhooks.constructEvent()` |
| LemonSqueezy | `x-signature` | HMAC SHA-256 |
| Polar | `webhook-id`, `webhook-signature` | SDK Polar |
| Solidgate | `x-solidgate-signature` | HMAC SHA-512 |

---

## Powiązana dokumentacja

- [Szczegółowe omówienie LemonSqueezy](./lemonsqueezy-deep-dive) -- Szczegółowe informacje o subskrypcjach i webhookach LemonSqueezy
