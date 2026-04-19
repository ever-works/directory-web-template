---
id: stripe-payment-methods-deep-dive
title: "Metody płatności Stripe – szczegółowe omówienie"
sidebar_label: "Metody płatności Stripe"
---

# Metody płatności Stripe – szczegółowe omówienie

Ta strona omawia implementację zarządzania metodami płatności Stripe, w tym listowanie zapisanych kart, tworzenie intencji konfiguracji i obsługę domyślnych metod płatności.

## Tabela tras

| Metoda | Ścieżka | Uwierzytelnianie | Opis |
|--------|---------|-----------------|------|
| `GET` | `/api/stripe/payment-methods` | Wymagana sesja | Listuj zapisane metody płatności |
| `POST` | `/api/stripe/payment-methods/setup-intent` | Wymagana sesja | Utwórz intencję konfiguracji do dodania nowej karty |

## GET /api/stripe/payment-methods

Pobiera wszystkie zapisane metody płatności dla zalogowanego użytkownika.

### Jak to działa

1. Uwierzytelnia użytkownika i pobiera ID klienta Stripe przez `resolveStripeCustomer`
2. Listuje metody płatności typu `card` dla klienta: `stripe.paymentMethods.list({ customer, type: 'card' })`
3. Formatuje każdą metodę płatności ze statusem domyślnym
4. Sortuje wyniki – metoda domyślna jest zawsze pierwsza

### Interfejsy odpowiedzi

```typescript
interface PaymentMethodListResponse {
  paymentMethods: PaymentMethodItem[];
  defaultPaymentMethodId: string | null;
}

interface PaymentMethodItem {
  id: string;                // pm_xxx
  brand: string;             // "visa", "mastercard", etc.
  last4: string;             // Last 4 digits
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}
```

### Przykładowa odpowiedź – z metodami płatności (200)

```json
{
  "data": {
    "paymentMethods": [
      {
        "id": "pm_1234567890abcdef",
        "brand": "visa",
        "last4": "4242",
        "expMonth": 12,
        "expYear": 2025,
        "isDefault": true
      },
      {
        "id": "pm_abcdef1234567890",
        "brand": "mastercard",
        "last4": "5555",
        "expMonth": 8,
        "expYear": 2026,
        "isDefault": false
      }
    ],
    "defaultPaymentMethodId": "pm_1234567890abcdef"
  }
}
```

### Przykładowa odpowiedź – bez metod płatności (200)

```json
{
  "data": {
    "paymentMethods": [],
    "defaultPaymentMethodId": null
  }
}
```

### Sortowanie metod płatności

Metody płatności są sortowane, aby domyślna karta pojawiała się pierwsza:

```typescript
const sortedMethods = formattedMethods.sort((a, b) => {
  if (a.isDefault) return -1;
  if (b.isDefault) return 1;
  return 0;
});
```

## POST /api/stripe/payment-methods/setup-intent

Tworzy intencję konfiguracji Stripe do dodania nowej metody płatności bez natychmiastowego obciążenia.

### Jak to działa

Metoda `createSetupIntent()` dostawcy:
1. Rozwiązuje ID klienta Stripe przez `resolveStripeCustomer`
2. Wywołuje `stripe.setupIntents.create()` z ID klienta
3. Zwraca client secret do inicjalizacji komponentu Stripe Elements na frontendzie

### Interfejs odpowiedzi

```typescript
interface SetupIntentResponse {
  clientSecret: string;      // Client secret for Stripe Elements
  customerId: string;        // Stripe customer ID
}
```

### Przykładowa odpowiedź (200)

```json
{
  "data": {
    "clientSecret": "seti_1234567890abcdef_secret_xyz",
    "customerId": "cus_1234567890abcdef"
  }
}
```

### Użycie na frontendzie

Client secret jest przekazywany do komponentu Stripe Elements:

```typescript
const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
  payment_method: {
    card: elements.getElement(CardElement)!,
    billing_details: { name: 'Jan Kowalski' }
  }
});

if (!error && setupIntent.status === 'succeeded') {
  // New payment method added, refresh payment methods list
  await refreshPaymentMethods();
}
```

## Obsługa błędów

| Kod | Treść | Przyczyna |
|-----|-------|-----------|
| 401 | `Unauthorized` | Brak uwierzytelnionej sesji |
| 400 | `Failed to create customer` | Błąd rozwiązywania klienta |
| 500 | `Failed to list payment methods` | Błąd API Stripe |
| 500 | `Failed to create setup intent` | Błąd tworzenia intencji konfiguracji |
