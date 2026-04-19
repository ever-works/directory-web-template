---
id: subscription-types
title: Abonnementtypdefinitionen
sidebar_label: Abonnementtypen
sidebar_position: 12
---

# Abonnementtypdefinitionen

**Quelle:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Abonnementtypen bilden den gesamten Lebenszyklus wiederkehrender Abrechnungen ab – von der Erstellung der Testversion bis hin zur Kündigung und Verlängerung.

## Aufzählungen

### `SubscriptionStatus` (Anbieterebene)

Vom Zahlungsanbieter-SDK zurückgegebene Statuswerte.

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

|Wert|Beschreibung|
|-------|-------------|
|`incomplete`|Die erste Zahlung steht noch aus|
|`trialing`|Der Kunde befindet sich im Testzeitraum|
|`active`|Das Abonnement ist aktiv und kostenpflichtig|
|`past_due`|Die Zahlung ist fehlgeschlagen, aber das Abonnement ist noch nicht gekündigt|
|`canceled`|Das Abonnement wurde gekündigt|
|`unpaid`|Mehrere Zahlungsausfälle; Das Abonnement ist ausgesetzt|

### `SubscriptionStatus` (Datenbankebene)

In der Tabelle `subscriptions` gespeicherte Statuswerte.

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

Unterscheidet, wie ein Abonnement gestartet wurde.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Schnittstellen

### `SubscriptionInfo`

Normalisierte Abonnementdaten, die von einem beliebigen Anbieter zurückgegeben werden.

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

|Feld|Beschreibung|
|-------|-------------|
|`id`|Abonnement-ID des Anbieters|
|`customerId`|Kundenkennung des Anbieters|
|`currentPeriodEnd`|Unix-Zeitstempel, wann der aktuelle Abrechnungszeitraum endet|
|`cancelAtPeriodEnd`|Wenn `true`, wird das Abonnement zum Ende des Zeitraums und nicht sofort gekündigt|
|`trialEnd`|Unix-Zeitstempel, wann die Testversion abläuft|

### `CreateSubscriptionParams`

Parameter zum Erstellen eines neuen Abonnements.

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

Parameter zum Ändern eines bestehenden Abonnements.

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

Formatierte Preisinformationen zur Anzeige.

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

Lokalisierte Preise für ein bestimmtes Land.

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

## Datenbankschema

In der Tabelle `subscriptions` wird der Abonnementdatensatz gespeichert:

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

## Anwendungsbeispiel

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

## Verwandte Typen

- [Zahlungsarten](./zahlungsarten.md) – Zahlungsabsichten, Checkout-Parameter
- [Auth-Typen](./auth-types.md) – Benutzer- und Sitzungstypen, die mit Abonnements verknüpft sind
