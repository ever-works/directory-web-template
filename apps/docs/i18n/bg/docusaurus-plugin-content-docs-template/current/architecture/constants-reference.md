---
id: constants-reference
title: Справочник на константите
sidebar_label: Справочник на константите
sidebar_position: 31
---

# Справочник на константите

Константите за цялото приложение са организирани в няколко файла под `lib/constants/` и корен `lib/constants.ts`. Тази страница документира всяка експортирана константа, групирана по домейн.

## Файлова структура

```
lib/
  constants.ts              # Main constants file (localization, branding, API, auth, analytics)
  constants/
    analytics.ts            # Viewer tracking constants
    payment.ts              # Payment enums, plan names, pricing
```

Коренът `constants.ts` реекспортира стойности от файловете на поддиректорията за обратна съвместимост.

## Локализация

Дефинирано в `lib/constants.ts`.

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

Кортежът `LOCALES` управлява генерирането на маршрут, конфигурацията на i18n и генерирането на тагове hreflang в шаблона.

## Брандиране и потребителски интерфейс

```ts
export const LOGO_URL = '/logo-ever-work-3.png';
```

## API и бекенд

```ts
// Base URL for internal website API (Next.js API routes)
export const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

За API на Ever Works Platform вместо това използвайте променливите на средата `PLATFORM_API_URL` и `PLATFORM_API_SECRET_TOKEN`. Вижте документацията [API Client Layer](./api-client-layer.md).

## Удостоверяване и сигурност

```ts
export const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
export const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
export const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Анализ - PostHog

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

## Проследяване на грешки - Sentry

```ts
export const SENTRY_DSN = getNextPublicEnv('NEXT_PUBLIC_SENTRY_DSN');
export const SENTRY_ENABLE_DEV = getNextPublicEnv('SENTRY_ENABLE_DEV');
export const SENTRY_DEBUG = getNextPublicEnv('SENTRY_DEBUG');
export const SENTRY_ENABLED =
  SENTRY_DSN?.value && (SENTRY_ENABLE_DEV?.value === 'true' || clientEnv.isProduction);
```

## Проследяване на изключения – унифицирано

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

## Константи на анализ (`constants/analytics.ts`)

```ts
/** Cookie name for storing the anonymous viewer ID */
export const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age in seconds (365 days) */
export const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
```

Тези константи управляват уникално ежедневно проследяване на изгледи, без да се изисква удостоверяване.

## Константи на плащане (`constants/payment.ts`)

Този файл е умишлено отделен от главния `constants.ts`, така че може да бъде импортиран в скриптове, които се изпълняват извън средата за изпълнение на Next.js (миграции, начални етапи и т.н.).

### Поток на плащане

```ts
enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

### Състояние на плащането

```ts
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### Интервал на плащане

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

### Планове за плащане

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

### Начин на плащане

```ts
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### Валута на плащане

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

### Доставчик на плащания

```ts
enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

### Статус на изпращане

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

### Рекламно ценообразуване на спонсори

```ts
const SponsorAdPricing = {
  WEEKLY: 100,  // $100.00
  MONTHLY: 300, // $300.00
} as const;
```

Това са резервни стойности по подразбиране. Стойностите по време на работа се контролират от системата за настройки чрез `getSponsorAdWeeklyPrice()` и `getSponsorAdMonthlyPrice()`.

## Импортиране на модели

```ts
// Import from the main constants file
import { DEFAULT_LOCALE, LOCALES, PaymentPlan, SubmissionStatus } from '@/lib/constants';

// Import payment constants directly (for scripts outside Next.js)
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';

// Import analytics constants directly
import { VIEWER_COOKIE_NAME, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants/analytics';
```

## Свързани файлове

- `lib/constants.ts` - Главен файл с константи с реекспорт
- `lib/constants/analytics.ts` - Константи за проследяване на зрителя
- `lib/constants/payment.ts` - Изброяване на плащанията и стойности по подразбиране
- `lib/config/` - Конфигурация по време на изпълнение (базирана на среда)
