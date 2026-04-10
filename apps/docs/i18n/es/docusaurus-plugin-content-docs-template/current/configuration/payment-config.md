---
id: payment-config
title: "Configuración de Pagos"
sidebar_label: "Pagos"
sidebar_position: 12
---

# Configuración de Pagos

La plantilla admite múltiples proveedores de pago y flujos de facturación flexibles. Esta referencia cubre cada constante, enum y opción de configuración relacionada con pagos.

## Constantes de Pago

Todos los enums y tipos de pago principales están definidos en `lib/constants/payment.ts`. Este archivo se mantiene intencionalmente separado del módulo de configuración principal para que pueda importarse en scripts que se ejecutan fuera del runtime de Next.js (migraciones, seeds, herramientas CLI).

### PaymentFlow

Determina cuándo se cobra el pago en relación con el proceso de envío.

```typescript
export enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

| Valor | Descripción |
|-------|-------------|
| `pay_at_start` | El usuario paga antes de enviar; el elemento se publica inmediatamente |
| `pay_at_end` | El usuario envía primero; el pago se cobra después de la aprobación del administrador |

### PaymentStatus

Rastrea el estado de un intento de pago.

```typescript
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### PaymentInterval

Opciones de frecuencia de facturación.

```typescript
export enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### PaymentPlan

Niveles de suscripción disponibles.

```typescript
export enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}
```

### PaymentProvider

Pasarelas de pago admitidas.

```typescript
export enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

## Esquema de Configuración de Pagos

Definido en `lib/config/schemas/payment.schema.ts` y validado al inicio con Zod.

### Precios de Producto (Valores de Visualización)

```typescript
pricing: {
  free: number;       // Predeterminado: 0
  standard: number;   // Predeterminado: 10
  premium: number;    // Predeterminado: 20
}
```

| Variable de entorno | Campo | Predeterminado |
|---------------------|-------|----------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `pricing.free` | `0` |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `pricing.standard` | `10` |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `pricing.premium` | `20` |

### Configuración de Prueba

| Variable de entorno | Campo | Descripción |
|---------------------|-------|-------------|
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | `trial.standardTrialAmountId` | ID de precio para prueba estándar |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | `trial.premiumTrialAmountId` | ID de precio para prueba premium |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | `trial.authorized` | Habilitar montos de prueba (`true`/`false`) |

## Configuración del Proveedor

### Stripe

Se habilita automáticamente cuando están presentes tanto `secretKey` como `publishableKey`.

| Variable de entorno | Requerido | Descripción |
|---------------------|-----------|-------------|
| `STRIPE_SECRET_KEY` | Sí | Clave de API del lado del servidor |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Sí | Clave publicable del lado del cliente |
| `STRIPE_WEBHOOK_SECRET` | Recomendado | Verificación de firma de webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | No | ID de precio para plan gratuito |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | No | ID de precio para plan estándar |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | No | ID de precio para plan premium |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | No | Establecer `true` para obtener precios de la API de Stripe |

### LemonSqueezy

Se habilita automáticamente cuando están presentes tanto `apiKey` como `storeId`.

| Variable de entorno | Requerido | Descripción |
|---------------------|-----------|-------------|
| `LEMONSQUEEZY_API_KEY` | Sí | Clave de API del panel de LemonSqueezy |
| `LEMONSQUEEZY_STORE_ID` | Sí | Tu identificador de tienda |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Recomendado | Verificación de firma de webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | No | Anular URL del endpoint de webhook |
| `LEMONSQUEEZY_TEST_MODE` | No | Establecer `true` para modo de prueba |
| `LEMONSQUEEZY_VARIANT_ID` | No | ID de variante predeterminado |

### Polar

Se habilita automáticamente cuando están presentes tanto `accessToken` como `organizationId`.

| Variable de entorno | Requerido | Descripción |
|---------------------|-----------|-------------|
| `POLAR_ACCESS_TOKEN` | Sí | Token de acceso a la API |
| `POLAR_ORGANIZATION_ID` | Sí | Identificador de organización |
| `POLAR_WEBHOOK_SECRET` | Recomendado | Verificación de firma de webhook |
| `POLAR_SANDBOX` | No | Establecer `false` para producción (predeterminado: `true`) |
| `POLAR_API_URL` | No | Anular URL base de la API |

### Solidgate

Requiere configuración manual de variables de entorno.

| Variable de entorno | Requerido | Descripción |
|---------------------|-----------|-------------|
| `SOLIDGATE_API_KEY` | Sí | Clave de API |
| `SOLIDGATE_SECRET_KEY` | Sí | Clave secreta para firma |
| `SOLIDGATE_WEBHOOK_SECRET` | Sí | Verificación de webhook |
| `SOLIDGATE_MERCHANT_ID` | Sí | Identificador de comerciante |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | No | Clave del lado del cliente |

## Facturación Multi-moneda

Cada proveedor admite precios por moneda a través de los módulos de configuración de facturación en `lib/config/billing/`.

### Tipos de Configuración de Facturación

```typescript
type CurrencyCode = 'usd' | 'eur' | 'gbp' | 'cad';
type PlanName = 'premium' | 'standard' | 'free';

interface AmountConfig {
  monthly?: string;   // ID de precio/variante para facturación mensual
  yearly?: string;    // ID de precio/variante para facturación anual
  setupFee?: string;  // ID de precio de tarifa de configuración opcional
}

interface CurrencyConfig {
  amount: AmountConfig;
  currency?: string;  // Código ISO 4217 (ej. 'USD')
  symbol?: string;    // Símbolo de visualización (ej. '$')
}

type PlanConfig = {
  productId: string | undefined;
} & Partial<Record<CurrencyCode, CurrencyConfig>>;
```

### Monedas Admitidas

El array `SUPPORTED_CURRENCIES` en `lib/config/billing/types.ts` lista todos los 32 códigos ISO 4217 aceptados por el sistema (USD, EUR, GBP, JPY, CNY, CAD, AUD, CHF y más).

### Funciones de Resolución de Precios

Cada proveedor exporta una función de configuración de precios:

| Proveedor | Función | Fuente |
|-----------|---------|--------|
| Stripe | `getStripePriceConfig(plan, currency, interval)` | `billing/stripe.config.ts` |
| LemonSqueezy | `getLemonSqueezyPriceConfig(plan, currency, interval)` | `billing/lemonsqueezy.config.ts` |
| Polar | `getPolarPriceConfig(plan, currency, interval)` | `billing/polar.config.ts` |

Todas las funciones recurren a USD si la moneda solicitada no está configurada.

## Configuración del Flujo de Pago

Definido en `lib/config/payment-flows.ts`, el array `PAYMENT_FLOWS` configura las dos opciones de flujo de pago con sus propiedades de UI:

```typescript
interface PaymentFlowConfig {
  id: PaymentFlow;
  title: string;
  subtitle: string;
  description: string;
  icon: string;            // Nombre de icono Lucide
  color: string;           // Clases de gradiente Tailwind
  features: string[];      // Puntos de características
  benefits: Array<{ icon: string; text: string; color: string }>;
  badge?: string;          // Etiqueta de badge opcional
  isDefault?: boolean;     // Si este es el flujo predeterminado
}
```

Funciones auxiliares:
- `getDefaultPaymentFlow()` -- devuelve el valor `PaymentFlow` predeterminado
- `getPaymentFlowConfig(flowId)` -- devuelve el `PaymentFlowConfig` para un flujo dado

## Gestor de Proveedores de Pago

La clase `PaymentProviderManager` en `lib/payment/config/payment-provider-manager.ts` proporciona acceso singleton a las instancias de proveedores:

```typescript
// Obtener un proveedor específico
const stripe = PaymentProviderManager.getStripeProvider();
const ls = PaymentProviderManager.getLemonsqueezyProvider();
const polar = PaymentProviderManager.getPolarProvider();
const sg = PaymentProviderManager.getSolidgateProvider();

// O usar la función genérica
import { getOrCreateProvider } from '@/lib/payment/config/payment-provider-manager';
const provider = getOrCreateProvider('stripe');
```

## Páginas Relacionadas

- [Tipos de Pago](../types/payment-types.md) -- definiciones de tipo para operaciones de pago
- [Tipos de Suscripción](../types/subscription-types.md) -- tipos de ciclo de vida de suscripción
- [Referencia de Entorno](./environment-reference.md) -- listado completo de variables de entorno
