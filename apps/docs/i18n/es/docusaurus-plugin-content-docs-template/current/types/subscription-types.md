---
id: subscription-types
title: Definiciones de tipos de suscripción
sidebar_label: Tipos de suscripción
sidebar_position: 12
---

# Definiciones de tipos de suscripción

**Fuente:** `lib/payment/types/payment-types.ts`, `lib/db/schema.ts`

Los tipos de suscripción modelan el ciclo de vida completo de la facturación recurrente, desde la creación de la prueba hasta la cancelación y la renovación.

## Enumeraciones

### `SubscriptionStatus` (nivel de proveedor)

Valores de estado devueltos por el SDK del proveedor de pagos.

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

|Valor|Descripción|
|-------|-------------|
|`incomplete`|El pago inicial aún está pendiente|
|`trialing`|El cliente está dentro de su período de prueba.|
|`active`|La suscripción está activa y paga.|
|`past_due`|El pago falló pero la suscripción aún no está cancelada|
|`canceled`|La suscripción ha sido cancelada.|
|`unpaid`|Múltiples fallos de pago; la suscripción está suspendida|

### `SubscriptionStatus` (nivel de base de datos)

Valores de estado almacenados en la tabla `subscriptions`.

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

Diferencia cómo se inició una suscripción.

```typescript
enum SubscriptionPlanType {
  TRIAL = 'trial',       // 7-day trial converting to recurring
  RECURRING = 'recurring', // Direct recurring (1-month)
}
```

## Interfaces

### `SubscriptionInfo`

Datos de suscripción normalizados devueltos por cualquier proveedor.

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

|campo|Descripción|
|-------|-------------|
|`id`|Identificador de suscripción del proveedor|
|`customerId`|Identificador de cliente del proveedor|
|`currentPeriodEnd`|Marca de tiempo de Unix cuando finaliza el período de facturación actual|
|`cancelAtPeriodEnd`|Si `true`, la suscripción se cancela al final del período en lugar de inmediatamente|
|`trialEnd`|Marca de tiempo de Unix cuando expira la versión de prueba|

### `CreateSubscriptionParams`

Parámetros para crear una nueva suscripción.

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

Parámetros para modificar una suscripción existente.

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

Información de precios formateada para su visualización.

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

Precios localizados para un país específico.

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

## Esquema de base de datos

La tabla `subscriptions` almacena el registro de suscripción:

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

## Ejemplo de uso

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

## Tipos relacionados

- [Tipos de pago](./paid-types.md) -- intenciones de pago, parámetros de pago
- [Tipos de autenticación](./auth-types.md): tipos de usuarios y sesiones vinculados a suscripciones
