---
id: constants-reference
title: Referencia de constantes
sidebar_label: Referencia de constantes
sidebar_position: 31
---

# Referencia de constantes

Las constantes de toda la aplicación se organizan en varios archivos bajo `lib/constants/` y la raíz `lib/constants.ts`. Esta página documenta cada constante exportada agrupada por dominio.

## Estructura de archivos

```
lib/
  constants.ts              # Main constants file (localization, branding, API, auth, analytics)
  constants/
    analytics.ts            # Viewer tracking constants
    payment.ts              # Payment enums, plan names, pricing
```

La raíz `constants.ts` reexporta valores de los archivos del subdirectorio para lograr compatibilidad con versiones anteriores.

## Localización

Definido en `lib/constants.ts`.

```ts
export const DEFAULT_LOCALE = 'en';

export const LOCALES = [
  'en', 'fr', 'es', 'de', 'zh', 'ar', 'he', 'ru', 'uk',
  'pt', 'it', 'ja', 'ko', 'nl', 'pl', 'tr', 'vi', 'th',
  'hi', 'id', 'bg',
] as const;

export type Locale = (typeof LOCALES)[number];

/** Locales that use right-to-left text direction */
export const RTL_LOCALES: readonly Locale[] = ['ar', 'he'] as const;
```

La tupla `LOCALES` impulsa la generación de rutas, la configuración de i18n y la generación de etiquetas hreflang en toda la plantilla.

## Marca y interfaz de usuario

```ts
export const LOGO_URL = '/logo-ever-work-3.png';
```

## API y back-end

```ts
// Base URL for internal website API (Next.js API routes)
export const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

Para la API de Ever Works Platform, utilice las variables de entorno `PLATFORM_API_URL` y `PLATFORM_API_SECRET_TOKEN`. Consulte la documentación [API Client Layer](./api-client-layer.md).

## Autenticación y seguridad

```ts
export const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
export const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
export const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Análisis - PostHog

```ts
export const POSTHOG_KEY = getNextPublicEnv('NEXT_PUBLIC_POSTHOG_KEY');
export const POSTHOG_HOST = getNextPublicEnv('NEXT_PUBLIC_POSTHOG_HOST');
export const POSTHOG_ENABLED = POSTHOG_KEY?.value && POSTHOG_HOST?.value;
export const POSTHOG_DEBUG = getNextPublicEnv('POSTHOG_DEBUG');

// Feature toggles
export const POSTHOG_SESSION_RECORDING_ENABLED = getNextPublicEnv(
  'POSTHOG_SESSION_RECORDING_ENABLED', 'true'
);
export const POSTHOG_AUTO_CAPTURE = getNextPublicEnv('POSTHOG_AUTO_CAPTURE', 'false');

// Sampling rates (lower in production to reduce data volume)
export const POSTHOG_SAMPLE_RATE = clientEnv.isProduction ? 0.1 : 1.0;
export const POSTHOG_SESSION_RECORDING_SAMPLE_RATE = clientEnv.isProduction ? 0.1 : 1.0;
```

## Seguimiento de errores: centinela

```ts
export const SENTRY_DSN = getNextPublicEnv('NEXT_PUBLIC_SENTRY_DSN');
export const SENTRY_ENABLE_DEV = getNextPublicEnv('SENTRY_ENABLE_DEV');
export const SENTRY_DEBUG = getNextPublicEnv('SENTRY_DEBUG');
export const SENTRY_ENABLED =
  SENTRY_DSN?.value && (SENTRY_ENABLE_DEV?.value === 'true' || clientEnv.isProduction);
```

## Seguimiento de excepciones: unificado

```ts
export const EXCEPTION_TRACKING_PROVIDER = getNextPublicEnv(
  'EXCEPTION_TRACKING_PROVIDER', 'both'
);
export const POSTHOG_EXCEPTION_TRACKING = getNextPublicEnv(
  'POSTHOG_EXCEPTION_TRACKING', 'true'
);
export const SENTRY_EXCEPTION_TRACKING = getNextPublicEnv(
  'SENTRY_EXCEPTION_TRACKING', 'true'
);

type ExceptionTrackingProvider = 'sentry' | 'posthog' | 'both' | 'none';
```

## ReCAPTCHA

```ts
export const RECAPTCHA_SITE_KEY = getNextPublicEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
export const RECAPTCHA_SECRET_KEY = getNextPublicEnv('RECAPTCHA_SECRET_KEY');
```

## Constantes de análisis (`constants/analytics.ts`)

```ts
/** Cookie name for storing the anonymous viewer ID */
export const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age in seconds (365 days) */
export const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
```

Estas constantes impulsan un seguimiento de vistas diarias único sin necesidad de autenticación.

## Constantes de pago (`constants/payment.ts`)

Este archivo está separado intencionalmente del `constants.ts` principal para que pueda importarse en scripts que se ejecutan fuera del tiempo de ejecución de Next.js (migraciones, semillas, etc.).

### Flujo de pago

```ts
enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

### Estado de pago

```ts
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### Intervalo de pago

```ts
enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}
```

### Planes de pago

```ts
enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  [PaymentPlan.FREE]: 'Free Plan',
  [PaymentPlan.STANDARD]: 'Standard Plan',
  [PaymentPlan.PREMIUM]: 'Premium Plan',
};
```

### Método de pago

```ts
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### Moneda de pago

```ts
enum PaymentCurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
  ETH = 'ETH',
}
```

### Proveedor de pagos

```ts
enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

### Estado de envío

```ts
enum SubmissionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
```

### Precio de los anuncios del patrocinador

```ts
const SponsorAdPricing = {
  WEEKLY: 100,  // $100.00
  MONTHLY: 300, // $300.00
} as const;
```

Estos son valores de reserva predeterminados. Los valores de tiempo de ejecución son controlados por el sistema de configuración a través de `getSponsorAdWeeklyPrice()` y `getSponsorAdMonthlyPrice()`.

## Importar patrones

```ts
// Import from the main constants file
import { DEFAULT_LOCALE, LOCALES, PaymentPlan, SubmissionStatus } from '@/lib/constants';

// Import payment constants directly (for scripts outside Next.js)
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';

// Import analytics constants directly
import { VIEWER_COOKIE_NAME, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants/analytics';
```

## Archivos relacionados

- `lib/constants.ts` - Archivo de constantes principales con reexportaciones
- `lib/constants/analytics.ts` - Constantes de seguimiento del espectador
- `lib/constants/payment.ts` - Enumeraciones de pago y precios predeterminados
- `lib/config/` - Configuración del tiempo de ejecución (basada en el entorno)
