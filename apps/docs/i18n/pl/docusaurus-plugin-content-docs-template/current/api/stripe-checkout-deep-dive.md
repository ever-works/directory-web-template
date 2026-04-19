---
id: stripe-checkout-deep-dive
title: "Stripe Checkout – szczegółowe omówienie"
sidebar_label: "Stripe Checkout"
---

# Stripe Checkout – szczegółowe omówienie

Ta strona omawia kompletną implementację kasy Stripe, w tym parametry sesji, rozwiązywanie klientów, konfigurację subskrypcji i obsługę wielu walut.

## Tabela tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `POST` | `/api/stripe/checkout` | Wymagana sesja | Utwórz sesję kasy Stripe |
| `GET` | `/api/stripe/checkout` | Wymagana sesja | Pobierz dane sesji kasy |

## Interfejs CreateCheckoutRequest

Treść żądania kasy jest walidowana przez poniższy interfejs:

```typescript
interface CreateCheckoutRequest {
  priceId: string;           // Stripe price ID (price_xxx)
  mode: 'one_time' | 'subscription';
  successUrl?: string;       // Override default success URL
  cancelUrl?: string;        // Override default cancel URL
  metadata?: Record<string, string>;
  trialDays?: number;        // Trial period in days (subscriptions only)
  currency?: string;         // Currency override (e.g. 'eur')
  couponId?: string;         // Stripe coupon ID to apply
}
```

## Mapowanie trybów

| Tryb żądania | Tryb sesji Stripe |
|--------------|------------------|
| `one_time` | `payment` |
| `subscription` | `subscription` |

## Rozwiązywanie i tworzenie klientów

Implementacja realizuje trzyetapowy proces rozwiązywania klienta:

1. **Sprawdź istniejący rekord** — wyszukaj użytkownika w tabeli `stripeCustomers` przez ID użytkownika
2. **Utwórz nowego klienta Stripe** — jeśli nie istnieje, wywołaj `stripe.customers.create()` z e-mailem użytkownika
3. **Zapisz mapowanie** — wstaw rekord do tabeli `stripeCustomers` łącząc ID użytkownika z ID klienta Stripe

```typescript
async function resolveStripeCustomer(userId: string, userEmail: string): Promise<string> {
  const existing = await db.query.stripeCustomers.findFirst({
    where: eq(stripeCustomers.userId, userId)
  });
  if (existing) return existing.stripeCustomerId;

  const customer = await stripe.customers.create({ email: userEmail });
  await db.insert(stripeCustomers).values({
    userId,
    stripeCustomerId: customer.id
  });
  return customer.id;
}
```

## Konfiguracja okresu próbnego

Okresy próbne są nakładane dla trybów subskrypcji, gdy `trialDays > 0`:

```typescript
if (mode === 'subscription' && trialDays) {
  sessionParams.subscription_data = {
    trial_period_days: trialDays,
    metadata
  };
}
```

## Konfiguracja specyficzna dla subskrypcji

Metoda `applySubscriptionConfig` dodaje opcje specyficzne dla subskrypcji do parametrów sesji:

```typescript
function applySubscriptionConfig(
  params: Stripe.Checkout.SessionCreateParams,
  request: CreateCheckoutRequest
): Stripe.Checkout.SessionCreateParams {
  return {
    ...params,
    subscription_data: {
      trial_period_days: request.trialDays,
      metadata: request.metadata
    }
  };
}
```

## Propagacja metadanych

Metadane są propagowane do obiektu sesji i powiązanych obiektów subskrypcji/płatności:

```typescript
const sessionParams: Stripe.Checkout.SessionCreateParams = {
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  mode: stripeMode,
  payment_method_collection: 'always',
  metadata: {
    userId,
    priceId,
    ...metadata
  },
  // ...other params
};
```

## GET /api/stripe/checkout

Pobiera dane sesji kasy ze Stripe z rozszerzonymi obiektami pozycji i subskrypcji.

### Parametry zapytania

| Parametr | Typ | Wymagane | Opis |
|----------|-----|----------|------|
| `sessionId` | `string` | Tak | ID sesji kasy Stripe (cs_xxx) |

### Odpowiedź

Zwraca obiekt `Stripe.Checkout.Session` z rozszerzeniami `line_items` oraz `subscription`:

```typescript
const session = await stripe.checkout.sessions.retrieve(sessionId, {
  expand: ['line_items', 'subscription']
});
```

## Obsługa wielu walut

Konfiguracja waluty jest zarządzana przez obiekt `STRIPE_CONFIG`:

```typescript
const STRIPE_CONFIG = {
  defaultCurrency: process.env.STRIPE_DEFAULT_CURRENCY || 'usd',
  supportedCurrencies: ['usd', 'eur', 'gbp', 'cad', 'aud'],
};
```

Żądania z `currency` spoza obsługiwanej listy są anulowane z błędem `400`.

## Dynamiczne ceny

Dla konfiguracji cen dynamicznych (brak stałego `priceId`), sesja może być tworzona z parametrami pozycji zamiast `price_data`:

```typescript
line_items: [{
  price_data: {
    currency: currency || STRIPE_CONFIG.defaultCurrency,
    product: productId,
    unit_amount: amountInCents,
    recurring: mode === 'subscription' ? { interval: 'month' } : undefined
  },
  quantity: 1
}]
```

## Wymagania dotyczące konfiguracji

| Zmienna | Wymagane | Opis |
|---------|----------|------|
| `STRIPE_SECRET_KEY` | Tak | Tajny klucz API Stripe |
| `STRIPE_DEFAULT_CURRENCY` | Nie | Domyślna waluta (domyślnie: `usd`) |
| `NEXT_PUBLIC_APP_URL` | Tak | Podstawowy URL dla adresów przekierowania |

## Obsługa błędów

| Kod | Treść | Przyczyna |
|-----|-------|-----------|
| 400 | `Missing required fields` | Brak `priceId` lub `mode` |
| 400 | `Unsupported currency` | Waluta spoza obsługiwanej listy |
| 401 | `Unauthorized` | Brak uwierzytelnionej sesji |
| 404 | `Session not found` | Nieprawidłowy `sessionId` w GET |
| 500 | `Failed to create checkout session` | Błąd API Stripe |

## Kwestie bezpieczeństwa

- `successUrl` i `cancelUrl` są weryfikowane jako prawidłowe, bezpieczne URL-e
- Metadane są odkażone, aby zapobiec wstrzyknięciu danych
- ID sesji jest walidowane przed pobraniem
- Klucz API Stripe jest przechowywany wyłącznie po stronie serwera
