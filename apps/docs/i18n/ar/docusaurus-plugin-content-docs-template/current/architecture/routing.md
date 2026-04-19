---
id: routing
title: هندسة التوجيه
sidebar_label: التوجيه
sidebar_position: 6
---

# هندسة التوجيه

يستخدم قالب Ever Works جهاز توجيه التطبيقات Next.js مع التدويل عبر `next-intl`، مما يوفر مسارات ذات بادئة محلية ومجموعات مسارات للتنظيم المنطقي وطبقة API شاملة.

## جهاز توجيه التطبيق مع الجزء المحلي

يتم تضمين جميع الصفحات التي تواجه المستخدم ضمن مقطع ديناميكي `[locale]`، مما يتيح دعم متعدد اللغات لستة لغات: `en`، `fr`، `es`، `de`، `ar`، و`zh`.

```
app/
├── [locale]/           # Dynamic locale segment
│   ├── layout.tsx      # Locale layout (wraps all localized pages)
│   ├── providers.tsx   # Client providers for the locale subtree
│   ├── globals.css     # Global styles
│   └── ...pages        # All localized pages
├── api/                # API routes (not locale-prefixed)
├── layout.tsx          # Root layout (HTML, fonts, metadata)
└── not-found.tsx       # 404 page
```

تتبع عناوين URL النمط `/{locale}/path`، على سبيل المثال:
- `/en/pricing` - صفحة التسعير باللغة الإنجليزية
- `/fr/admin/items` - صفحة عناصر الإدارة الفرنسية
- `/de/categories` -- صفحة الفئات الألمانية

## تكوين Next.js

يقوم `next.config.ts` بتكوين العديد من سلوكيات التوجيه:

### يعيد الكتابة

```typescript
async rewrites() {
  return [
    {
      source: "/:path",
      destination: "/:path/discover/1",
    },
    {
      source: "/:path/discover",
      destination: "/:path/discover/1",
    },
  ];
}
```

تعمل عمليات إعادة الكتابة هذه على إعادة توجيه مسار اللغة الجذر و`/discover` إلى الصفحة الأولى من قائمة الاكتشاف (`/discover/1`)، مما يوفر عنوان URL افتراضيًا نظيفًا.

### رؤوس الأمان

تتلقى كافة المسارات رؤوس الأمان بما في ذلك:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` بحد أقصى عامين
- `Content-Security-Policy` مع الإعدادات الافتراضية المقيدة
- `Referrer-Policy: strict-origin-when-cross-origin`

### البرنامج المساعد التالي int

يتم تطبيق المكون الإضافي `next-intl` على تكوين Next.js، مع الإشارة إلى `./i18n/request.ts` لتحليل الإعدادات المحلية:

```typescript
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const configWithIntl = withNextIntl(nextConfig);
```

## مجموعات الطريق

يستخدم الدليل `[locale]` عدة مجموعات منطقية لتنظيم الصفحات:

### (قائمة) -- صفحات القائمة الرئيسية

مجموعة التوجيه `(listing)` عبارة عن مجموعة بين قوسين (بدون مقطع URL) تقوم بتغليف صفحات سرد الدليل الرئيسي بتخطيط مشترك.

### المشرف/ - لوحة الإدارة

يوفر قسم الإدارة واجهة مكتب خلفي كاملة:

```
[locale]/admin/
├── auth/               # Admin sign-in
├── categories/         # Category CRUD
├── clients/            # Client management
├── collections/        # Collection CRUD
├── comments/           # Comment moderation
├── companies/          # Company management
├── featured-items/     # Featured item management
├── items/              # Item review and management
├── reports/            # Report review
├── roles/              # Role and permission management
├── settings/           # Site settings
├── sponsorships/       # Sponsorship management
├── surveys/            # Survey builder
├── tags/               # Tag management
├── users/              # User management
├── layout.tsx          # Admin layout (sidebar, navigation)
├── layout-client.tsx   # Client-side admin layout logic
└── page.tsx            # Admin dashboard
```

### auth/ - صفحات المصادقة

```
[locale]/auth/
├── signin/             # Sign in page
├── signup/             # Sign up page
├── forgot-password/    # Password reset request
├── reset-password/     # Password reset form
├── verify-email/       # Email verification
└── error/              # Authentication error page
```

### العميل/ - لوحة تحكم العميل

يوفر قسم العميل ميزات مستخدم موثقة لإدارة عمليات الإرسال والحساب الخاصة بهم.

### لوحة القيادة/ - لوحة تحكم المستخدم

لوحة تحكم عامة للمستخدم مع نظرة عامة على الحساب والنشاط والإعدادات.

## مسارات واجهة برمجة التطبيقات (29 مجموعة)

توجد مسارات API خارج مقطع `[locale]` في `app/api/` وليست مسبوقة بالإعدادات المحلية. إنها بمثابة الواجهة الخلفية لجلب البيانات من جانب العميل.

|مجموعة الطريق|الغرض|نقاط النهاية الرئيسية|
|-------------|---------|---------------|
|`admin/`|العمليات الادارية|العناصر والمستخدمين والفئات والإعدادات|
|`auth/`|المصادقة|جلسة الاسترجاعات OAuth|
|`categories/`|بيانات الفئة|القائمة، البحث|
|`client/`|عمليات العميل|الملف الشخصي، التقديمات، لوحة القيادة|
|`collections/`|جمع البيانات|القائمة، التفاصيل|
|`config/`|تكوين الموقع|ميزة الأعلام والإعدادات|
|`cron/`|المهام المجدولة|الشيكات الاشتراك، والتنظيف|
|`current-user/`|معلومات المستخدم الحالية|الملف الشخصي، بيانات الجلسة|
|`extract/`|استخراج URL|استخراج البيانات الوصفية من عناوين URL|
|`favorites/`|المفضلة|إضافة، إزالة، قائمة|
|`featured-items/`|العناصر المميزة|قائمة العناصر المميزة النشطة|
|`geocode/`|الترميز الجغرافي|البحث عن العنوان، عكس الترميز الجغرافي|
|`health/`|فحص الصحة|قاعدة البيانات وحالة الخدمة|
|`internal/`|العمليات الداخلية|نقاط النهاية على مستوى النظام|
|`items/`|بيانات السلعة|القائمة والتفاصيل والبحث|
|`lemonsqueezy/`|ليمونسكويزي|معالج Webhook|
|`location/`|بيانات الموقع|العناصر القريبة، البحث عن الموقع|
|`payment/`|عمليات الدفع|الخروج، طرق الدفع|
|`polar/`|القطبية|معالج Webhook|
|`reference/`|البيانات المرجعية|التعدادات، قيم البحث|
|`reports/`|تقارير المحتوى|إرسال ومراجعة التقارير|
|`solidgate/`|سوليدجيت|معالج Webhook|
|`sponsor-ads/`|إعلانات الراعي|الخام، التنشيط|
|`stripe/`|شريط|معالج Webhook، الخروج|
|`surveys/`|المسوحات|قائمة، والرد، والنتائج|
|`user/`|عمليات المستخدم|الملف الشخصي، الإعدادات|
|`verify-recaptcha/`|reCAPTCHA|التحقق من الرمز المميز|
|`version/`|معلومات الإصدار|إصدار التطبيق ومعلومات البناء|

## الوسيطة

يستخدم التطبيق `next-intl` البرامج الوسيطة لاكتشاف اللغة وتوجيهها. تتعامل الوسيطة مع:

1. **كشف اللغة**: يحدد لغة المستخدم من مسار URL أو ملفات تعريف الارتباط أو رأس `Accept-Language`
2. **عمليات إعادة التوجيه المحلية**: إعادة توجيه الطلبات التي لا تحتوي على بادئة محلية إلى اللغة المناسبة
3. **اللغة الافتراضية**: تعود إلى اللغة الإنجليزية (`en`) عند عدم اكتشاف أي تفضيلات محلية

تم تكوين البرنامج الوسيط في الدليل `i18n/` مع قواعد التوجيه المحلية المحددة في `i18n/routing.ts` ومعالجة الطلب في `i18n/request.ts`.

## الجيل الثابت والطرق الديناميكية

يستخدم القالب العديد من إستراتيجيات جلب البيانات:

- **الإنشاء الثابت**: يتم إنشاء صفحات مثل سياسة الخصوصية وشروط الخدمة والمعلومات بشكل ثابت
- **العرض الديناميكي**: يتم عرض صفحات المسؤول ولوحات المعلومات والصفحات التي تمت مصادقتها ديناميكيًا
- **ISR (التجديد الثابت التزايدي)**: تستخدم صفحات قائمة الفئات والعلامات ISR مع إعادة التحقق من الصحة
- **إنشاء خريطة الموقع**: `app/sitemap.ts` يقوم بإنشاء خريطة الموقع ديناميكيًا من بيانات المحتوى

تم ضبط `staticPageGenerationTimeout` على 180 ثانية في `next.config.ts` لاستيعاب مستودعات المحتوى الكبيرة أثناء عمليات الإنشاء.
