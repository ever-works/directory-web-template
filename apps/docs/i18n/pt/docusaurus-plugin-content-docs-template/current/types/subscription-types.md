---
id: subscription-types
title: Definições de tipo de assinatura
sidebar_label: Tipos de assinatura
sidebar_position: 12
---

# Definições de tipo de assinatura

**Fonte:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Os tipos de assinatura modelam o ciclo de vida completo do faturamento recorrente, desde a criação da avaliação até o cancelamento e a renovação.

## Enums

### `SubscriptionStatus` (nível de provedor)

Valores de status retornados pelo SDK do provedor de pagamento.

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

|Valor|Descrição|
|-------|-------------|
|`incomplete`|O pagamento inicial ainda está pendente|
|`trialing`|O cliente está dentro do período de teste|
|`active`|A assinatura está ativa e paga|
|`past_due`|O pagamento falhou, mas a assinatura ainda não foi cancelada|
|`canceled`|A assinatura foi cancelada|
|`unpaid`|Múltiplas falhas de pagamento; assinatura está suspensa|

### `SubscriptionStatus` (nível de banco de dados)

Valores de status armazenados na tabela `subscriptions`.

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

Difere como uma assinatura foi iniciada.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfaces

### `SubscriptionInfo`

Dados de assinatura normalizados retornados de qualquer provedor.

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

|Campo|Descrição|
|-------|-------------|
|`id`|Identificador de assinatura do provedor|
|`customerId`|Identificador do cliente fornecedor|
|`currentPeriodEnd`|Carimbo de data e hora Unix quando o período de faturamento atual termina|
|`cancelAtPeriodEnd`|Se `true`, a assinatura será cancelada no final do período em vez de imediatamente|
|`trialEnd`|Carimbo de data/hora Unix quando a avaliação expira|

### `CreateSubscriptionParams`

Parâmetros para criar uma nova assinatura.

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

Parâmetros para modificar uma assinatura existente.

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

Informações de preços formatadas para exibição.

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

Preços localizados para um país específico.

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

## Esquema de banco de dados

A tabela `subscriptions` armazena o registro da assinatura:

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

## Exemplo de uso

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

## Tipos Relacionados

- [Tipos de pagamento](./payment-types.md) – intenções de pagamento, parâmetros de checkout
- [Tipos de autenticação](./auth-types.md) – tipos de usuários e sessões vinculados a assinaturas
