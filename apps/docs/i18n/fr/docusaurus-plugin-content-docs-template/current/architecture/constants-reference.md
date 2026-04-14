---
id: constants-reference
title: Référence des constantes
sidebar_label: Référence des constantes
sidebar_position: 31
---

# Référence des constantes

Les constantes à l'échelle de l'application sont organisées dans plusieurs fichiers sous `lib/constants/` et la racine `lib/constants.ts`. Cette page documente chaque constante exportée regroupée par domaine.

## Structure du fichier

```
lib/
  constants.ts              # Main constants file (localization, branding, API, auth, analytics)
  constants/
    analytics.ts            # Viewer tracking constants
    payment.ts              # Payment enums, plan names, pricing
```

La racine `constants.ts` réexporte les valeurs des fichiers du sous-répertoire pour une compatibilité ascendante.

## Localisation

Défini dans `lib/constants.ts`.

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

Le tuple `LOCALES` pilote la génération de routes, la configuration i18n et la génération de balises hreflang dans le modèle.

## Image de marque et interface utilisateur

```ts
export const LOGO_URL = '/logo-ever-work-3.png';
```

## API et back-end

```ts
// Base URL for internal website API (Next.js API routes)
export const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

Pour l'API Ever Works Platform, utilisez plutôt les variables d'environnement `PLATFORM_API_URL` et `PLATFORM_API_SECRET_TOKEN`. Consultez la documentation [API Client Layer](./api-client-layer.md).

## Authentification et sécurité

```ts
export const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
export const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
export const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Analyses - PostHog

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

## Suivi des erreurs - Sentry

```ts
export const SENTRY_DSN = getNextPublicEnv('NEXT_PUBLIC_SENTRY_DSN');
export const SENTRY_ENABLE_DEV = getNextPublicEnv('SENTRY_ENABLE_DEV');
export const SENTRY_DEBUG = getNextPublicEnv('SENTRY_DEBUG');
export const SENTRY_ENABLED =
  SENTRY_DSN?.value && (SENTRY_ENABLE_DEV?.value === 'true' || clientEnv.isProduction);
```

## Suivi des exceptions - Unifié

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

## Constantes d'analyse (`constants/analytics.ts`)

```ts
/** Cookie name for storing the anonymous viewer ID */
export const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age in seconds (365 days) */
export const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
```

Ces constantes permettent un suivi quotidien unique des vues sans nécessiter d'authentification.

## Constantes de paiement (`constants/payment.ts`)

Ce fichier est intentionnellement séparé du `constants.ts` principal afin qu'il puisse être importé dans des scripts qui s'exécutent en dehors du runtime Next.js (migrations, graines, etc.).

### Flux de paiement

```ts
enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

### Statut du paiement

```ts
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### Intervalle de paiement

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

### Plans de paiement

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

### Mode de paiement

```ts
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### Devise de paiement

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

### Fournisseur de paiement

```ts
enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

### Statut de la soumission

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

### Tarifs des publicités des sponsors

```ts
const SponsorAdPricing = {
  WEEKLY: 100,  // $100.00
  MONTHLY: 300, // $300.00
} as const;
```

Ce sont des valeurs de secours par défaut. Les valeurs d'exécution sont contrôlées par le système de paramètres via `getSponsorAdWeeklyPrice()` et `getSponsorAdMonthlyPrice()`.

## Modèles d'importation

```ts
// Import from the main constants file
import { DEFAULT_LOCALE, LOCALES, PaymentPlan, SubmissionStatus } from '@/lib/constants';

// Import payment constants directly (for scripts outside Next.js)
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';

// Import analytics constants directly
import { VIEWER_COOKIE_NAME, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants/analytics';
```

## Fichiers associés

- `lib/constants.ts` - Fichier de constantes principales avec réexports
- `lib/constants/analytics.ts` - Constantes de suivi du visualiseur
- `lib/constants/payment.ts` - Énumérations de paiement et prix par défaut
- `lib/config/` - Configuration du runtime (basée sur l'environnement)
