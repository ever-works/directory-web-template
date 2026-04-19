---
id: constants-reference-module
title: Riferimento alle costanti
sidebar_label: Riferimento alle costanti
sidebar_position: 54
---

# Riferimento alle costanti

Il modulo delle costanti (`template/lib/constants.ts` e `template/lib/constants/`) centralizza tutti i valori di configurazione, le enumerazioni, le impostazioni guidate dall'ambiente e i numeri magici a livello di applicazione. Le costanti sono organizzate in file specifici del dominio per consentire importazioni sicure in contesti esterni al runtime Next.js (ad esempio, script di migrazione, script seed).

## Panoramica dell'architettura

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

## File di origine

|Archivio|Descrizione|
|------|-------------|
|`lib/constants.ts`|Barile delle costanti principali: importa da env-config e riesporta i sottomoduli|
|`lib/constants/payment.ts`|Enumerazioni e tipi di pagamento (sicuri per gli script)|
|`lib/constants/analytics.ts`|Costanti relative all'analisi|

## Costanti di localizzazione

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

## Marchio e interfaccia utente

```typescript
const LOGO_URL = '/logo-ever-work-3.png';
```

## API e back-end

```typescript
/** Base URL for internal Next.js API routes */
const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

## Autenticazione e sicurezza

```typescript
const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## Analisi – PostHog

|Costante|Fonte|Descrizione|
|----------|--------|-------------|
|`POSTHOG_KEY`|`NEXT_PUBLIC_POSTHOG_KEY`|Chiave API del progetto PostHog|
|`POSTHOG_HOST`|`NEXT_PUBLIC_POSTHOG_HOST`|Host dell'API PostHog|
|`POSTHOG_ENABLED`|Derivato|Vero quando esistono sia la chiave che l'host|
|`POSTHOG_DEBUG`|`POSTHOG_DEBUG`|Abilita la registrazione del debug|
|`POSTHOG_SESSION_RECORDING_ENABLED`|env / `'true'`|Attiva/disattiva la registrazione della sessione|
|`POSTHOG_AUTO_CAPTURE`|env / `'false'`|Acquisizione automatica delle visualizzazioni di pagina|
|`POSTHOG_SAMPLE_RATE`|Calcolato|`0.1` in produzione, `1.0` in sviluppo|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|Calcolato|`0.1` in produzione, `1.0` in sviluppo|

## Monitoraggio degli errori: sentinella

|Costante|Fonte|Descrizione|
|----------|--------|-------------|
|`SENTRY_DSN`|`NEXT_PUBLIC_SENTRY_DSN`|Nome origine dati sentinella|
|`SENTRY_ENABLE_DEV`|`SENTRY_ENABLE_DEV`|Abilita Sentry in fase di sviluppo|
|`SENTRY_DEBUG`|`SENTRY_DEBUG`|Modalità debug sentinella|
|`SENTRY_ENABLED`|Derivato|Vero quando il DSN è impostato e l'ambiente lo consente|

## Monitoraggio unificato delle eccezioni

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

## Costanti di pagamento (`constants/payment.ts`)

Questo file è intenzionalmente separato da `constants.ts` per evitare l'importazione di `@/lib/config`, consentendone l'uso nella migrazione e negli script seed eseguiti all'esterno di Next.js.

### Enumerazioni

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

### Pianificare i nomi visualizzati

```typescript
const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  free: 'Free Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
};
```

### Prezzi degli annunci degli sponsor

```typescript
const SponsorAdPricing = {
  WEEKLY: 100,    // $100.00
  MONTHLY: 300,   // $300.00
} as const;
```

## Costanti di analisi (`constants/analytics.ts`)

```typescript
/** Cookie name for anonymous viewer tracking */
const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age: 365 days in seconds */
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 31,536,000
```

## Importa modelli

### Codice dell'applicazione completo

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

### Script esterni al runtime Next.js

```typescript
// Import only from payment.ts to avoid Next.js dependencies
import { PaymentPlan, PaymentStatus, SubmissionStatus } from '@/lib/constants/payment';
```
