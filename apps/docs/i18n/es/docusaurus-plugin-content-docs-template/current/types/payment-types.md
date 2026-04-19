---
id: payment-types
title: Definiciones de tipos de pago
sidebar_label: Tipos de pago
sidebar_position: 11
---

# Definiciones de tipos de pago

**Fuente:** `lib/payment/types/payment-types.ts`, `lib/constants/payment.ts`

Los tipos de pago impulsan el sistema de facturación de múltiples proveedores. Definen cómo se crean, verifican y gestionan los pagos en Stripe, LemonSqueezy, Polar y Solidgate.

## Enumeraciones

### `PaymentPlan`

Niveles de suscripción disponibles.

```typescript
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### `PaymentInterval`

Opciones de ciclo de facturación para cargos recurrentes.

```typescript
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### `PaymentType`

Clasifica un pago como único, recurrente o gratuito.

```typescript
enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}
```

### `PaymentStatus`

Realiza un seguimiento del ciclo de vida de un único intento de pago.

```typescript
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### `PaymentMethod`

Instrumentos de pago admitidos.

```typescript
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### `PaymentCurrency`

Monedas aceptadas por la plataforma.

```typescript
enum PaymentCurrency {
  USD = 'USD', EUR = 'EUR', GBP = 'GBP',
  CAD = 'CAD', AUD = 'AUD', ETH = 'ETH',
}
```

### `SupportedProvider`

Tipo de unión de todos los identificadores de proveedores de pagos.

```typescript
type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Interfaces

### `PaymentIntent`

Representa un pago pendiente o completado.

```typescript
interface PaymentIntent {
  id: string;
  amount: number;         // Amount in smallest currency unit (cents)
  currency: string;
  status: string;
  clientSecret?: string;  // For client-side confirmation
  customerId?: string;
}
```

|campo|Descripción|
|-------|-------------|
|`id`|Identificador de pago asignado por el proveedor|
|`amount`|Cantidad en centavos (por ejemplo, 1000 = $10,00)|
|`currency`|Código de moneda ISO 4217|
|`clientSecret`|El token se pasa al SDK de interfaz para su confirmación|

### `CheckoutParams`

Parámetros para iniciar una sesión de pago.

```typescript
interface CheckoutParams {
  priceId?: string;
  variantId?: number;
  quantity?: number;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  email?: string;
  customPrice?: number;
  metadata?: Record<string, any>;
  dark?: boolean;
}
```

### `BillingDetails`

Información de facturación del cliente adjunta a un pago.

```typescript
interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}
```

### `PaymentProviderConfig`

Credenciales necesarias para inicializar un proveedor.

```typescript
interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

### `ClientConfig`

Configuración segura de frontend devuelta por `getClientConfig()`.

```typescript
interface ClientConfig {
  publicKey: string;
  paymentGateway: SupportedProvider;
  options?: Record<string, any>;
}
```

## Ejemplo de uso

```typescript
import { PaymentPlan, PaymentType } from '@/lib/constants/payment';
import type { CheckoutParams } from '@/lib/payment/types/payment-types';

const params: CheckoutParams = {
  priceId: 'price_abc123',
  successUrl: '/checkout/success',
  cancelUrl: '/pricing',
  metadata: { plan: PaymentPlan.PREMIUM },
};
```

## Tipos relacionados

- [Tipos de suscripción](./subscription-types.md) -- ciclo de vida y estado de la suscripción
- [Configuración/Pago](../configuration/paid-config.md) -- configuración del proveedor y niveles de precios
- [Tipos de configuración](./config-types.md) -- `PaymentConfig` esquema
