---
id: constants-reference-module
title: Справочник на константите
sidebar_label: Справочник на константите
sidebar_position: 54
---

# Справочник на константите

Модулът за константи (`template/lib/constants.ts` и `template/lib/constants/`) централизира всички конфигурационни стойности за цялото приложение, enums, управлявани от средата настройки и магически числа. Константите са организирани в специфични за домейна файлове, за да позволят безопасно импортиране в контексти извън времето за изпълнение на Next.js (напр. скриптове за миграция, начални скриптове).

## Преглед на архитектурата

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

## Изходни файлове

|Файл|Описание|
|------|-------------|
|`lib/constants.ts`|Основни константи - импортира от env-config и реекспортира подмодули|
|`lib/constants/payment.ts`|Изброявания и видове плащания (безопасни за скриптове)|
|`lib/constants/analytics.ts`|Константи, свързани с анализа|

## Локализационни константи

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

## Брандиране и потребителски интерфейс

```typescript
const LOGO_URL = '/logo-ever-work-3.png';
```

## API и бекенд

```typescript
/** Base URL for internal Next.js API routes */
const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

## Удостоверяване и сигурност

```typescript
const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Анализ -- PostHog

|Константа|Източник|Описание|
|----------|--------|-------------|
|`POSTHOG_KEY`|`NEXT_PUBLIC_POSTHOG_KEY`|API ключ на проект PostHog|
|`POSTHOG_HOST`|`NEXT_PUBLIC_POSTHOG_HOST`|PostHog API хост|
|`POSTHOG_ENABLED`|Изведено|Вярно, когато съществуват и ключ, и хост|
|`POSTHOG_DEBUG`|`POSTHOG_DEBUG`|Активиране на регистрирането на грешки|
|`POSTHOG_SESSION_RECORDING_ENABLED`|env / `'true'`|Превключване на запис на сесия|
|`POSTHOG_AUTO_CAPTURE`|env / `'false'`|Автоматично заснемане на изгледи на страници|
|`POSTHOG_SAMPLE_RATE`|Изчислено|`0.1` в производство, `1.0` в процес на разработка|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Изчислено|`0.1` в производство, `1.0` в процес на разработка|

## Проследяване на грешки -- Sentry

|Константа|Източник|Описание|
|----------|--------|-------------|
|`SENTRY_DSN`|`NEXT_PUBLIC_SENTRY_DSN`|Име на източника на данни на Sentry|
|`SENTRY_ENABLE_DEV`|`SENTRY_ENABLE_DEV`|Активирайте Sentry в процес на разработка|
|`SENTRY_DEBUG`|`SENTRY_DEBUG`|Режим за отстраняване на грешки на Sentry|
|`SENTRY_ENABLED`|Изведено|Вярно, когато DSN е зададен и средата позволява|

## Унифицирано проследяване на изключения

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

## Константи на плащане (`constants/payment.ts`)

Този файл е умишлено отделен от `constants.ts`, за да се избегне импортирането на `@/lib/config`, което позволява използването при мигриране и начални скриптове, които се изпълняват извън Next.js.

### Енуми

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

### Екранни имена на планове

```typescript
const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  free: 'Free Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
};
```

### Рекламно ценообразуване на спонсори

```typescript
const SponsorAdPricing = {
  WEEKLY: 100,    // $100.00
  MONTHLY: 300,   // $300.00
} as const;
```

## Константи на анализ (`constants/analytics.ts`)

```typescript
/** Cookie name for anonymous viewer tracking */
const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age: 365 days in seconds */
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 31,536,000
```

## Импортиране на модели

### Пълен код на приложението

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

### Скриптове извън Next.js Runtime

```typescript
// Import only from payment.ts to avoid Next.js dependencies
import { PaymentPlan, PaymentStatus, SubmissionStatus } from '@/lib/constants/payment';
```
