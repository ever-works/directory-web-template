---
id: user-payment-endpoints
title: "Płatności użytkownika – dokumentacja API"
sidebar_label: "Płatności użytkownika"
---

# Płatności użytkownika – dokumentacja API

## Przegląd

Punkty końcowe płatności użytkownika udostępniają dane dotyczące walut, historii płatności, statusu planu i subskrypcji dla zalogowanego użytkownika.

## GET /api/user/currency

Pobierz bieżące ustawienie waluty użytkownika.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `GET` |
| Ścieżka | `/api/user/currency` |
| Uwierzytelnianie | Wymagana sesja |

### Typy TypeScript

```typescript
interface UserCurrencyResponse {
  currency: string;           // ISO 4217 currency code
  source: 'user_preference' | 'geo_detection' | 'default';
}
```

### Przykładowe odpowiedzi

```json
// Response when user has set a preference
{
  "data": {
    "currency": "EUR",
    "source": "user_preference"
  }
}

// Response when currency detected from location
{
  "data": {
    "currency": "GBP",
    "source": "geo_detection"
  }
}
```

## PUT /api/user/currency

Zaktualizuj preferencję waluty użytkownika.

### Szczegóły żądania

| Pole | Wartość |
|------|---------|
| Metoda | `PUT` |
| Ścieżka | `/api/user/currency` |
| Uwierzytelnianie | Wymagana sesja |

### Treść żądania

```typescript
interface UpdateCurrencyRequest {
  currency: string;  // ISO 4217 currency code (e.g., "EUR", "GBP", "USD")
}
```

## GET /api/user/payments

Pobierz historię płatności zalogowanego użytkownika.

### Typy TypeScript

```typescript
interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  provider: 'stripe' | 'lemonsqueezy' | 'polar' | 'solidgate';
  providerPaymentId: string;
  description: string;
  metadata: Record<string, string>;
  createdAt: string;
  refundedAt: string | null;
}

interface PaymentsResponse {
  data: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Przykładowa odpowiedź (200)

```json
{
  "data": [
    {
      "id": "pay_abc123",
      "amount": 49.99,
      "currency": "USD",
      "status": "succeeded",
      "provider": "stripe",
      "providerPaymentId": "pi_1234567890",
      "description": "Subskrypcja Pro – luty 2024",
      "metadata": { "planId": "pro" },
      "createdAt": "2024-02-01T00:00:00Z",
      "refundedAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "totalPages": 1
  }
}
```

## GET /api/user/plan-status

Pobierz aktualny status planu z pełnymi szczegółami wygaśnięcia.

### Typy TypeScript

```typescript
interface PlanStatusResponse {
  plan: string;                     // Plan identifier
  status: 'active' | 'expired' | 'cancelled' | 'trialing' | 'none';
  expiresAt: string | null;         // ISO 8601 timestamp
  isInWarningPeriod: boolean;       // True within 7 days of expiry
  canAccessPlanFeatures: boolean;   // Whether features are accessible
  daysUntilExpiry: number | null;
  features: PlanFeatures;
}

interface PlanFeatures {
  maxListings: number;
  analyticsAccess: boolean;
  prioritySupport: boolean;
  [key: string]: unknown;
}
```

## GET /api/user/subscription

Pobierz aktualną subskrypcję i historię subskrypcji.

### Typy TypeScript

```typescript
interface SubscriptionResponse {
  hasActiveSubscription: boolean;
  currentSubscription: CurrentSubscription | null;
  subscriptionHistory: HistoricalSubscription[];
}

interface CurrentSubscription {
  id: string;
  plan: string;
  status: 'active' | 'trialing' | 'past_due' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  provider: string;
  priceId: string;
}

interface HistoricalSubscription {
  id: string;
  plan: string;
  status: 'canceled' | 'expired' | 'unpaid';
  startDate: string;
  endDate: string;
  provider: string;
}
```

### Przykładowa odpowiedź (200)

```json
{
  "data": {
    "hasActiveSubscription": true,
    "currentSubscription": {
      "id": "sub_abc123",
      "plan": "pro",
      "status": "active",
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false,
      "trialEnd": null,
      "provider": "stripe",
      "priceId": "price_abc123"
    },
    "subscriptionHistory": []
  }
}
```

## Obsługa błędów

| Kod | Opis |
|-----|------|
| 401 | Brak uwierzytelnionej sesji |
| 400 | Nieprawidłowy kod waluty w PUT /currency |
| 500 | Błąd wewnętrzny przy pobieraniu danych |
