---
id: subscription-types
title: Definizioni del tipo di abbonamento
sidebar_label: Tipi di abbonamento
sidebar_position: 12
---

# Definizioni del tipo di abbonamento

**Fonte:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

I tipi di abbonamento modellano l'intero ciclo di vita della fatturazione ricorrente, dalla creazione della prova fino all'annullamento e al rinnovo.

## Enumerazioni

### `SubscriptionStatus` (a livello di fornitore)

Valori di stato restituiti dall'SDK del fornitore di pagamenti.

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

|Valore|Descrizione|
|-------|-------------|
|`incomplete`|Il pagamento iniziale è ancora in sospeso|
|`trialing`|Il cliente è nel periodo di prova|
|`active`|L'abbonamento è attivo e pagato|
|`past_due`|Il pagamento non è riuscito ma l'abbonamento non è stato ancora annullato|
|`canceled`|L'abbonamento è stato annullato|
|`unpaid`|Diversi pagamenti falliti; l'abbonamento è sospeso|

### `SubscriptionStatus` (a livello di database)

Valori di stato memorizzati nella tabella `subscriptions`.

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

Differenzia il modo in cui è stato avviato un abbonamento.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfacce

### `SubscriptionInfo`

Dati di abbonamento normalizzati restituiti da qualsiasi provider.

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

|Campo|Descrizione|
|-------|-------------|
|`id`|Identificatore dell'abbonamento del fornitore|
|`customerId`|Identificativo del cliente fornitore|
|`currentPeriodEnd`|Timestamp Unix al termine del periodo di fatturazione corrente|
|`cancelAtPeriodEnd`|Se `true`, l'abbonamento verrà annullato alla fine del periodo anziché immediatamente|
|`trialEnd`|Timestamp Unix alla scadenza del periodo di prova|

### `CreateSubscriptionParams`

Parametri per la creazione di un nuovo abbonamento.

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

Parametri per modificare un abbonamento esistente.

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

Informazioni sui prezzi formattate per la visualizzazione.

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

Prezzi localizzati per un paese specifico.

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

## Schema della banca dati

La tabella `subscriptions` memorizza il record di abbonamento:

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

## Esempio di utilizzo

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

## Tipi correlati

- [Tipi di pagamento](./payment-types.md) - intenti di pagamento, parametri di pagamento
- [Tipi di autenticazione](./auth-types.md): tipi di utenti e sessioni collegati agli abbonamenti
