---
id: payment-overview
title: Descripción general de la integración de pagos
sidebar_label: Guía de integración
sidebar_position: 1.5
---

# Descripción general de la integración de pagos

Esta guía proporciona un recorrido práctico por el sistema de pago Ever Works. Cubre la capa de abstracción del proveedor, cómo configurar cada proveedor, el ciclo de vida de pago y suscripción, la activación de funciones y el manejo de webhooks.

## Arquitectura del proveedor de un vistazo

El sistema de pago se basa en una **abstracción independiente del proveedor**. Cada proveedor de pagos implementa el mismo `PaymentProviderInterface` y un patrón de fábrica le permite cambiar de proveedor sin cambiar el código de la aplicación.

```
lib/payment/
  index.ts                          # Public API exports
  config/
    provider-configs.ts             # Provider configuration factory
    payment-provider-manager.ts     # Singleton manager + ConfigManager
    validation.ts                   # Input validation utilities
  guards/
    feature.guard.tsx               # Plan-based feature gating
  hooks/
    use-payment.tsx                 # React context + usePayment hook
  lib/
    payment-provider-factory.ts     # Factory for creating providers
    payment-service.ts              # Service wrapping the active provider
    payment-service-manager.ts      # Singleton for service lifecycle
    providers/
      stripe-provider.ts
      lemonsqueezy-provider.ts
      polar-provider.ts
      solidgate-provider.ts
    client/
      payment-account-client.ts     # Client-side account API
    utils/
      prices.ts                     # Price formatting utilities
      polar-subscription-helpers.ts
  services/
    payment-email.service.ts        # Email notifications on payment events
  types/
    payment-types.ts                # Core type definitions
    payment.ts                      # Payment flow and submission types
  ui/
    stripe/stripe-elements.tsx
    lemonsqueezy/lemonsqueezy-elements.tsx
    polar/polar-elements.tsx
    solidgate/solidgate-elements.tsx
```

### Proveedores compatibles

| Proveedor | Pagos únicos | Suscripciones | Ensayos | Webhooks | Comerciante de Registro |
|-------------|:-:|:-:|:-:|:-:|:-:|
| Raya | Sí | Sí | Sí | Sí | No |
| Limón exprimidor | Sí | Sí | Sí | Sí | Sí |
| polares | Sí | Sí | Sí | Sí | No |
| Puerta sólida | Sí | Sí | No | Sí | No |

## Interfaces principales

### Interfaz de proveedor de pagos

Cada proveedor implementa esta interfaz, definida en `lib/payment/types/payment-types.ts` :

```typescript
// lib/payment/types/payment-types.ts
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

  // Webhooks
  handleWebhook(payload: any, signature: string, rawBody?: string,
                timestamp?: string, webhookId?: string): Promise<WebhookResult>;

  // Refunds
  refundPayment(paymentId: string, amount?: number): Promise<any>;

  // Client-side configuration
  getClientConfig(): ClientConfig;
  getUIComponents(): UIComponents;
}
```

### Tipos de datos clave

```typescript
// Subscription statuses
export enum SubscriptionStatus {
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

// Payment types
export enum PaymentType {
  ONE_TIME = 'one_time',
  SUBSCRIPTION = 'subscription',
  FREE = 'free',
}

// Supported providers
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';
```

## Configuración rápida

### Paso 1: Establecer variables de entorno

Cada proveedor requiere claves API y secretos de webhooks. Agréguelos a `.env.local` :

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# LemonSqueezy
LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_STORE_ID=...

# Polar
POLAR_ACCESS_TOKEN=...
POLAR_WEBHOOK_SECRET=...
POLAR_ORGANIZATION_ID=...

# Solidgate
SOLIDGATE_API_KEY=...
SOLIDGATE_SECRET_KEY=...
SOLIDGATE_WEBHOOK_SECRET=...
SOLIDGATE_MERCHANT_ID=...
NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY=...
```

### Paso 2: Configurar planes de precios

Los planes de precios están definidos en tu `.content/config.yml` :

```yaml
pricing:
  provider: stripe          # Default provider
  currency: USD
  plans:
    FREE:
      id: free
      name: Free
      description: Basic access
      price: 0
      features:
        - "List your product"
        - "Basic analytics"
    STANDARD:
      id: standard
      name: Standard
      description: Enhanced features
      price: 9
      stripePriceId: price_xxx
      annualDiscount: 20
      features:
        - "Everything in Free"
        - "Priority listing"
        - "Advanced analytics"
    PREMIUM:
      id: premium
      name: Premium
      description: Full access
      price: 29
      stripePriceId: price_yyy
      annualDiscount: 25
      isPremium: true
      features:
        - "Everything in Standard"
        - "Featured placement"
        - "API access"
```

### Paso 3: configurar webhooks

Cada proveedor tiene un punto final de webhook dedicado:

| Proveedor | URL de webhook |
|---------------------|-------------------------------|
| Raya | `/api/stripe/webhook` |
| Limón exprimidor | `/api/lemonsqueezy/webhook` |
| polares | `/api/polar/webhook` |
| Puerta sólida | `/api/solidgate/webhook` |

Configure estas URL en el panel de cada proveedor, apuntando a su dominio implementado.

## La fábrica de proveedores de pagos

La fábrica crea instancias de proveedor basadas en una cadena de tipo:

```typescript
// lib/payment/lib/payment-provider-factory.ts
export type SupportedProvider = 'stripe' | 'solidgate' | 'lemonsqueezy' | 'polar';

export class PaymentProviderFactory {
  static createProvider(
    providerType: SupportedProvider,
    config: PaymentProviderConfig
  ): PaymentProviderInterface {
    switch (providerType) {
      case 'stripe':
        return new StripeProvider(config);
      case 'solidgate':
        return new SolidgateProvider(config);
      case 'lemonsqueezy':
        return new LemonSqueezyProvider(config as unknown as LemonSqueezyConfig);
      case 'polar':
        return new PolarProvider(config as unknown as PolarConfig);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }
}
```

## Servicio de pago y Administrador de servicio

### Servicio de pago

El `PaymentService` envuelve la instancia del proveedor activo y expone una API uniforme:

```typescript
// lib/payment/lib/payment-service.ts
export class PaymentService {
  private provider: PaymentProviderInterface;

  constructor(config: PaymentServiceConfig) {
    this.provider = PaymentProviderFactory.createProvider(
      config.provider,
      config.config
    );
  }

  async createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent> {
    return this.provider.createPaymentIntent(params);
  }

  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    return this.provider.createSubscription(params);
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd = true
  ): Promise<SubscriptionInfo> {
    return this.provider.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
  }

  getClientConfig(): ClientConfig {
    return this.provider.getClientConfig();
  }

  getUIComponents(): UIComponents {
    return this.provider.getUIComponents();
  }
}
```

### Administrador de servicios de pago (Singleton)

El administrador maneja el cambio de proveedor en tiempo de ejecución y mantiene la elección del usuario en `localStorage` :

```typescript
// lib/payment/lib/payment-service-manager.ts
export class PaymentServiceManager {
  private static instance: PaymentServiceManager;
  private currentService: PaymentService | null = null;
  private readonly STORAGE_KEY = 'everworks_template.payment_provider.selected';

  static getInstance(
    providerConfigs: Record<SupportedProvider, PaymentProviderConfig>,
    defaultProvider?: SupportedProvider
  ): PaymentServiceManager {
    if (!PaymentServiceManager.instance) {
      PaymentServiceManager.instance = new PaymentServiceManager(
        providerConfigs, defaultProvider
      );
    }
    return PaymentServiceManager.instance;
  }

  async switchProvider(newProvider: SupportedProvider): Promise<void> {
    this.setStoredProvider(newProvider);
    this.currentService = new PaymentService({
      provider: newProvider,
      config: this.providerConfigs[newProvider],
    });
  }

  getAvailableProviders(): SupportedProvider[] {
    return Object.keys(this.providerConfigs) as SupportedProvider[];
  }
}
```

## Integración de reacción

### Contexto del proveedor de pagos

Envuelva su solicitud (o páginas relacionadas con pagos) con el `PaymentProvider` :

```tsx
// Example: wrapping a layout
import { PaymentProvider } from '@/lib/payment';
import { createProviderConfigs } from '@/lib/payment/config/provider-configs';

const configs = createProviderConfigs(
  { apiKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, webhookSecret: '' },
  undefined,  // solidgate
  undefined,  // lemonsqueezy
  undefined   // polar
);

export default function PricingLayout({ children }) {
  return (
    <PaymentProvider providerConfigs={configs} defaultProvider="stripe">
      {children}
    </PaymentProvider>
  );
}
```

### utilizar gancho de pago

Los componentes acceden al servicio de pago a través del gancho `usePayment` :

```typescript
// lib/payment/hooks/use-payment.tsx
export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}

// Returns:
// {
//   service: PaymentService | null;
//   switchProvider: (provider: SupportedProvider) => Promise<void>;
//   currentProvider: SupportedProvider;
//   availableProviders: SupportedProvider[];
// }
```

**Ejemplo de uso:**

```tsx
function CheckoutButton({ priceId }: { priceId: string }) {
  const { service, currentProvider } = usePayment();

  const handleCheckout = async () => {
    const intent = await service?.createPaymentIntent({
      amount: 2900,
      currency: 'usd',
      metadata: { priceId },
    });
    // Redirect to checkout or show payment form
  };

  return <button onClick={handleCheckout}>Pay with {currentProvider}</button>;
}
```

## Puerta de funciones

El componente `FeatureGuard` restringe los elementos de la interfaz de usuario según el plan de suscripción del usuario:

```tsx
// lib/payment/guards/feature.guard.tsx
export type PlanType = "TRIAL" | "FREE" | "STANDARD" | "PREMIUM" | "EXPIRED" | "CANCELLED";

const PLAN_LEVEL: Record<PlanType, number> = {
  CANCELLED: 0,
  EXPIRED: 1,
  TRIAL: 2,
  FREE: 3,
  STANDARD: 4,
  PREMIUM: 5,
};
```

**Uso:**

```tsx
import FeatureGuard from '@/lib/payment/guards/feature.guard';

<FeatureGuard
  user={currentUser}
  requiredPlan="STANDARD"
  fallback={<UpgradePrompt />}
  onAccessDenied={(userPlan, required, reason) => {
    console.log(`Access denied: ${reason}`);
  }}
>
  <PremiumFeature />
</FeatureGuard>
```

### Soporte del período de gracia

Los planes vencidos reciben un período de gracia de 7 días con acceso degradado:

```typescript
export const GRACE_PERIOD_CONFIG = {
  EXPIRED_GRACE_DAYS: 7,
  TRIAL_DURATION_DAYS: 14,
  EXPIRED_ACCESS_LEVEL: "FREE" as PlanType,
};

export const isInGracePeriod = (user: User): boolean => {
  if (!user.planExpiresAt) return false;
  const graceEnd = new Date(user.planExpiresAt);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_CONFIG.EXPIRED_GRACE_DAYS);
  return new Date() <= graceEnd && user.plan === "EXPIRED";
};
```

## Tipos de eventos de webhook

Todos los eventos de webhook se normalizan en una enumeración común:

```typescript
// lib/payment/types/payment-types.ts
export enum WebhookEventType {
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  SUBSCRIPTION_TRIAL_ENDING = 'subscription_trial_ending',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_PAYMENT_FAILED = 'invoice_payment_failed',
  REFUND_CREATED = 'refund_created',
  // ... and more
}
```

## Flujos de pago

La plantilla admite dos flujos de pago para el envío de contenido:

```typescript
// lib/payment/types/payment.ts
export enum PaymentFlow {
  PAY_AT_START = "pay_at_start",
  PAY_AT_END = "pay_at_end",
}

export enum SubmissionStatus {
  DRAFT = "draft",
  PENDING_PAYMENT = "pending_payment",
  PAID = "paid",
  PUBLISHED = "published",
  REJECTED = "rejected",
}
```

- **Pago al inicio**: el usuario paga antes de que se revise el envío.
- **Pago al final**: el usuario envía de forma gratuita, paga solo después de la aprobación.

## Referencia de ruta API

### Rutas de rayas

| Ruta | Método | Descripción |
|-------|--------|-------------|
| `/api/stripe/checkout` | PUBLICAR | Crear una sesión de pago |
| `/api/stripe/subscription` | OBTENER/PUBLICAR | Administrar suscripciones |
| `/api/stripe/subscription/portal` | PUBLICAR | Crear sesión en el portal de facturación |
| `/api/stripe/subscription/[id]/cancel` | PUBLICAR | Cancelar una suscripción |
| `/api/stripe/payment-intent` | PUBLICAR | Crear una intención de pago |
| `/api/stripe/payment-methods/list` | OBTENER | Listar métodos de pago guardados |
| `/api/stripe/payment-methods/create` | PUBLICAR | Añadir un método de pago |
| `/api/stripe/payment-methods/delete` | PUBLICAR | Eliminar un método de pago |
| `/api/stripe/setup-intent` | PUBLICAR | Crear una intención de configuración |
| `/api/stripe/webhook` | PUBLICAR | Manejar webhooks de rayas |

### Rutas LemonSqueezy

| Ruta | Método | Descripción |
|-------|--------|-------------|
| `/api/lemonsqueezy/checkout` | PUBLICAR | Crear sesión de pago |
| `/api/lemonsqueezy/cancel` | PUBLICAR | Cancelar una suscripción |
| `/api/lemonsqueezy/reactivate` | PUBLICAR | Reactivar una suscripción |
| `/api/lemonsqueezy/update-plan` | PUBLICAR | Cambiar plan de suscripción |
| `/api/lemonsqueezy/list` | OBTENER | Listar suscripciones de usuarios |
| `/api/lemonsqueezy/webhook` | PUBLICAR | Manejar webhooks |

### Rutas polares

| Ruta | Método | Descripción |
|-------|--------|-------------|
| `/api/polar/checkout` | PUBLICAR | Crear sesión de pago |
| `/api/polar/subscription/portal` | PUBLICAR | Crear portal de clientes |
| `/api/polar/subscription/[id]/cancel` | PUBLICAR | Cancelar una suscripción |
| `/api/polar/subscription/[id]/reactivate` | PUBLICAR | Reactivar |
| `/api/polar/webhook` | PUBLICAR | Manejar webhooks |

## Funciones de utilidad

El archivo `payment-types.ts` incluye útiles ayudas de formato:

```typescript
// Format cents to currency string
formatCentsToCurrency(2900, 'USD', 'en-US');
// => "$29.00"

// Convert cents to decimal
convertCentsToDecimal(2900);
// => 29.00

// Convert timestamp to Date
convertNumberToDate(1640995200);
// => Date: 2022-01-01T00:00:00.000Z
```

## Próximos pasos

- [Configuración de Stripe](./stripe) -- Configuración completa de Stripe
- [Configuración de LemonSqueezy] (./lemonsqueezy) -- Configuración de LemonSqueezy
- [Configuración polar](./polar) -- Configuración polar
- [Integración multidivisa] (./multidivisa) -- Soporte de divisas
- [Arquitectura de pago] (./arquitectura de pago): inmersión profunda en la arquitectura
- [Webhooks](./webhooks) -- Detalles de manejo del webhook
- [Guía de configuración](./configuration) -- Todas las variables y opciones de entorno
