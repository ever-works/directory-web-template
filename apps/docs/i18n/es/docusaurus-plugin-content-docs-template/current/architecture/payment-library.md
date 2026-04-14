---
id: payment-library
title: "Biblioteca de pagos"
sidebar_label: "Biblioteca de pagos"
sidebar_position: 17
---

# Biblioteca de pagos

La plantilla implementa un sistema de pago de múltiples proveedores utilizando los patrones Factory y Strategy. Admite Stripe, LemonSqueezy, Solidgate y Polar como proveedores de pagos, con una interfaz unificada para pagos, suscripciones, webhooks y reembolsos.

## Descripción general de la arquitectura

```mermaid
graph TD
    A[Application Code] --> B[PaymentService]
    B --> C[PaymentProviderFactory]
    C --> D{Provider Type}
    D -->|stripe| E[StripeProvider]
    D -->|lemonsqueezy| F[LemonSqueezyProvider]
    D -->|solidgate| G[SolidgateProvider]
    D -->|polar| H[PolarProvider]
    B --> I[PaymentServiceManager]
    I --> B
    E --> J[PaymentProviderInterface]
    F --> J
    G --> J
    H --> J
```

## Archivos fuente

|Archivo|Propósito|
|------|---------|
|`lib/payment/index.ts`|Exportaciones de API públicas|
|`lib/payment/lib/payment-provider-factory.ts`|Fábrica para crear instancias de proveedores.|
|`lib/payment/lib/payment-service.ts`|Fachada de servicio unificada|
|`lib/payment/lib/payment-service-manager.ts`|Administrador Singleton para el ciclo de vida del servicio.|
|`lib/payment/types/payment-types.ts`|Interfaces principales y enumeraciones|
|`lib/payment/types/payment.ts`|Flujo de pago y tipos de envío|
|`lib/payment/config/`|Configuración y validación del proveedor.|
|`lib/payment/lib/providers/`|Implementaciones de proveedores individuales|
|`lib/payment/hooks/`|Ganchos de reacción para flujos de pago del lado del cliente|
|`lib/payment/ui/`|Componentes del formulario de pago|

## Interfaces principales

### Interfaz de proveedor de pago

Cada proveedor implementa esta interfaz integral:

```typescript
export interface PaymentProviderInterface {
  // Payment operations
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
  createSetupIntent(user: User | null): Promise<SetupIntent>;

  // Subscription management
  createCustomer(params: CreateCustomerParams): Promise<CustomerResult>;
  createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo>;
  cancelSubscription(subscriptionId: string, cancelAtPeriodEnd?: boolean): Promise<SubscriptionInfo>;
  updateSubscription(params: UpdateSubscriptionParams): Promise<SubscriptionInfo>;
  hasCustomerId(user: User | null): boolean;
  getCustomerId(user: User | null): Promise<string | null>;

  // Webhooks and refunds
  handleWebhook(payload: any, signature: string, ...args: any[]): Promise<WebhookResult>;
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client configuration and UI
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### PagoProveedorFábrica

Crea instancias de proveedor basadas en la configuración:

```typescript
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':       return new StripeProvider(config);
      case 'solidgate':    return new SolidgateProvider(config);
      case 'lemonsqueezy': return new LemonSqueezyProvider(config);
      case 'polar':        return new PolarProvider(config);
      default:             throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## Servicio de pago

La clase `PaymentService` proporciona una fachada unificada sobre todas las operaciones del proveedor:

```typescript
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(config.provider, config.config);
  }

  // All methods delegate to the underlying provider
  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  // ... additional delegated methods
}
```

## Tipos de datos

### Enumeraciones de pago

```typescript
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}
```

### Eventos de webhook

```typescript
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  INVOICE_PAID = 'invoice_paid',
  REFUND_CREATED = 'refund_created',
  // ... additional event types
}
```

### Estructuras de datos clave

|Tipo|Propósito|
|------|---------|
|`PaymentIntent`|Sesión de pago con id, monto, moneda, estado, clientSecret|
|`SubscriptionInfo`|Detalles de la suscripción con estado, fin del período, información de prueba|
|`CustomerResult`|Cliente creado con identificación, correo electrónico y nombre.|
|`WebhookResult`|Webhook procesado con tipo, identificación y datos.|
|`ClientConfig`|Configuración segura de frontend con clave pública y tipo de puerta de enlace|
|`UIComponents`|Componentes de React y activos visuales para el proveedor.|

## Utilidades de moneda

La biblioteca incluye funciones auxiliares para el formato de moneda:

```typescript
// Format cents to display currency
export function formatCentsToCurrency(
  cents: number, currency: string = 'USD', locale: string = 'en-US'
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount);
}

// Convert between cents and decimal
export function convertCentsToDecimal(cents: number): number;
export function convertDecimalToCents(decimal: number): number;

// Convert timestamps to Date objects
export function convertNumberToDate(timestamp?: number): Date | null;
export function safeTimestampToDate(timestamp: number | null | undefined): Date | undefined;
```

## Tipos de flujo de pago

El sistema admite dos flujos de pago de envío:

|Flujo|enumeración|Descripción|
|------|------|-------------|
|Pagar al inicio|`PAY_AT_START`|Pago requerido antes de la revisión del envío|
|Pagar al final|`PAY_AT_END`|Pago cobrado después de la aprobación del administrador|

### Ciclo de vida del estado de envío

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT: Submit (pay at start)
    DRAFT --> PUBLISHED: Submit (free)
    PENDING_PAYMENT --> PAID: Payment confirmed
    PAID --> PUBLISHED: Admin approves
    PAID --> REJECTED: Admin rejects
    DRAFT --> PUBLISHED: Admin approves (pay at end)
    DRAFT --> REJECTED: Admin rejects (pay at end)
```

## Interfaz de componentes de la interfaz de usuario

Cada proveedor expone componentes de UI para la integración frontend:

```typescript
export interface UIComponents {
  PaymentForm: React.ComponentType<PaymentFormProps>;
  logo: string;
  cardBrands: CardBrandIcon[];
  supportedPaymentMethods: string[];
  translations: Record<string, Record<string, string>>;
}
```

## Integración del lado del cliente

El gancho `usePayment` y el contexto `PaymentProvider` proporcionan integración de React:

```typescript
import { usePayment, PaymentProvider } from '@/lib/payment';

// Wrap your app with the payment provider
<PaymentProvider>
  <PaymentForm
    amount={2999}
    currency="usd"
    isSubscription={false}
    onSuccess={(paymentId) => console.log('Paid:', paymentId)}
    onError={(error) => console.error('Failed:', error)}
  />
</PaymentProvider>
```

## Configuración del proveedor

```typescript
export interface PaymentProviderConfig {
  apiKey: string;
  webhookSecret?: string;
  secretKey?: string;
  options?: Record<string, any>;
}
```

Cada proveedor requiere como mínimo un `apiKey`. Stripe y Solidgate también utilizan `webhookSecret` para verificar la firma del webhook.
