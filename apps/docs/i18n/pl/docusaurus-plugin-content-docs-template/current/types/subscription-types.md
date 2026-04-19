---
id: subscription-types
title: Definicje typów subskrypcji
sidebar_label: Typy subskrypcji
sidebar_position: 12
---

# Definicje typów subskrypcji

**Źródło:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Typy subskrypcji modelują pełny cykl życia rozliczeń cyklicznych — od utworzenia wersji próbnej po anulowanie i odnowienie.

## Wyliczenia

### `SubscriptionStatus` (na poziomie dostawcy)

Wartości stanu zwrócone przez zestaw SDK dostawcy płatności.

```typescript
enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}
```

|Wartość|Opis|
|-------|-------------|
|`incomplete`|Płatność początkowa nadal oczekuje na realizację|
|`trialing`|Klient jest w trakcie okresu próbnego|
|`active`|Subskrypcja jest aktywna i płatna|
|`past_due`|Płatność nie powiodła się, ale subskrypcja nie została jeszcze anulowana|
|`canceled`|Subskrypcja została anulowana|
|`unpaid`|Wiele niepowodzeń płatności; subskrypcja jest zawieszona|

### `SubscriptionStatus` (poziom bazy danych)

Wartości statusu zapisane w tabeli `subscriptions`.

```typescript
const SubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  PENDING: 'pending',
  PAUSED: 'paused',
} as const;

type SubscriptionStatusValues =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
```

### `SubscriptionPlanType`

Różni się sposobem rozpoczęcia subskrypcji.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfejsy

### `SubscriptionInfo`

Znormalizowane dane subskrypcji zwrócone od dowolnego dostawcy.

```typescript
interface SubscriptionInfo {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodEnd?: number | null;  // Unix timestamp
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  trialEnd?: number | null;
  priceId: string;
  paymentIntentId?: string;
  checkoutData?: Record<string, any>;
}
```

|Pole|Opis|
|-------|-------------|
|`id`|Identyfikator subskrypcji dostawcy|
|`customerId`|Identyfikator klienta dostawcy|
|`currentPeriodEnd`|Znacznik czasu Unix, kiedy kończy się bieżący okres rozliczeniowy|
|`cancelAtPeriodEnd`|Jeśli `true`, subskrypcja zostanie anulowana na koniec okresu, a nie natychmiast|
|`trialEnd`|Znacznik czasu Unixa wygaśnięcia wersji próbnej|

### `CreateSubscriptionParams`

Parametry tworzenia nowej subskrypcji.

```typescript
interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}
```

### `UpdateSubscriptionParams`

Parametry modyfikacji istniejącej subskrypcji.

```typescript
interface UpdateSubscriptionParams {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  metadata?: Record<string, any>;
}
```

### `PriceDetails`

Sformatowane informacje o cenach do wyświetlenia.

```typescript
interface PriceDetails {
  amount: number;      // Amount in cents
  formatted: string;   // e.g., "$9.99/mo"
}

interface SubscriptionDetails extends OneTimeDetails {
  weekly?: PriceDetails;
}

interface OneTimeDetails extends PriceDetails {
  collect_tax: boolean;
}
```

### `CountryPricing`

Zlokalizowane ceny dla konkretnego kraju.

```typescript
interface CountryPricing {
  country: string;
  currency: string;
  symbol: string;
  subscription: SubscriptionDetails;
  oneTime: OneTimeDetails;
  free: OneTimeDetails;
}
```

## Schemat bazy danych

Tabela `subscriptions` przechowuje rekord subskrypcji:

```typescript
// Key columns from lib/db/schema.ts
{
  id: text,
  userId: text,                // FK -> users.id
  planId: text,                // 'free' | 'standard' | 'premium'
  status: text,                // 'active' | 'cancelled' | 'expired' | 'pending' | 'paused'
  startDate: timestamp,
  endDate: timestamp,
  paymentProvider: text,       // 'stripe' | 'lemonsqueezy' | 'polar'
  subscriptionId: text,        // Provider subscription ID
  customerId: text,            // Provider customer ID
  autoRenewal: boolean,
  cancelAtPeriodEnd: boolean,
  trialStart: timestamp,
  trialEnd: timestamp,
}
```

## Przykład użycia

```typescript
import type {
  CreateSubscriptionParams,
  SubscriptionInfo,
} from '@/lib/payment/types/payment-types';

const params: CreateSubscriptionParams = {
  customerId: 'cus_abc123',
  priceId: 'price_monthly_premium',
  trialPeriodDays: 7,
};

// After creation
const sub: SubscriptionInfo = await provider.createSubscription(params);
console.log(sub.status); // 'trialing'
```

## Powiązane typy

- [Typy płatności](./payment-types.md) -- zamiary płatności, parametry realizacji transakcji
- [Typy uwierzytelniania](./auth-types.md) — typy użytkowników i sesji powiązane z subskrypcjami
