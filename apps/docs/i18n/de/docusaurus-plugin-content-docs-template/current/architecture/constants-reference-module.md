---
id: constants-reference-module
title: Konstantenreferenz
sidebar_label: Konstantenreferenz
sidebar_position: 54
---

# Konstantenreferenz

Das Konstantenmodul (`template/lib/constants.ts` und `template/lib/constants/`) zentralisiert alle anwendungsweiten Konfigurationswerte, Aufzählungen, umgebungsgesteuerten Einstellungen und magischen Zahlen. Konstanten sind in domänenspezifischen Dateien organisiert, um sichere Importe in Kontexten außerhalb der Next.js-Laufzeit zu ermöglichen (z. B. Migrationsskripts, Seed-Skripts).

## Architekturübersicht

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

## Quelldateien

|Datei|Beschreibung|
|------|-------------|
|`lib/constants.ts`|Hauptkonstanten Barrel – importiert aus env-config und exportiert Untermodule erneut|
|`lib/constants/payment.ts`|Zahlungsaufzählungen und -typen (sicher für Skripte)|
|`lib/constants/analytics.ts`|Analysebezogene Konstanten|

## Lokalisierungskonstanten

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

## Branding und Benutzeroberfläche

```typescript
const LOGO_URL = '/logo-ever-work-3.png';
```

## API und Backend

```typescript
/** Base URL for internal Next.js API routes */
const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

## Authentifizierung und Sicherheit

```typescript
const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Analytik – PostHog

|Konstant|Quelle|Beschreibung|
|----------|--------|-------------|
|`POSTHOG_KEY`|`NEXT_PUBLIC_POSTHOG_KEY`|API-Schlüssel des PostHog-Projekts|
|`POSTHOG_HOST`|`NEXT_PUBLIC_POSTHOG_HOST`|PostHog-API-Host|
|`POSTHOG_ENABLED`|Abgeleitet|True, wenn sowohl Schlüssel als auch Host vorhanden sind|
|`POSTHOG_DEBUG`|`POSTHOG_DEBUG`|Aktivieren Sie die Debug-Protokollierung|
|`POSTHOG_SESSION_RECORDING_ENABLED`|env / `'true'`|Sitzungsaufzeichnung umschalten|
|`POSTHOG_AUTO_CAPTURE`|env / `'false'`|Seitenaufrufe automatisch erfassen|
|`POSTHOG_SAMPLE_RATE`|Berechnet|`0.1` in der Produktion, `1.0` in der Entwicklung|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Berechnet|`0.1` in der Produktion, `1.0` in der Entwicklung|

## Fehlerverfolgung – Sentry

|Konstant|Quelle|Beschreibung|
|----------|--------|-------------|
|`SENTRY_DSN`|`NEXT_PUBLIC_SENTRY_DSN`|Name der Sentry-Datenquelle|
|`SENTRY_ENABLE_DEV`|`SENTRY_ENABLE_DEV`|Aktivieren Sie Sentry in der Entwicklung|
|`SENTRY_DEBUG`|`SENTRY_DEBUG`|Sentry-Debug-Modus|
|`SENTRY_ENABLED`|Abgeleitet|True, wenn DSN festgelegt ist und die Umgebung dies zulässt|

## Einheitliche Ausnahmeverfolgung

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

## Zahlungskonstanten (`constants/payment.ts`)

Diese Datei ist absichtlich von `constants.ts` getrennt, um den Import von `@/lib/config` zu vermeiden und die Verwendung in Migrations- und Seed-Skripten zu ermöglichen, die außerhalb von Next.js ausgeführt werden.

### Aufzählungen

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

### Anzeigenamen planen

```typescript
const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  free: 'Free Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
};
```

### Preise für Sponsor-Anzeigen

```typescript
const SponsorAdPricing = {
  WEEKLY: 100,    // $100.00
  MONTHLY: 300,   // $300.00
} as const;
```

## Analytics-Konstanten (`constants/analytics.ts`)

```typescript
/** Cookie name for anonymous viewer tracking */
const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age: 365 days in seconds */
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 31,536,000
```

## Muster importieren

### Vollständiger Anwendungscode

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

### Skripte außerhalb der Next.js-Laufzeit

```typescript
// Import only from payment.ts to avoid Next.js dependencies
import { PaymentPlan, PaymentStatus, SubmissionStatus } from '@/lib/constants/payment';
```
