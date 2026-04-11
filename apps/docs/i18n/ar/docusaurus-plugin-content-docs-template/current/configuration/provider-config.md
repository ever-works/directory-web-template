---
id: provider-config
title: "تكوين مزودي الخدمة"
sidebar_label: "تكوين مزودي الخدمة"
sidebar_position: 4
---

# تكوين مزودي الخدمة

يستخدم القالب مفرداً مركزياً `ConfigService` لإدارة جميع مزودي الخدمات الخارجية. يتم تكوين كل مزود خدمة من خلال مخططات مُتحقق منها باستخدام Zod مع اكتشاف تلقائي للميزات -- يتم تمكين مزودي الخدمة عند وجود بيانات الاعتماد المطلوبة.

## هيكلية ConfigService

`ConfigService` في `lib/config/config-service.ts` هو مفرد للخادم فقط يتحقق من جميع متغيرات البيئة عند بدء التشغيل:

```ts
import { configService } from '@/lib/config';

// الوصول إلى أقسام التكوين
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogEnabled = configService.analytics.posthog.enabled;
```

الخدمة منظمة في ستة أقسام، كل منها له مخطط Zod خاص به:

| القسم | أسلوب الوصول | ملف المخطط |
|-------|-------------|-----------|
| Core | `configService.core` | `schemas/core.schema.ts` |
| Auth | `configService.auth` | `schemas/auth.schema.ts` |
| Email | `configService.email` | `schemas/email.schema.ts` |
| Payment | `configService.payment` | `schemas/payment.schema.ts` |
| Analytics | `configService.analytics` | `schemas/analytics.schema.ts` |
| Integrations | `configService.integrations` | `schemas/integrations.schema.ts` |

### الاستيرادات القابلة لـ Tree-Shaking

يمكن استيراد الأقسام الفردية مباشرةً للحصول على tree-shaking أفضل:

```ts
import { coreConfig, paymentConfig, analyticsConfig } from '@/lib/config';

const url = coreConfig.APP_URL;
const stripeKey = paymentConfig.stripe.publishableKey;
```

### التحقق عند بدء التشغيل

يتم التحقق من جميع التكوينات باستخدام Zod عند الاستيراد الأول. تُنشِّط القيم غير الصالحة معالجات `.catch()` الاحتياطية حيثما أمكن ذلك، بينما تُرمى الأخطاء غير القابلة للاسترداد حقاً عند بدء التشغيل:

```ts
const result = appConfigSchema.safeParse(rawConfig);
if (!result.success) {
  throw new Error(`[ConfigService] Configuration errors:\n${...}`);
}
```

## مزودو المصادقة

معرفون في `lib/config/schemas/auth.schema.ts`. يكتشف مزودو OAuth التمكين تلقائياً:

```ts
const oauthProviderSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.clientId && data.clientSecret),
}));
```

### مزودو OAuth المدعومون

| المزود | متغير Client ID | متغير Client Secret |
|--------|----------------|---------------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` |
| Facebook | `FB_CLIENT_ID` | `FB_CLIENT_SECRET` |
| Twitter/X | `X_CLIENT_ID` | `X_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` |

### خلفية مصادقة Supabase

```ts
const supabaseConfigSchema = z.object({
  url: z.string().url().optional(),
  anonKey: z.string().optional(),
}).transform((data) => ({
  ...data,
  enabled: Boolean(data.url && data.anonKey),
}));
```

| المتغير | الوصف |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | عنوان URL مشروع Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح Supabase المجهول |

### إعدادات المصادقة الإضافية

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `AUTH_SECRET` | -- | مطلوب لتوقيع الجلسة |
| `COOKIE_SECRET` | -- | سر تشفير ملفات تعريف الارتباط |
| `COOKIE_DOMAIN` | `'localhost'` | نطاق ملفات تعريف الارتباط |
| `COOKIE_SECURE` | `false` | ملفات تعريف الارتباط عبر HTTPS فقط |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `'15m'` | مدة صلاحية رمز الوصول |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `'7d'` | مدة صلاحية رمز التحديث |

## مزودو الدفع

معرفون في `lib/config/schemas/payment.schema.ts`. يتم تمكين كل مزود تلقائياً عند تعيين بيانات الاعتماد المطلوبة.

### Stripe

يتم تمكينه تلقائياً عند وجود `secretKey` و`publishableKey`:

| المتغير | الوصف |
|--------|-------|
| `STRIPE_SECRET_KEY` | المفتاح السري من جانب الخادم |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | المفتاح القابل للنشر من جانب العميل |
| `STRIPE_WEBHOOK_SECRET` | التحقق من توقيع Webhook |
| `NEXT_PUBLIC_STRIPE_FREE_PRICE` | معرف السعر للخطة المجانية |
| `NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID` | معرف السعر للخطة القياسية |
| `NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID` | معرف السعر للخطة المميزة |

### LemonSqueezy

يتم تمكينه تلقائياً عند وجود `apiKey` و`storeId`:

| المتغير | الوصف |
|--------|-------|
| `LEMONSQUEEZY_API_KEY` | مفتاح API |
| `LEMONSQUEEZY_STORE_ID` | معرف المتجر |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | سر Webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | عنوان URL لنقطة نهاية Webhook |
| `LEMONSQUEEZY_TEST_MODE` | تمكين وضع الاختبار (`'true'`/`'false'`) |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | معرف المتغير للخطة المجانية |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | معرف المتغير للخطة القياسية |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | معرف المتغير للخطة المميزة |

### Polar

يتم تمكينه تلقائياً عند وجود `accessToken` و`organizationId`:

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `POLAR_ACCESS_TOKEN` | -- | رمز الوصول إلى API |
| `POLAR_ORGANIZATION_ID` | -- | معرف المؤسسة |
| `POLAR_WEBHOOK_SECRET` | -- | سر Webhook |
| `POLAR_SANDBOX` | `true` | وضع الاختبار (اضبط `'false'` للإنتاج) |
| `POLAR_API_URL` | -- | عنوان URL مخصص لـ API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | -- | معرف الخطة للمستوى المجاني |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | -- | معرف الخطة للمستوى القياسي |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | -- | معرف الخطة للمستوى المميز |

### عرض أسعار المنتجات

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | `0` | سعر العرض للخطة المجانية |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | `10` | سعر العرض للخطة القياسية |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | `20` | سعر العرض للخطة المميزة |

## مزودو البريد الإلكتروني

معرفون في `lib/config/schemas/email.schema.ts`.

### SMTP

يتم تمكينه تلقائياً عند وجود `host` و`user` و`password` جميعاً:

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `SMTP_HOST` | -- | اسم مضيف خادم SMTP |
| `SMTP_PORT` | `587` | منفذ خادم SMTP |
| `SMTP_USER` | -- | اسم مستخدم مصادقة SMTP |
| `SMTP_PASSWORD` | -- | كلمة مرور مصادقة SMTP |

### Resend

يتم تمكينه تلقائياً عند وجود `apiKey`:

| المتغير | الوصف |
|--------|-------|
| `RESEND_API_KEY` | مفتاح API لـ Resend |

### Novu

يتم تمكينه تلقائياً عند وجود `apiKey`:

| المتغير | الوصف |
|--------|-------|
| `NOVU_API_KEY` | مفتاح API لـ Novu |

### إعدادات البريد الإلكتروني

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `COMPANY_NAME` | `'Ever Works'` | اسم الشركة في قوالب البريد الإلكتروني |
| `EMAIL_PROVIDER` | `'resend'` | مزود البريد الإلكتروني النشط (`'resend'`، `'novu'`) |
| `EMAIL_FROM` | -- | عنوان البريد الإلكتروني للمُرسِل |
| `EMAIL_SUPPORT` | -- | عنوان البريد الإلكتروني للدعم |

## مزودو التحليلات

معرفون في `lib/config/schemas/analytics.schema.ts`.

### PostHog

يتم تمكينه تلقائياً عند وجود `key`:

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | -- | مفتاح API مشروع PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | `'https://us.i.posthog.com'` | عنوان URL مضيف PostHog |
| `POSTHOG_DEBUG` | `false` | تمكين وضع التصحيح |
| `POSTHOG_SESSION_RECORDING_ENABLED` | `true` | تمكين تسجيل الجلسة |
| `POSTHOG_AUTO_CAPTURE` | `false` | التقاط الأحداث تلقائياً |
| `POSTHOG_EXCEPTION_TRACKING` | `true` | تتبع الاستثناءات |
| `POSTHOG_PERSONAL_API_KEY` | -- | مفتاح API الشخصي (لوحة الإدارة) |
| `POSTHOG_PROJECT_ID` | -- | معرف المشروع (لوحة الإدارة) |

### Sentry

يتم تمكينه تلقائياً عند وجود `dsn`:

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | -- | DSN لـ Sentry |
| `SENTRY_ORG` | -- | مُعرِّف منظمة Sentry |
| `SENTRY_PROJECT` | -- | اسم مشروع Sentry |
| `SENTRY_AUTH_TOKEN` | -- | رمز المصادقة لخرائط المصدر |
| `SENTRY_ENABLE_DEV` | `false` | التمكين في بيئة التطوير |
| `SENTRY_DEBUG` | `false` | وضع التصحيح |

### reCAPTCHA

يتم تمكينه تلقائياً عند وجود كل من `siteKey` و`secretKey`:

| المتغير | الوصف |
|--------|-------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | مفتاح الموقع من جانب العميل |
| `RECAPTCHA_SECRET_KEY` | المفتاح السري من جانب الخادم |

### Vercel Analytics

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | `false` | تمكين Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | `0.5` | معدل أخذ العينات (0--1) |

### مزود تتبع الاستثناءات

| المتغير | الافتراضي | الوصف |
|--------|-----------|-------|
| `EXCEPTION_TRACKING_PROVIDER` | `'posthog'` | `'posthog'` أو `'sentry'` أو `'none'` |

## التحقق من حالة مزود الخدمة

```ts
import { configService } from '@/lib/config';

// التحقق من تكوين Stripe
if (configService.payment.stripe.enabled) {
  // Stripe جاهز للاستخدام
}

// التحقق من توفر مزود بريد إلكتروني
const hasEmail = configService.email.resend.enabled
  || configService.email.novu.enabled
  || configService.email.smtp.enabled;

// سرد مزودي OAuth الممكَّنين
const oauthProviders = ['google', 'github', 'microsoft', 'facebook', 'twitter', 'linkedin']
  .filter(p => configService.auth[p].enabled);
```

## الملفات ذات الصلة

| المسار | الوصف |
|--------|-------|
| `lib/config/config-service.ts` | مفرد ConfigService |
| `lib/config/schemas/auth.schema.ts` | مخططات مزودي المصادقة |
| `lib/config/schemas/payment.schema.ts` | مخططات مزودي الدفع |
| `lib/config/schemas/email.schema.ts` | مخططات مزودي البريد الإلكتروني |
| `lib/config/schemas/analytics.schema.ts` | مخططات مزودي التحليلات |
| `lib/config/schemas/integrations.schema.ts` | مخططات مزودي التكاملات |
| `lib/config/schemas/core.schema.ts` | مخطط التكوين الأساسي |
| `lib/config/types.ts` | تعريفات النوع TypeScript |
| `lib/config/index.ts` | تصدير Barrel |
| `.env.example` | مرجع كامل لمتغيرات البيئة |
