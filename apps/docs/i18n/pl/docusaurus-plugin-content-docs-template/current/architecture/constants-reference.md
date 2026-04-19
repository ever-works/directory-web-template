---
id: constants-reference
title: Stałe odniesienia
sidebar_label: Stałe odniesienia
sidebar_position: 31
---

# Stałe odniesienia

Stałe obejmujące całą aplikację są zorganizowane w kilku plikach w `lib/constants/` i katalogu głównym `lib/constants.ts`. Ta strona dokumentuje każdą wyeksportowaną stałą pogrupowaną według domeny.

## Struktura pliku

```
lib/
  constants.ts              # Main constants file (localization, branding, API, auth, analytics)
  constants/
    analytics.ts            # Viewer tracking constants
    payment.ts              # Payment enums, plan names, pricing
```

Katalog główny `constants.ts` ponownie eksportuje wartości z plików podkatalogu w celu zapewnienia kompatybilności wstecznej.

## Lokalizacja

Zdefiniowane w `lib/constants.ts`.

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

Krotka `LOCALES` steruje generowaniem tras, konfiguracją i18n i generowaniem tagów hreflang w całym szablonie.

## Marka i interfejs użytkownika

```ts
export const LOGO_URL = '/logo-ever-work-3.png';
```

## API i backend

```ts
// Base URL for internal website API (Next.js API routes)
export const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

W przypadku interfejsu API platformy Ever Works użyj zamiast tego zmiennych środowiskowych `PLATFORM_API_URL` i `PLATFORM_API_SECRET_TOKEN`. Zobacz dokumentację [Warstwa klienta API](./api-client-layer.md).

## Uwierzytelnianie i bezpieczeństwo

```ts
export const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
export const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
export const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Analityka — PostHog

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

## Śledzenie błędów — Sentry

```ts
export const SENTRY_DSN = getNextPublicEnv('NEXT_PUBLIC_SENTRY_DSN');
export const SENTRY_ENABLE_DEV = getNextPublicEnv('SENTRY_ENABLE_DEV');
export const SENTRY_DEBUG = getNextPublicEnv('SENTRY_DEBUG');
export const SENTRY_ENABLED =
  SENTRY_DSN?.value && (SENTRY_ENABLE_DEV?.value === 'true' || clientEnv.isProduction);
```

## Śledzenie wyjątków — ujednolicone

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

## Stałe analityczne (`constants/analytics.ts`)

```ts
/** Cookie name for storing the anonymous viewer ID */
export const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age in seconds (365 days) */
export const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
```

Te stałe umożliwiają unikalne codzienne śledzenie wyświetleń bez konieczności uwierzytelniania.

## Stałe płatności (`constants/payment.ts`)

Ten plik jest celowo oddzielony od głównego `constants.ts`, aby można go było zaimportować w skryptach działających poza środowiskiem wykonawczym Next.js (migracje, nasiona itp.).

### Przepływ płatności

```ts
enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

### Stan płatności

```ts
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### Interwał płatności

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

### Plany płatności

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

### Metoda płatności

```ts
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### Waluta płatności

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

### Dostawca płatności

```ts
enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

### Stan przesłania

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

### Ceny reklam sponsorskich

```ts
const SponsorAdPricing = {
  WEEKLY: 100,  // $100.00
  MONTHLY: 300, // $300.00
} as const;
```

Są to domyślne wartości zastępcze. Wartości czasu pracy są kontrolowane przez system ustawień poprzez `getSponsorAdWeeklyPrice()` i `getSponsorAdMonthlyPrice()`.

## Importuj wzory

```ts
// Import from the main constants file
import { DEFAULT_LOCALE, LOCALES, PaymentPlan, SubmissionStatus } from '@/lib/constants';

// Import payment constants directly (for scripts outside Next.js)
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';

// Import analytics constants directly
import { VIEWER_COOKIE_NAME, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants/analytics';
```

## Powiązane pliki

- `lib/constants.ts` - Główny plik stałych z reeksportem
- `lib/constants/analytics.ts` - Stałe śledzenia przeglądarki
- `lib/constants/payment.ts` - Wyliczenia płatności i domyślne ceny
- `lib/config/` - Konfiguracja środowiska uruchomieniowego (oparta na środowisku)
