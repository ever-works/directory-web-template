---
id: subscription-types
title: Definities van abonnementstypen
sidebar_label: Abonnementstypen
sidebar_position: 12
---

# Definities van abonnementstypen

**Bron:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Abonnementstypen modelleren de volledige levenscyclus van terugkerende facturering: van het aanmaken van een proefabonnement tot het opzeggen en verlengen.

## Enums

### `SubscriptionStatus` (Provider-niveau)

Statuswaarden geretourneerd door de SDK van de betalingsprovider.

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

|Waarde|Beschrijving|
|-------|-------------|
|`incomplete`|De eerste betaling laat nog op zich wachten|
|`trialing`|De klant bevindt zich binnen de proefperiode|
|`active`|Abonnement is actief en betaald|
|`past_due`|De betaling is mislukt, maar het abonnement is nog niet opgezegd|
|`canceled`|Abonnement is opgezegd|
|`unpaid`|Meerdere betalingsfouten; abonnement is opgeschort|

### `SubscriptionStatus` (databaseniveau)

Statuswaarden opgeslagen in de `subscriptions` tabel.

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

Maakt onderscheid hoe een abonnement is gestart.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfaces

### `SubscriptionInfo`

Genormaliseerde abonnementsgegevens die door elke provider worden geretourneerd.

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

|Veld|Beschrijving|
|-------|-------------|
|`id`|Identificatie van het abonnement van de provider|
|`customerId`|Klant-ID van de aanbieder|
|`currentPeriodEnd`|Unix-tijdstempel wanneer de huidige factureringsperiode eindigt|
|`cancelAtPeriodEnd`|Indien `true`, wordt het abonnement opgezegd aan het einde van de periode in plaats van onmiddellijk|
|`trialEnd`|Unix-tijdstempel wanneer de proefperiode afloopt|

### `CreateSubscriptionParams`

Parameters voor het maken van een nieuw abonnement.

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

Parameters voor het wijzigen van een bestaand abonnement.

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

Opgemaakte prijsinformatie voor weergave.

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

Gelokaliseerde prijzen voor een specifiek land.

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

## Databaseschema

In de tabel `subscriptions` wordt het abonnementsrecord opgeslagen:

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

## Gebruiksvoorbeeld

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

## Gerelateerde typen

- [Betalingstypen](./betalingstypes.md) -- betalingsintenties, afrekenparameters
- [Auth Types](./auth-types.md) -- gebruikers- en sessietypen gekoppeld aan abonnementen
