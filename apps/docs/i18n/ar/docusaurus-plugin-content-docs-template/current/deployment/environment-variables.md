---
id: environment-variables
title: متغيرات البيئة
sidebar_label: متغيرات البيئة
sidebar_position: 3
---

# متغيرات البيئة

يغطي هذا الدليل جميع متغيرات البيئة المطلوبة لتطبيق الويب الخاص بقالب Ever Works، بما في ذلك التحقق، والأمان، والتكوين لسيناريوهات النشر المختلفة.

## نظام التحقق

يتحقق التطبيق من متغيرات البيئة الضرورية عند بدء التشغيل من خلال `scripts/check-env.js`. غياب المتغيرات الحيوية سيتسبب في فشل بدء التشغيل مع رسالة خطأ واضحة.

## مرجع المتغيرات

### النواة (مطلوبة)

| المتغير | الوصف | مثال |
|---------|-------|------|
| `NODE_ENV` | بيئة التشغيل | `production` |
| `AUTH_SECRET` | مفتاح التوقيع/التشفير لـ NextAuth (32 حرفاً على الأقل) | `openssl rand -base64 32` |
| `DATABASE_URL` | سلسلة اتصال PostgreSQL | `postgresql://user:pass@host/db` |
| `DATA_REPOSITORY` | عنوان URL لمستودع المحتوى Git | `https://github.com/org/repo` |

### المصادقة

| المتغير | الوصف | المطلوب |
|---------|-------|---------|
| `AUTH_SECRET` | مفتاح توقيع رمز الجلسة | ✅ مطلوب |
| `AUTH_URL` | عنوان URL الكامل للإنتاج (اختياري على Vercel) | 🔄 اختياري |

### موفرو OAuth

| المتغير | الموفر | الوصف |
|---------|--------|-------|
| `AUTH_GITHUB_ID` | GitHub | معرف تطبيق OAuth |
| `AUTH_GITHUB_SECRET` | GitHub | مفتاح تطبيق OAuth السري |
| `AUTH_GOOGLE_ID` | Google | معرف OAuth |
| `AUTH_GOOGLE_SECRET` | Google | مفتاح OAuth السري |

### ملفات تعريف الارتباط

| المتغير | الوصف | الافتراضي |
|---------|-------|-----------|
| `COOKIE_SECRET` | مفتاح تشفير ملفات تعريف الارتباط | مطلوب |
| `COOKIE_DOMAIN` | نطاق نطاق ملف تعريف الارتباط | `localhost` |
| `COOKIE_SECURE` | ملفات تعريف ارتباط HTTPS فقط | `true` للإنتاج |

### قاعدة البيانات

| المتغير | الوصف | مثال |
|---------|-------|------|
| `DATABASE_URL` | اتصال PostgreSQL الرئيسي | `postgresql://...` |
| `DB_POOL_SIZE` | الحد الأقصى لحجم تجمع الاتصالات | `20` |

### البريد الإلكتروني

| المتغير | الوصف | مثال |
|---------|-------|------|
| `EMAIL_SERVER` | عنوان URL لـ SMTP | `smtp://user:pass@smtp.example.com:587` |
| `EMAIL_FROM` | عنوان المُرسِل | `noreply@yourdomain.com` |

تدعم الواجهة أيضاً متغيرات SMTP منفصلة (`EMAIL_SERVER_HOST`، `EMAIL_SERVER_PORT`، إلخ).

### الدفع – Stripe

| المتغير | الوصف |
|---------|-------|
| `STRIPE_SECRET_KEY` | المفتاح السري لـ Stripe (`sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | المفتاح العام لـ Stripe (`pk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | مفتاح توقيع Webhook (`whsec_...`) |

### الدفع – Lemon Squeezy

| المتغير | الوصف |
|---------|-------|
| `LEMONSQUEEZY_API_KEY` | مفتاح LemonSqueezy API |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | مفتاح توقيع Webhook |

### الدفع – Paddle

| المتغير | الوصف |
|---------|-------|
| `PADDLE_API_KEY` | مفتاح Paddle API |
| `PADDLE_WEBHOOK_SECRET` | مفتاح توقيع Webhook |

### التحليلات

| المتغير | الخدمة | الوصف |
|---------|--------|-------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | مفتاح API للمشروع |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog | عنوان URL للنموذج |
| `NEXT_PUBLIC_GA_ID` | Google Analytics | معرف GA4 |

### تتبع الأخطاء

| المتغير | الوصف |
|---------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | اسم مصدر بيانات Sentry |
| `SENTRY_AUTH_TOKEN` | رمز رفع Source Maps |
| `SENTRY_ORG` | slug منظمة Sentry |
| `SENTRY_PROJECT` | slug مشروع Sentry |

### النشرات البريدية

| المتغير | الخدمة | الوصف |
|---------|--------|-------|
| `MAILCHIMP_API_KEY` | Mailchimp | مفتاح API |
| `MAILCHIMP_LIST_ID` | Mailchimp | معرف قائمة الجمهور |
| `CONVERTKIT_API_KEY` | ConvertKit | مفتاح API |
| `RESEND_API_KEY` | Resend | مفتاح API |

### المهام الخلفية

| المتغير | الوصف |
|---------|-------|
| `CRON_SECRET` | التحقق من استدعاءات Vercel cron (32 حرفاً على الأقل) |
| `TRIGGER_SECRET_KEY` | مفتاح Trigger.dev (عند التعيين، يأخذ الأولوية على Vercel Crons) |

### المتغيرات العامة للعميل

المتغيرات التي تبدأ بـ `NEXT_PUBLIC_` مُدمَجة في كود العميل:

| المتغير | الوصف |
|---------|-------|
| `NEXT_PUBLIC_APP_URL` | عنوان URL للتطبيق في الإنتاج |
| `NEXT_PUBLIC_POSTHOG_KEY` | مفتاح PostHog للعميل |
| `NEXT_PUBLIC_POSTHOG_HOST` | عنوان URL لمضيف PostHog |
| `NEXT_PUBLIC_GA_ID` | معرف Google Analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (أخطاء العميل) |

**⚠️ تحذير:** لا تُعيّن مفاتيح حساسة (بيانات اعتماد قاعدة البيانات، المفاتيح الخاصة، إلخ) لأي متغير `NEXT_PUBLIC_`.

## كيفية الإعداد

### التطوير المحلي

أنشئ ملف `.env.local` في مجلد `apps/web/`:

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your values
```

### Vercel

**الطريقة الموصى بها:** استخدام لوحة تحكم Vercel

1. انتقل إلى **إعدادات المشروع** → **متغيرات البيئة**
2. أضف المتغيرات مع تحديد البيئة المستهدفة (الإنتاج، المعاينة، التطوير)
3. انشر — يتم تضمين المتغيرات تلقائياً في وقت البناء والتشغيل

**أو استخدم Vercel CLI:**

```bash
# Add a variable
vercel env add DATABASE_URL

# List all variables
vercel env ls

# Pull to local file
vercel env pull .env.local
```

## قائمة تحقق أمان الإنتاج

- [ ] `AUTH_SECRET` مُنشأ بشكل آمن وعشوائي (`openssl rand -base64 32`)
- [ ] `COOKIE_SECRET` مُنشأ بشكل آمن وعشوائي (`openssl rand -base64 32`)
- [ ] `CRON_SECRET` مُنشأ بشكل آمن وعشوائي (`openssl rand -base64 32`)
- [ ] `COOKIE_SECURE=true` (إلزامي للإنتاج)
- [ ] كلمة مرور قوية في سلسلة اتصال قاعدة البيانات
- [ ] استخدام `sk_live_...` وليس مفاتيح الاختبار في Stripe
- [ ] `SENTRY_AUTH_TOKEN` يمتلك الحد الأدنى من الصلاحيات اللازمة
- [ ] لا يتم الكشف عن قيم حساسة (كلمات مرور قاعدة البيانات، المفاتيح الخاصة، إلخ)
