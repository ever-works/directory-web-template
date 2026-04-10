---
id: config-system
title: نظام التكوين
sidebar_label: نظام التكوين
sidebar_position: 0
---

# نظام التكوين

يستخدم قالب Ever Works نظام تكوين مركزياً وآمناً من حيث الأنواع، مبنياً على مخططات التحقق من صحة Zod. يتم التحقق من صحة جميع متغيرات البيئة عند بدء تشغيل التطبيق، مما يوفر ردود فعل فورية حول التكوين المفقود أو غير الصالح. يدعم النظام كلاً من الأسرار الخاصة بالخادم فقط والمتغيرات العامة الآمنة للعميل.

## البنية المعمارية

```
lib/config/
  config-service.ts        # نسخة ConfigService المفردة المركزية
  client.ts                # التكوين الآمن للعميل (NEXT_PUBLIC_*)
  env.ts                   # مخطط env القديم (تكوين API)
  server-config.ts         # مساعدات الخادم المهملة (استخدم ConfigService)
  feature-flags.ts         # علامات توفر الميزات
  index.ts                 # تصدير البرميل
  types.ts                 # تعريفات أنواع TypeScript
  schemas/
    index.ts               # تصدير برميل المخططات
    core.schema.ts         # روابط URL ومعلومات الموقع وقاعدة البيانات والمحتوى
    auth.schema.ts         # أسرار المصادقة وموفرو OAuth وJWT والكوكيز
    email.schema.ts        # تكوين SMTP وResend وNovu
    payment.schema.ts      # Stripe وLemonSqueezy وPolar والتسعير
    analytics.schema.ts    # PostHog وSentry وVercel Analytics وRecaptcha
    integrations.schema.ts # Trigger.dev وTwenty CRM وCron
  billing/
    index.ts               # برميل تكوين الفوترة
    stripe.config.ts       # تكوين Stripe المحدد
    lemonsqueezy.config.ts # تكوين LemonSqueezy
    polar.config.ts        # تكوين Polar
    solidgate.config.ts    # تكوين Solidgate
    types.ts               # أنواع الفوترة
  utils/
    env-parser.ts          # أدوات تحليل متغيرات البيئة
    validation-logger.ts   # تنسيق نتائج التحقق من الصحة وتسجيلها
```

## نسخة ConfigService المفردة

جوهر نظام التكوين هو فئة `ConfigService` في `lib/config/config-service.ts`. تقوم بـ:

1. جمع جميع متغيرات البيئة من خلال دوال الجمع
2. التحقق من صحتها مقابل مخطط Zod مدمج
3. تخزين التكوين المتحقق منه كنسخة مفردة
4. توفير getter مكتوب الأنواع لكل قسم تكوين

```typescript
import { configService } from '@/lib/config';

// الوصول إلى أقسام محددة
const appUrl = configService.core.APP_URL;
const stripeEnabled = configService.payment.stripe.enabled;
const posthogKey = configService.analytics.posthog.key;
const crmMode = configService.integrations.twentyCrm.syncMode;
```

### تصديرات الأقسام

للـ tree-shaking والراحة، يتم تصدير الأقسام الفردية مباشرةً أيضاً:

```typescript
import {
  coreConfig,
  authConfig,
  emailConfig,
  paymentConfig,
  analyticsConfig,
  integrationsConfig,
} from '@/lib/config/config-service';

// الوصول المباشر بدون بادئة ConfigService
const dbUrl = coreConfig.DATABASE_URL;
```

### التطبيق على الخادم فقط

تستورد وحدة `ConfigService` `'server-only'`، مما يعني:

- يمكن استخدامها فقط في مكونات الخادم ومسارات API والكود الجانب-الخادم
- محاولة استيرادها في مكوّن عميل ستنتج خطأ في البناء
- هذا يمنع الكشف العرضي عن الأسرار مثل مفاتيح API

## تكوين العميل (`lib/config/client.ts`)

يوجد التكوين الآمن للعميل في وحدة منفصلة تقرأ فقط متغيرات `NEXT_PUBLIC_*`:

```typescript
import { siteConfig, pricingConfig, clientEnv } from '@/lib/config/client';

// علامة تجارية للموقع
siteConfig.name        // NEXT_PUBLIC_SITE_NAME
siteConfig.tagline     // NEXT_PUBLIC_SITE_TAGLINE
siteConfig.url         // NEXT_PUBLIC_APP_URL
siteConfig.logo        // NEXT_PUBLIC_SITE_LOGO
siteConfig.brandName   // NEXT_PUBLIC_BRAND_NAME
siteConfig.social      // روابط وسائل التواصل الاجتماعي
siteConfig.attribution // إسناد "مبني باستخدام"

// التسعير
pricingConfig.free     // NEXT_PUBLIC_PRODUCT_PRICE_FREE
pricingConfig.standard // NEXT_PUBLIC_PRODUCT_PRICE_STANDARD
pricingConfig.premium  // NEXT_PUBLIC_PRODUCT_PRICE_PREMIUM

// البيئة
clientEnv.isDevelopment
clientEnv.isProduction
clientEnv.isTest
```

يمكن استيراد هذه الوحدة بأمان في أي مكوّن، بما في ذلك الكود الجانب-العميل.

## مخططات التحقق من الصحة

لكل قسم تكوين مخطط Zod مخصص في `lib/config/schemas/`:

### المخطط الأساسي (`core.schema.ts`)

يتحقق من: `NODE_ENV` و`APP_URL` و`SITE_URL` و`API_BASE_URL` و`DATABASE_URL` وبيانات تعريف الموقع (الاسم والشعار والوصف والكلمات المفتاحية والشعار) والروابط الاجتماعية وثيمة صورة OG والإسناد وإعدادات مستودع المحتوى.

### مخطط المصادقة (`auth.schema.ts`)

يتحقق من: `AUTH_SECRET` و`COOKIE_SECRET` وإعدادات انتهاء صلاحية رمز JWT وتكوين الكوكيز وبيانات اعتماد موفري OAuth (Google وGitHub وMicrosoft وFacebook وX/Twitter وLinkedIn) وتكوين Supabase وبيانات اعتماد مستخدم البذر.

### مخطط البريد الإلكتروني (`email.schema.ts`)

يتحقق من: `EMAIL_PROVIDER` (resend/novu) و`EMAIL_FROM` و`EMAIL_SUPPORT` و`COMPANY_NAME` وإعدادات SMTP (المضيف والمنفذ والمستخدم وكلمة المرور) ومفتاح API لـ Resend ومفتاح API لـ Novu.

### مخطط الدفع (`payment.schema.ts`)

يتحقق من: Stripe (المفتاح السري والمفتاح القابل للنشر وسر webhook ومعرفات الأسعار والتسعير الديناميكي والعملات المتعددة) وLemonSqueezy (مفتاح API ومعرف المتجر وwebhook ومعرفات الأصناف) وPolar (رمز الوصول وwebhook والمنظمة ومعرفات الخطط) وتسعير المنتج ومبالغ التجربة.

### مخطط التحليلات (`analytics.schema.ts`)

يتحقق من: PostHog (المفتاح والمضيف والتصحيح وتسجيل الجلسة والالتقاط التلقائي ومفتاح API الشخصي ومعرف المشروع) وSentry (DSN والمنظمة والمشروع ورمز المصادقة والتصحيح) وVercel Analytics وRecaptcha (مفتاح الموقع والمفتاح السري) وموفر تتبع الاستثناءات.

### مخطط التكاملات (`integrations.schema.ts`)

يتحقق من: Trigger.dev (ممكّن ومفتاح API والرابط والبيئة) وTwenty CRM (رابط URL الأساسي ومفتاح API وممكّن ووضع المزامنة) وCron (السر).

## سلوك التحقق من الصحة

يستخدم نظام التحقق `.catch()` في Zod للتدهور السلس:

```typescript
// من integrations.schema.ts
export const twentyCrmConfigSchema = z
  .object({
    baseUrl: z.string().url().optional().catch(undefined),
    apiKey: z.string().optional(),
    enabled: z.boolean().default(false),
    syncMode: twentyCrmSyncModeSchema,
  })
  .transform((data) => ({
    ...data,
    enabled: data.enabled ?? Boolean(data.baseUrl && data.apiKey),
  }));
```

- **الحقول الاختيارية** مع `.catch()` تتعافى بسلاسة مع القيم الافتراضية
- **الحقول المطلوبة** بدون `.catch()` تتسبب في فشل عند بدء التشغيل
- **خطوات التحويل** تحسب القيم المشتقة (مثل الكشف التلقائي عن الحالة الممكّنة)

يتم تسجيل نتائج التحقق عند بدء التشغيل عبر `validation-logger.ts`، مع إظهار التكاملات النشطة وأي تحذيرات حول التكوين الاختياري المفقود.

## علامات الميزات (`lib/config/feature-flags.ts`)

توفر علامات الميزات آلية بسيطة لتفعيل/تعطيل الميزات المعتمدة على قاعدة البيانات:

```typescript
import { getFeatureFlags, isFeatureEnabled } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
// { ratings: true, comments: true, favorites: true, featuredItems: true, surveys: true }

if (isFeatureEnabled('comments')) {
  // عرض قسم التعليقات
}
```

جميع علامات الميزات مرتبطة حالياً بتوفر `DATABASE_URL`. عند عدم إعداد قاعدة بيانات، يتم تعطيل الميزات التفاعلية بينما يستمر الدليل في تقديم المحتوى الثابت.

## الترقية من التكوين القديم

تحتوي وحدة `server-config.ts` على دوال مساعدة مهملة. مسارات الترقية:

| المهمل | البديل |
|-----------|-------------|
| `getServerConfig().supportEmail` | `configService.email.EMAIL_SUPPORT` |
| `getServerConfig().appUrl` | `configService.core.APP_URL` |
| `getServerConfig().stripeSecretKey` | `configService.payment.stripe.secretKey` |
| `isDevelopment()` | `configService.core.NODE_ENV === 'development'` |
| `getEmailConfig()` | `configService.email` |

## الملفات ذات الصلة

- `lib/config/config-service.ts` — نسخة ConfigService المفردة
- `lib/config/client.ts` — التكوين الآمن للعميل
- `lib/config/schemas/*.schema.ts` — مخططات التحقق من صحة Zod
- `lib/config/feature-flags.ts` — علامات الميزات
- `lib/config/types.ts` — تعريفات أنواع TypeScript
- `.env.example` — مرجع كامل لمتغيرات البيئة
