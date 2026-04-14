---
id: constants-reference-module
title: Справочник констант
sidebar_label: Справочник констант
sidebar_position: 54
---

# Справочник констант

Модуль констант (`template/lib/constants.ts` и `template/lib/constants/`) централизует все значения конфигурации всего приложения, перечисления, параметры среды и магические числа. Константы организованы в файлы, специфичные для домена, чтобы обеспечить безопасный импорт в контекстах вне среды выполнения Next.js (например, сценарии миграции, начальные сценарии).

## Обзор архитектуры

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

## Исходные файлы

|Файл|Описание|
|------|-------------|
|`lib/constants.ts`|Основная константа — импорт из env-config и реэкспорт подмодулей.|
|`lib/constants/payment.ts`|Перечисления и типы платежей (безопасно для скриптов)|
|`lib/constants/analytics.ts`|Константы, связанные с аналитикой|

## Константы локализации

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

## Брендинг и пользовательский интерфейс

```typescript
const LOGO_URL = '/logo-ever-work-3.png';
```

## API и бэкэнд

```typescript
/** Base URL for internal Next.js API routes */
const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

## Аутентификация и безопасность

```typescript
const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Аналитика – PostHog

|Константа|Источник|Описание|
|----------|--------|-------------|
|`POSTHOG_KEY`|`NEXT_PUBLIC_POSTHOG_KEY`|Ключ API проекта PostHog|
|`POSTHOG_HOST`|`NEXT_PUBLIC_POSTHOG_HOST`|Хост API PostHog|
|`POSTHOG_ENABLED`|Производный|Истинно, когда существуют и ключ, и хост.|
|`POSTHOG_DEBUG`|`POSTHOG_DEBUG`|Включить ведение журнала отладки|
|`POSTHOG_SESSION_RECORDING_ENABLED`|окр / `'true'`|Переключатель записи сеанса|
|`POSTHOG_AUTO_CAPTURE`|окр / `'false'`|Автоматический захват просмотров страниц|
|`POSTHOG_SAMPLE_RATE`|Вычисленный|`0.1` в производстве, `1.0` в разработке|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Вычисленный|`0.1` в производстве, `1.0` в разработке|

## Отслеживание ошибок — Sentry

|Константа|Источник|Описание|
|----------|--------|-------------|
|`SENTRY_DSN`|`NEXT_PUBLIC_SENTRY_DSN`|Имя источника данных Sentry|
|`SENTRY_ENABLE_DEV`|`SENTRY_ENABLE_DEV`|Включить Sentry в разработке|
|`SENTRY_DEBUG`|`SENTRY_DEBUG`|Режим отладки Sentry|
|`SENTRY_ENABLED`|Производный|Истинно, если установлен DSN и среда позволяет|

## Единое отслеживание исключений

```typescript
const EXCEPTION_TRACKING_PROVIDER = getNextPublicEnv('EXCEPTION_TRACKING_PROVIDER', 'both');
const POSTHOG_EXCEPTION_TRACKING = getNextPublicEnv('POSTHOG_EXCEPTION_TRACKING', 'true');
const SENTRY_EXCEPTION_TRACKING = getNextPublicEnv('SENTRY_EXCEPTION_TRACKING', 'true');

type ExceptionTrackingProvider = 'sentry' | 'posthog' | 'both' | 'none';
```

## РеКАПЧА

```typescript
const RECAPTCHA_SITE_KEY = getNextPublicEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
const RECAPTCHA_SECRET_KEY = getNextPublicEnv('RECAPTCHA_SECRET_KEY');
```

## Платежные константы (`constants/payment.ts`)

Этот файл намеренно отделен от `constants.ts`, чтобы избежать импорта `@/lib/config`, что позволяет использовать его в сценариях миграции и начального заполнения, которые выполняются вне Next.js.

### Перечисления

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

### Отображаемые имена плана

```typescript
const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  free: 'Free Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
};
```

### Цены на спонсорскую рекламу

```typescript
const SponsorAdPricing = {
  WEEKLY: 100,    // $100.00
  MONTHLY: 300,   // $300.00
} as const;
```

## Аналитические константы (`constants/analytics.ts`)

```typescript
/** Cookie name for anonymous viewer tracking */
const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age: 365 days in seconds */
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 31,536,000
```

## Импорт шаблонов

### Полный код приложения

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

### Скрипты вне среды выполнения Next.js

```typescript
// Import only from payment.ts to avoid Next.js dependencies
import { PaymentPlan, PaymentStatus, SubmissionStatus } from '@/lib/constants/payment';
```
