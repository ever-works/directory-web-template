---
id: constants-reference-module
title: הפניה קבועה
sidebar_label: הפניה קבועה
sidebar_position: 54
---

# הפניה קבועה

מודול הקבועים (`template/lib/constants.ts` ו-`template/lib/constants/`) מרכז את כל ערכי התצורה של כל היישום, רשימות, הגדרות מונעות סביבה ומספרי קסם. הקבועים מאורגנים לתוך קבצים ספציפיים לדומיין כדי לאפשר ייבוא ​​בטוח בהקשרים מחוץ לזמן הריצה של Next.js (למשל, סקריפטים להעברה, סקריפטים ראשוניים).

## סקירה כללית של אדריכלות

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

## קבצי מקור

|קובץ|תיאור|
|------|-------------|
|`lib/constants.ts`|קנה קבועים עיקריים -- יבוא מתת-מודולי env-config וייצוא מחדש|
|`lib/constants/payment.ts`|רשימות וסוגי תשלום (בטוח לתסריטים)|
|`lib/constants/analytics.ts`|קבועים הקשורים לניתוח|

## קבועי לוקליזציה

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

## מיתוג וממשק משתמש

```typescript
const LOGO_URL = '/logo-ever-work-3.png';
```

## API ו-Backend

```typescript
/** Base URL for internal Next.js API routes */
const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

## אימות ואבטחה

```typescript
const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## אנליטיקס -- PostHog

|קבוע|מקור|תיאור|
|----------|--------|-------------|
|`POSTHOG_KEY`|`NEXT_PUBLIC_POSTHOG_KEY`|מפתח API של פרויקט PostHog|
|`POSTHOG_HOST`|`NEXT_PUBLIC_POSTHOG_HOST`|מארח PostHog API|
|`POSTHOG_ENABLED`|נגזרת|נכון כאשר קיימים גם מפתח וגם מארח|
|`POSTHOG_DEBUG`|`POSTHOG_DEBUG`|אפשר רישום באגים|
|`POSTHOG_SESSION_RECORDING_ENABLED`|env / `'true'`|החלפת מצב הקלטת הפעלה|
|`POSTHOG_AUTO_CAPTURE`|env / `'false'`|לכידה אוטומטית של תצוגות עמוד|
|`POSTHOG_SAMPLE_RATE`|מחושבים|`0.1` בייצור, `1.0` בפיתוח|
|`POSTHOG_SESSION_RECORDING_SAMPLE_RATE`|מחושבים|`0.1` בייצור, `1.0` בפיתוח|

## מעקב אחר שגיאות -- זקיף

|קבוע|מקור|תיאור|
|----------|--------|-------------|
|`SENTRY_DSN`|`NEXT_PUBLIC_SENTRY_DSN`|שם מקור הנתונים של זקיף|
|`SENTRY_ENABLE_DEV`|`SENTRY_ENABLE_DEV`|אפשר את Sentry בפיתוח|
|`SENTRY_DEBUG`|`SENTRY_DEBUG`|מצב ניפוי באגים של Sentry|
|`SENTRY_ENABLED`|נגזרת|נכון כאשר DSN מוגדר והסביבה מאפשרת|

## מעקב חריגים מאוחד

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

## קבועי תשלום (`constants/payment.ts`)

קובץ זה מופרד בכוונה מ-`constants.ts` כדי למנוע ייבוא של `@/lib/config`, מה שמאפשר שימוש בהעברת סקריפטים ו-Seed הפועלים מחוץ ל-Next.js.

### תקצירים

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

### תוכנית שמות תצוגה

```typescript
const PAYMENT_PLAN_NAMES: Record<PaymentPlan, string> = {
  free: 'Free Plan',
  standard: 'Standard Plan',
  premium: 'Premium Plan',
};
```

### תמחור מודעות חסות

```typescript
const SponsorAdPricing = {
  WEEKLY: 100,    // $100.00
  MONTHLY: 300,   // $300.00
} as const;
```

## קבועי אנליטיקה (`constants/analytics.ts`)

```typescript
/** Cookie name for anonymous viewer tracking */
const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age: 365 days in seconds */
const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;  // 31,536,000
```

## ייבוא דפוסים

### קוד יישום מלא

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

### סקריפטים מחוץ ל- Next.js Runtime

```typescript
// Import only from payment.ts to avoid Next.js dependencies
import { PaymentPlan, PaymentStatus, SubmissionStatus } from '@/lib/constants/payment';
```
