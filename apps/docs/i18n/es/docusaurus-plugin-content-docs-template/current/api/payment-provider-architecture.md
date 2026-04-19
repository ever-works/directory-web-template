---
id: payment-provider-architecture
title: "Arquitectura de Proveedores de Pago"
sidebar_label: "Arquitectura de Proveedores"
sidebar_position: 8
---

# Arquitectura de Proveedores de Pago

El sistema de pagos usa el **Patrón de Estrategia** para admitir múltiples proveedores de pago (Stripe, LemonSqueezy, Polar, Solidgate) con una interfaz unificada. Cambiar de proveedor requiere únicamente cambiar la variable de entorno `PAYMENT_PROVIDER`.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────┐
│              Rutas API / Componentes         │
└───────────────────┬─────────────────────────┘
                    │ usa
                    ▼
┌─────────────────────────────────────────────┐
│           PaymentService (singleton)         │
│   - getProvider()                            │
│   - createCheckoutSession()                  │
│   - getSubscription()                        │
│   - cancelSubscription()                     │
│   - handleWebhook()                          │
└───────────────────┬─────────────────────────┘
                    │ delega a
                    ▼
┌─────────────────────────────────────────────┐
│        PaymentProviderInterface              │
│  (contrato abstracto para todos los          │
│        proveedores)                          │
└──┬──────────┬───────────┬───────────┬───────┘
   │          │           │           │
   ▼          ▼           ▼           ▼
Stripe  LemonSqueezy   Polar    Solidgate
```

## `PaymentProviderInterface`

Todos los proveedores de pago implementan esta interfaz común:

```typescript
interface PaymentProviderInterface {
  // Checkout
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  getCheckoutSession(sessionId: string): Promise<CheckoutSession>;

  // Suscripciones
  getSubscription(subscriptionId: string): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  reactivateSubscription(subscriptionId: string): Promise<void>;
  updateSubscription(subscriptionId: string, newPriceId: string): Promise<SubscriptionInfo>;

  // Webhooks
  handleWebhook(request: Request): Promise<WebhookResult>;

  // Gestión de Clientes
  getCustomer(customerId: string): Promise<CustomerInfo | null>;
  createCustomer(email: string, metadata?: Record<string, string>): Promise<string>;
}
```

**Fuente:** `template/lib/payment/provider.interface.ts`

## Fábrica de Proveedores

La función de fábrica instancia el proveedor correcto según la variable de entorno `PAYMENT_PROVIDER`:

```typescript
function createPaymentProvider(): PaymentProviderInterface {
  const provider = process.env.PAYMENT_PROVIDER;

  switch (provider) {
    case 'stripe':
      return new StripeProvider();
    case 'lemonsqueezy':
      return new LemonSqueezyProvider();
    case 'polar':
      return new PolarProvider();
    case 'solidgate':
      return new SolidgateProvider();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
```

**Fuente:** `template/lib/payment/factory.ts`

## Patrón Singleton del Servicio

`PaymentService` usa un patrón singleton para evitar reinstanciar el proveedor en cada solicitud:

```typescript
class PaymentService {
  private static instance: PaymentService;
  private provider: PaymentProviderInterface;

  private constructor() {
    this.provider = createPaymentProvider();
  }

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // Métodos del servicio delegados al proveedor...
}

// Exportación para uso en rutas API
export const paymentService = PaymentService.getInstance();
```

**Fuente:** `template/lib/payment/service.ts`

## Definiciones de Tipos

### `CheckoutParams`

```typescript
type CheckoutParams = {
  userId: string;
  email: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};
```

### `CheckoutSession`

```typescript
type CheckoutSession = {
  sessionId: string;
  checkoutUrl: string;
  status: 'pending' | 'complete' | 'expired';
  customerId?: string;
};
```

### `SubscriptionInfo`

```typescript
type SubscriptionInfo = {
  subscriptionId: string;
  customerId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
};
```

### `SubscriptionStatus`

```typescript
type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'paused'
  | 'trialing'
  | 'unpaid'
  | 'incomplete';
```

### `WebhookResult`

```typescript
type WebhookResult = {
  received: boolean;
  eventType: WebhookEventType;
  userId?: string;
  subscriptionId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
};
```

### `WebhookEventType`

```typescript
type WebhookEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.reactivated'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'checkout.completed'
  | 'unknown';
```

**Fuente:** `template/lib/payment/types.ts`

## Cómo Cambiar de Proveedor

Para cambiar el proveedor de pago activo:

1. **Actualizar `.env.local`:**
   ```bash
   PAYMENT_PROVIDER=polar  # antes: stripe
   ```

2. **Agregar variables de entorno del nuevo proveedor** (ver [Endpoints de Pagos](./payment-endpoints) para todas las variables).

3. **Reiniciar el servidor de desarrollo:**
   ```bash
   pnpm dev
   ```

No se necesitan cambios de código en las rutas API o la capa de servicio. La fábrica instancia el proveedor correcto automáticamente.

## Agregar un Nuevo Proveedor

Para agregar soporte para un nuevo proveedor de pago:

1. Crear `template/lib/payment/providers/mi-proveedor.ts`
2. Implementar todos los métodos de `PaymentProviderInterface`
3. Agregar el caso a `createPaymentProvider()` en `factory.ts`
4. Agregar el nuevo valor a la validación del esquema `PAYMENT_PROVIDER` en `env-config.ts`
5. Documentar las variables de entorno requeridas

## Archivos Fuente

| Archivo | Propósito |
|---------|-----------|
| `template/lib/payment/provider.interface.ts` | Definición de la interfaz del proveedor |
| `template/lib/payment/types.ts` | Definiciones de tipos compartidas |
| `template/lib/payment/factory.ts` | Instanciación del proveedor según entorno |
| `template/lib/payment/service.ts` | Capa de servicio singleton |
| `template/lib/payment/providers/stripe.ts` | Implementación de Stripe |
| `template/lib/payment/providers/lemonsqueezy.ts` | Implementación de LemonSqueezy |
| `template/lib/payment/providers/polar.ts` | Implementación de Polar |
| `template/lib/payment/providers/solidgate.ts` | Implementación de Solidgate |
