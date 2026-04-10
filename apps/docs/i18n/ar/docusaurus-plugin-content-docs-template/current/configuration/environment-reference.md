---
id: environment-reference
title: المرجع الكامل لمتغيرات البيئة
sidebar_label: مرجع البيئة
sidebar_position: 1
---

# المرجع الكامل لمتغيرات البيئة

توفر هذه الصفحة مرجعًا شاملًا لجميع متغيرات البيئة المستخدمة في قالب Ever Works. تُنظَّم المتغيرات حسب الفئة مع أنواعها وقيمها الافتراضية وما إذا كانت مطلوبة.

انسخ `.env.example` إلى `.env.local` واملأ القيم الخاصة بنشرك.

## المحتوى ومستودع البيانات

| المتغير | النوع | مطلوب | الافتراضي | الوصف |
|----------|------|----------|---------|-------------|
| `DATA_REPOSITORY` | string (URL) | **نعم** | -- | عنوان URL لمستودع Git لبيانات المحتوى |
| `GH_TOKEN` | string | لا | -- | رمز وصول شخصي لـ GitHub (للمستودعات الخاصة) |
| `GITHUB_TOKEN` | string | لا | -- | متغير رمز GitHub البديل |
| `GITHUB_BRANCH` | string | لا | `master` | فرع Git لاستنساخ المحتوى منه |

## قاعدة البيانات

| المتغير | النوع | مطلوب | الافتراضي | الوصف |
|----------|------|----------|---------|-------------|
| `DATABASE_URL` | string | موصى به | -- | سلسلة اتصال قاعدة البيانات (SQLite أو Postgres) |

عندما لا يكون `DATABASE_URL` مضبوطًا، تُعطَّل الميزات المعتمدة على قاعدة البيانات (التقييمات، التعليقات، المفضلات، الاستطلاعات، العناصر المميزة) تلقائيًا عبر نظام علامات الميزات.

## المصادقة

| المتغير | النوع | مطلوب | الافتراضي | الوصف |
|----------|------|----------|---------|-------------|
| `AUTH_SECRET` | string | **نعم** | -- | مفتاح سري لـ NextAuth (`openssl rand -base64 32`) |
| `COOKIE_SECRET` | string | **نعم** | -- | مفتاح تشفير ملفات تعريف الارتباط |
| `COOKIE_DOMAIN` | string | لا | -- | نطاق ملف تعريف الارتباط (مثلًا `localhost`) |
| `COOKIE_SECURE` | boolean | لا | `true` | علامة ملف تعريف الارتباط الآمن |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | string | لا | `15m` | مدة صلاحية رمز الوصول |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | string | لا | `7d` | مدة صلاحية رمز التحديث |

### موفرو OAuth

| المتغير | النوع | مطلوب | الوصف |
|----------|------|----------|-------------|
| `GOOGLE_CLIENT_ID` | string | لا | معرّف عميل Google OAuth |
| `GOOGLE_CLIENT_SECRET` | string | لا | سر عميل Google OAuth |
| `GITHUB_CLIENT_ID` | string | لا | معرّف عميل GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | string | لا | سر عميل GitHub OAuth |
| `MICROSOFT_CLIENT_ID` | string | لا | معرّف عميل Microsoft OAuth |
| `MICROSOFT_CLIENT_SECRET` | string | لا | سر عميل Microsoft OAuth |
| `FB_CLIENT_ID` | string | لا | معرّف عميل Facebook OAuth |
| `FB_CLIENT_SECRET` | string | لا | سر عميل Facebook OAuth |
| `X_CLIENT_ID` | string | لا | معرّف عميل X (Twitter) OAuth |
| `X_CLIENT_SECRET` | string | لا | سر عميل X (Twitter) OAuth |
| `LINKEDIN_CLIENT_ID` | string | لا | معرّف عميل LinkedIn OAuth |
| `LINKEDIN_CLIENT_SECRET` | string | لا | سر عميل LinkedIn OAuth |

تُفعَّل موفرو OAuth تلقائيًا عند ضبط كل من معرّف العميل والسر.

## الموقع والعلامة التجارية (آمن للعميل)

جميع متغيرات `NEXT_PUBLIC_*` متاحة للمتصفح.

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | string (URL) | `http://localhost:3000` | عنوان URL لتطبيق الدليل |
| `NEXT_PUBLIC_SITE_URL` | string (URL) | `https://ever.works` | عنوان URL للموقع العام للشركة |
| `NEXT_PUBLIC_API_BASE_URL` | string (URL) | `http://localhost:3000` | عنوان URL الأساسي لـ API |
| `NEXT_PUBLIC_SITE_NAME` | string | `Ever Works` | اسم الموقع للبيانات الوصفية |
| `NEXT_PUBLIC_SITE_TAGLINE` | string | `The Open-Source, AI-Powered Directory Builder` | شعار الموقع |
| `NEXT_PUBLIC_BRAND_NAME` | string | `Ever Works` | اسم العلامة التجارية لـ schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | string | (انظر .env.example) | وصف SEO (أقل من 160 حرفًا) |
| `NEXT_PUBLIC_SITE_KEYWORDS` | string (CSV) | `Ever Works,Directory Builder,...` | كلمات مفتاحية لـ SEO مفصولة بفواصل |
| `NEXT_PUBLIC_SITE_LOGO` | string | `/logo-ever-works.svg` | مسار الشعار (نسبي إلى /public) |

### تصميم صورة OG

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_OG_GRADIENT_START` | string (hex) | `#667eea` | لون بداية التدرج لصورة OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | string (hex) | `#764ba2` | لون نهاية التدرج لصورة OG |

### روابط وسائل التواصل الاجتماعي

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SOCIAL_GITHUB` | string (URL) | `https://github.com/ever-works` | رابط GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | string (URL) | `https://x.com/everplatform` | رابط X (Twitter) |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN` | string (URL) | (انظر .env.example) | رابط LinkedIn |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK` | string (URL) | (انظر .env.example) | رابط Facebook |
| `NEXT_PUBLIC_SOCIAL_BLOG` | string (URL) | `https://blog.ever.works` | رابط المدونة |
| `NEXT_PUBLIC_SOCIAL_EMAIL` | string | `ever@ever.works` | البريد الإلكتروني للتواصل |

### الإسناد

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_ATTRIBUTION_URL` | string (URL) | `https://ever.works` | عنوان URL لرابط "مُنشأ بواسطة" |
| `NEXT_PUBLIC_ATTRIBUTION_NAME` | string | `Ever Works` | نص رابط "مُنشأ بواسطة" |

## موفرو الدفع

### Stripe

| المتغير | النوع | مطلوب | الوصف |
|----------|------|----------|-------------|
| `STRIPE_SECRET_KEY` | string | لا | المفتاح السري لـ Stripe (للخادم فقط) |
| `STRIPE_PUBLISHABLE_KEY` | string | لا | المفتاح القابل للنشر لـ Stripe |
| `STRIPE_WEBHOOK_SECRET` | string | لا | سر توقيع webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | string | لا | المفتاح القابل للنشر الآمن للعميل |
| `NEXT_PUBLIC_STRIPE_DYNAMIC_PRICING` | boolean | لا | تحميل الأسعار من Stripe API |
| `NEXT_PUBLIC_STRIPE_PAYMENT_FORM_ENABLED` | boolean | لا | تفعيل الدفع عبر Stripe |

#### معرّفات أسعار Stripe متعددة العملات

للخطط Standard وPremium، يدعم القالب معرّفات أسعار خاصة بالعملة:

```
NEXT_PUBLIC_STRIPE_STANDARD_PRODUCT_ID=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_USD=
NEXT_PUBLIC_STRIPE_STANDARD_MONTHLY_PRICE_ID_EUR=
...
```

### LemonSqueezy

| المتغير | النوع | الوصف |
|----------|------|-------------|
| `LEMONSQUEEZY_API_KEY` | string | مفتاح API |
| `LEMONSQUEEZY_STORE_ID` | string | معرّف المتجر |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | string | سر webhook |
| `LEMONSQUEEZY_WEBHOOK_URL` | string | عنوان URL لنقطة نهاية webhook |
| `LEMONSQUEEZY_TEST_MODE` | boolean | تفعيل وضع الاختبار |
| `NEXT_PUBLIC_LEMONSQUEEZY_FREE_VARIANT_ID` | string | متغير الخطة المجانية |
| `NEXT_PUBLIC_LEMONSQUEEZY_STANDARD_VARIANT_ID` | string | متغير الخطة القياسية |
| `NEXT_PUBLIC_LEMONSQUEEZY_PREMIUM_VARIANT_ID` | string | متغير الخطة المميزة |
| `NEXT_PUBLIC_LEMONSQUEEZY_PAYMENT_FORM_ENABLED` | boolean | تفعيل الدفع |

### Polar

| المتغير | النوع | الوصف |
|----------|------|-------------|
| `POLAR_ACCESS_TOKEN` | string | رمز وصول |
| `POLAR_WEBHOOK_SECRET` | string | سر webhook |
| `POLAR_ORGANIZATION_ID` | string | معرّف المؤسسة |
| `POLAR_SANDBOX` | boolean | وضع الاختبار (الافتراضي: `true`) |
| `POLAR_API_URL` | string (URL) | عنوان URL مخصص لـ API |
| `NEXT_PUBLIC_POLAR_FREE_PLAN_ID` | string | معرّف الخطة المجانية |
| `NEXT_PUBLIC_POLAR_STANDARD_PLAN_ID` | string | معرّف الخطة القياسية |
| `NEXT_PUBLIC_POLAR_PREMIUM_PLAN_ID` | string | معرّف الخطة المميزة |
| `NEXT_PUBLIC_POLAR_PAYMENT_FORM_ENABLED` | boolean | تفعيل الدفع |

### Solidgate

| المتغير | النوع | الوصف |
|----------|------|-------------|
| `SOLIDGATE_API_KEY` | string | مفتاح API |
| `SOLIDGATE_SECRET_KEY` | string | المفتاح السري |
| `SOLIDGATE_WEBHOOK_SECRET` | string | سر webhook |
| `SOLIDGATE_MERCHANT_ID` | string | معرّف التاجر |
| `SOLIDGATE_API_BASE_URL` | string (URL) | عنوان URL الأساسي لـ API |
| `NEXT_PUBLIC_SOLIDGATE_PUBLISHABLE_KEY` | string | مفتاح آمن للعميل |

### تسعير المنتجات

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_PRODUCT_PRICE_FREE` | number | `0` | سعر الطبقة المجانية |
| `NEXT_PUBLIC_PRODUCT_PRICE_STANDARD` | number | `10` | سعر الطبقة القياسية |
| `NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM` | number | `20` | سعر الطبقة المميزة |
| `NEXT_PUBLIC_PREMIUM_TRIAL_AMOUNT_ID` | string | -- | معرّف مبلغ التجربة المميز |
| `NEXT_PUBLIC_STANDARD_TRIAL_AMOUNT_ID` | string | -- | معرّف مبلغ التجربة القياسي |
| `NEXT_PUBLIC_AUTHORIZED_TRIAL_AMOUNT` | boolean | `false` | تفعيل مبالغ التجربة |

## التحليلات والمراقبة

### PostHog

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | string | -- | مفتاح API لمشروع PostHog |
| `NEXT_PUBLIC_POSTHOG_HOST` | string (URL) | `https://us.i.posthog.com` | مضيف PostHog |
| `POSTHOG_DEBUG` | boolean | `false` | تفعيل تسجيل التصحيح |
| `POSTHOG_SESSION_RECORDING_ENABLED` | boolean | `true` | تسجيل الجلسات |
| `POSTHOG_AUTO_CAPTURE` | boolean | `false` | التقاط الأحداث تلقائيًا |
| `POSTHOG_PERSONAL_API_KEY` | string | -- | مفتاح API من جانب الخادم |
| `POSTHOG_PROJECT_ID` | string | -- | معرّف المشروع للتحليلات |
| `POSTHOG_EXCEPTION_TRACKING` | boolean | `true` | تتبع الاستثناءات |

### Sentry

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | string (URL) | -- | DSN لـ Sentry |
| `SENTRY_ORG` | string | `ever-co` | مؤسسة Sentry |
| `SENTRY_PROJECT` | string | `ever-works` | اسم مشروع Sentry |
| `SENTRY_AUTH_TOKEN` | string | -- | رمز مصادقة Sentry |
| `SENTRY_ENABLE_DEV` | boolean | `false` | التفعيل في وضع التطوير |
| `SENTRY_DEBUG` | boolean | `false` | وضع التصحيح |
| `SENTRY_EXCEPTION_TRACKING` | boolean | `true` | تتبع الاستثناءات |

### تحليلات أخرى

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `EXCEPTION_TRACKING_PROVIDER` | string | `posthog` | موفر الاستثناءات (`posthog` أو `sentry`) |
| `ANALYZE` | boolean | `true` | تفعيل تحليل الحزمة |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | string | -- | مفتاح موقع reCAPTCHA |
| `RECAPTCHA_SECRET_KEY` | string | -- | المفتاح السري لـ reCAPTCHA |
| `NEXT_PUBLIC_SPEED_INSIGHTS_ENABLED` | boolean | `false` | Vercel Speed Insights |
| `NEXT_PUBLIC_SPEED_INSIGHTS_SAMPLE_RATE` | number | `0.5` | معدل أخذ عينات Speed Insights |

## البريد الإلكتروني

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `EMAIL_PROVIDER` | string | `resend` | موفر البريد الإلكتروني (`resend` أو `novu`) |
| `EMAIL_FROM` | string | `info@ever.works` | عنوان المرسل للإشعارات |
| `EMAIL_SUPPORT` | string | `support@ever.works` | عنوان بريد الدعم الإلكتروني |
| `COMPANY_NAME` | string | `Ever Works` | اسم الشركة لقوالب البريد الإلكتروني |
| `RESEND_API_KEY` | string | -- | مفتاح API لـ Resend |
| `NOVU_API_KEY` | string | -- | مفتاح API لـ Novu |
| `SMTP_HOST` | string | -- | اسم مضيف خادم SMTP |
| `SMTP_PORT` | number | `587` | منفذ SMTP |
| `SMTP_USER` | string | -- | اسم مستخدم SMTP |
| `SMTP_PASSWORD` | string | -- | كلمة مرور SMTP |

## التكاملات

### Twenty CRM

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `TWENTY_CRM_BASE_URL` | string (URL) | -- | عنوان URL لمثيل Twenty CRM |
| `TWENTY_CRM_API_KEY` | string | -- | مفتاح API للمصادقة |
| `TWENTY_CRM_ENABLED` | boolean | `false` | تفعيل/تعطيل صريح |
| `TWENTY_CRM_SYNC_MODE` | string | `disabled` | وضع المزامنة (`disabled`, `platform`, `direct_crm`) |

### Trigger.dev (المهام الخلفية)

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `TRIGGER_DEV_ENABLED` | boolean | `false` | تفعيل Trigger.dev |
| `TRIGGER_DEV_API_KEY` | string | -- | مفتاح API |
| `TRIGGER_DEV_API_URL` | string (URL) | -- | عنوان URL مخصص لـ API |
| `TRIGGER_DEV_ENVIRONMENT` | string | `development` | البيئة (`development`, `staging`, `production`) |

### مهام Cron

| المتغير | النوع | الوصف |
|----------|------|-------------|
| `CRON_SECRET` | string | سر مصادقة نقاط نهاية cron |

### الخرائط والموقع

| المتغير | النوع | الوصف |
|----------|------|-------------|
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | string | رمز عام لـ Mapbox (`pk.*`) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | string | مفتاح Google Maps المقيد بالمتصفح |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` | string | معرّف خريطة Google Maps |

### API منصة Ever Works

| المتغير | النوع | الافتراضي | الوصف |
|----------|------|---------|-------------|
| `PLATFORM_API_URL` | string (URL) | `https://api.ever.works/api` | عنوان URL لـ API المنصة |
| `PLATFORM_API_SECRET_TOKEN` | string | -- | رمز مصادقة API المنصة |

## Vercel والنشر

| المتغير | النوع | الوصف |
|----------|------|-------------|
| `VERCEL_TOKEN` | string | رمز وصول شخصي لـ Vercel |
| `VERCEL_PROJECT_ID` | string | معرّف المشروع في Vercel |
