---
id: constants-reference-module
title: Constanten referentie
sidebar_label: Constanten referentie
sidebar_position: 54
---

# Constanten referentie

De constantenmodule (`template/lib/constants.ts` en `template/lib/constants/`) centraliseert alle toepassingsbrede configuratiewaarden, opsommingen, omgevingsgestuurde instellingen en magische getallen. Constanten zijn georganiseerd in domeinspecifieke bestanden om veilige import mogelijk te maken in contexten buiten de Next.js-runtime (bijvoorbeeld migratiescripts, zaadscripts).

## Architectuuroverzicht

```mermaid
graph TD
    A[lib/constants.ts] -->|re-exports| B[lib/constants/payment.ts]
    A -->|re-exports| C[lib/constants/analytics.ts]
    A -->|reads| D[env-config / getNextPublicEnv]
    A -->|reads| E[lib/config/client.ts]

    F[Application Code] --> A
    G[Migration Scripts] --> B
    H[Seed Scripts] --> B
```

## Bronbestanden

|Bestand|Beschrijving|
|------|-------------|
|`lib/constants.ts`|Hoofdconstanten vat - importeert uit env-config en exporteert submodules opnieuw|
|`lib/constants/payment.ts`|Betalingsnummers en -typen (veilig voor scripts)|
|`lib/constants/analytics.ts`|Analytics-gerelateerde constanten|

## Lokalisatieconstanten

```typescript
const DEFAULT_LOCALE = 'en';

const LOCALES = [
  'en', 'fr', 'es', 'de', 'zh', 'ar', 'he', 'ru', 'uk', 'pt',
  'it', 'ja', 'ko', 'nl', 'pl', 'tr', 'vi', 'th', 'hi', 'id', 'bg'
] as const;

type Locale = (typeof LOCALES)[number];

/** Right-to-left locales */
const RTL_LOCALES: readonly Locale[] = ['ar', 'he'] as const;
```

## Branding en gebruikersinterface

```typescript
const LOGO_URL = '/logo-ever-work-3.png';
```

## API en backend

```typescript
/** Base URL for internal Next.js API routes */
const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

## Authenticatie en beveiliging

```typescript
const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Analyse -- PostHog

|Constant|Bron|Beschrijving|
|----------|--------|-------------|
|`POSTHOG_KEY`|`NEXT_PUBLIC_POSTHOG_KEY`|API-sleutel van het PostHog-project|
|`POSTHOG_HOST`|`NEXT_PUBLIC_POSTHOG_HOST`|PostHog API-host|
|`POSTHOG_ENABLED`|Afgeleid|Waar als zowel de sleutel als de host bestaan|
|`POSTHOG_DEBUG`|`POSTHOG_DEBUG`|Schakel logboekregistratie voor foutopsporing in|
|`POSTHOG_SESSION_RECORDING_ENABLED`|env / `'true'`|Sessie-opnameschakelaar|
|`POSTHOG_AUTO_CAPTURE`|env / `'false'`|Paginaweergaven automatisch vastleggen|
|`POSTHOG_SAMPLE_RATE`|Berekend|`0.1` in productie, `1.0` in ontwikkeling|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Berekend|`0.1` in productie, `1.0` in ontwikkeling|

## Foutopsporing - Sentry

|Constant|Bron|Beschrijving|
|----------|--------|-------------|
|`SENTRY_DSN`|`NEXT_PUBLIC_SENTRY_DSN`|Naam van Sentry-gegevensbron|
|`SENTRY_ENABLE_DEV`|`SENTRY_ENABLE_DEV`|Schakel Sentry in ontwikkeling in|
|`SENTRY_DEBUG`|`SENTRY_DEBUG`|Sentry-foutopsporingsmodus|
|`SENTRY_ENABLED`|Afgeleid|Waar als DSN is ingesteld en de omgeving dit toestaat|

## Uniforme tracking van uitzonderingen

```typescript
const EXCEPTION_TRACKING_PROVIDER = getNextPublicEnv('EXCEPTION_TRACKING_PROVIDER', 'both');
const POSTHOG_EXCEPTION_TRACKING = getNextPublicEnv('POSTHOG_EXCEPTION_TRACKING', 'true');
const SENTRY_EXCEPTION_TRACKING = getNextPublicEnv('SENTRY_EXCEPTION_TRACKING', 'true');

type ExceptionTrackingProvider = 'sentry' | 'posthog' | 'both' | 'none';
```

## ReCAPTCHA

```typescript
const RECAPTCHA_SITE_KEY = getNextPublicEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
const RECAPTCHA_SECRET_KEY = getNextPublicEnv('RECAPTCHA_SECRET_KEY');
```

## Betalingsconstanten (`constants/payment.ts`)

Dit bestand is opzettelijk gescheiden van `constants.ts` om te voorkomen dat `@/lib/config` wordt geïmporteerd, waardoor gebruik in migratie- en Seed-scripts die buiten Next.js worden uitgevoerd, mogelijk is.

### Enums

```typescript
enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}

enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

enum PaymentInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  ONE_TIME = 'one-time',
  PER_SUBMISSION = 'per-submission',
}

enum PaymentPlan {
  FREE = 'free',
  STANDARD = 'standard',
  PREMIUM = 'premium',
}

enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}

enum PaymentCurrency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
  ETH = 'ETH',
}

enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}

enum SubmissionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}
```

### Weergavenamen plannen

```typescript
const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  free: 'Free Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
};
```

### Sponsoradvertentieprijzen

```typescript
const SponsorAdPricing = {
  WEEKLY: 100,    // $100.00
  MONTHLY: 300,   // $300.00
} as const;
```

## Analytics-constanten (`constants/analytics.ts`)

```typescript
/** Cookie name for anonymous viewer tracking */
const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age: 365 days in seconds */
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 31,536,000
```

## Patronen importeren

### Volledige applicatiecode

```typescript
// Import everything from the main barrel
import {
  DEFAULT_LOCALE,
  LOCALES,
  POSTHOG_ENABLED,
  PaymentPlan,
  PaymentProvider,
  SubmissionStatus,
  VIEWER_COOKIE_NAME,
} from '@/lib/constants';
```

### Scripts buiten Next.js Runtime

```typescript
// Import only from payment.ts to avoid Next.js dependencies
import { PaymentPlan, PaymentStatus, SubmissionStatus } from '@/lib/constants/payment';
```
