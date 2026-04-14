---
id: constants-reference
title: مرجع الثوابت
sidebar_label: مرجع الثوابت
sidebar_position: 31
---

# مرجع الثوابت

يتم تنظيم الثوابت على مستوى التطبيق عبر عدة ملفات ضمن `lib/constants/` والجذر `lib/constants.ts`. توثق هذه الصفحة كل ثابت تم تصديره مجمعًا حسب المجال.

## هيكل الملف

```
lib/
  constants.ts              # Main constants file (localization, branding, API, auth, analytics)
  constants/
    analytics.ts            # Viewer tracking constants
    payment.ts              # Payment enums, plan names, pricing
```

يقوم الجذر `constants.ts` بإعادة تصدير القيم من ملفات الدليل الفرعي للتوافق مع الإصدارات السابقة.

## التعريب

محدد في `lib/constants.ts`.

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

يقوم `LOCALES` بتشغيل إنشاء المسار وتكوين i18n وإنشاء علامة hreflang عبر القالب.

## العلامة التجارية وواجهة المستخدم

```ts
export const LOGO_URL = '/logo-ever-work-3.png';
```

## واجهة برمجة التطبيقات والواجهة الخلفية

```ts
// Base URL for internal website API (Next.js API routes)
export const API_BASE_URL = getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL');
```

بالنسبة لواجهة برمجة تطبيقات Ever Works Platform، استخدم متغيرات البيئة `PLATFORM_API_URL` و`PLATFORM_API_SECRET_TOKEN` بدلاً من ذلك. راجع وثائق [API Client Layer](./api-client-layer.md).

## المصادقة والأمن

```ts
export const COOKIE_SECRET = getNextPublicEnv('COOKIE_SECRET');
export const JWT_ACCESS_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_ACCESS_TOKEN_EXPIRES_IN');
export const JWT_REFRESH_TOKEN_EXPIRES_IN = getNextPublicEnv('JWT_REFRESH_TOKEN_EXPIRES_IN');
```

## التحليلات - PostHog

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

## تتبع الأخطاء - الحراسة

```ts
export const SENTRY_DSN = getNextPublicEnv('NEXT_PUBLIC_SENTRY_DSN');
export const SENTRY_ENABLE_DEV = getNextPublicEnv('SENTRY_ENABLE_DEV');
export const SENTRY_DEBUG = getNextPublicEnv('SENTRY_DEBUG');
export const SENTRY_ENABLED =
  SENTRY_DSN?.value && (SENTRY_ENABLE_DEV?.value === 'true' || clientEnv.isProduction);
```

## تتبع الاستثناء - موحد

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

## اختبار كابتشا

```ts
export const RECAPTCHA_SITE_KEY = getNextPublicEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
export const RECAPTCHA_SECRET_KEY = getNextPublicEnv('RECAPTCHA_SECRET_KEY');
```

## ثوابت التحليلات (`constants/analytics.ts`)

```ts
/** Cookie name for storing the anonymous viewer ID */
export const VIEWER_COOKIE_NAME = 'ever_viewer_id';

/** Cookie max age in seconds (365 days) */
export const VIEWER_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
```

تؤدي هذه الثوابت إلى تتبع العرض اليومي الفريد دون الحاجة إلى المصادقة.

## ثوابت الدفع (`constants/payment.ts`)

تم فصل هذا الملف عمدًا عن `constants.ts` الرئيسي بحيث يمكن استيراده في نصوص برمجية تعمل خارج وقت تشغيل Next.js (عمليات الترحيل والبذور وما إلى ذلك).

### تدفق الدفع

```ts
enum PaymentFlow {
  PAY_AT_START = 'pay_at_start',
  PAY_AT_END = 'pay_at_end',
}
```

### حالة الدفع

```ts
enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}
```

### الفاصل الزمني للدفع

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

### خطط الدفع

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

### طريقة الدفع

```ts
enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  PAYPAL = 'paypal',
}
```

### عملة الدفع

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

### مزود الدفع

```ts
enum PaymentProvider {
  STRIPE = 'stripe',
  SOLIDGATE = 'solidgate',
  LEMONSQUEEZY = 'lemonsqueezy',
  POLAR = 'polar',
}
```

### حالة التقديم

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

### تسعير إعلانات الراعي

```ts
const SponsorAdPricing = {
  WEEKLY: 100,  // $100.00
  MONTHLY: 300, // $300.00
} as const;
```

هذه هي القيم الاحتياطية الافتراضية. يتم التحكم في قيم وقت التشغيل بواسطة نظام الإعدادات عبر `getSponsorAdWeeklyPrice()` و`getSponsorAdMonthlyPrice()`.

## أنماط الاستيراد

```ts
// Import from the main constants file
import { DEFAULT_LOCALE, LOCALES, PaymentPlan, SubmissionStatus } from '@/lib/constants';

// Import payment constants directly (for scripts outside Next.js)
import { PaymentPlan, PaymentProvider } from '@/lib/constants/payment';

// Import analytics constants directly
import { VIEWER_COOKIE_NAME, VIEWER_COOKIE_MAX_AGE } from '@/lib/constants/analytics';
```

## الملفات ذات الصلة

- `lib/constants.ts` - ملف الثوابت الرئيسية مع إعادة التصدير
- `lib/constants/analytics.ts` - ثوابت تتبع المشاهد
- `lib/constants/payment.ts` - تعدادات الدفع والتسعير الافتراضي
- `lib/config/` - تكوين وقت التشغيل (على أساس البيئة)
