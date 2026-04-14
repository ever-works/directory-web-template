---
id: architecture
title: نظرة عامة على الهندسة المعمارية
sidebar_label: نظرة عامة
sidebar_position: 0
---

# نظرة عامة على الهندسة المعمارية

توفر هذه الصفحة خريطة عالية المستوى لبنية قالب Ever Works. استخدمه كنقطة بداية قبل الغوص في الصفحات التفصيلية التالية.

## مؤسسة التكنولوجيا

القالب عبارة عن تطبيق **Next.js 16** يستخدم **App Router** مع **React 19**. إنه ينتج مخرجات `standalone` لعمليات النشر في حاويات ويطبق العديد من التحسينات على مستوى إطار العمل في `next.config.ts`:

|طبقة|التكنولوجيا|الغرض|
|---|---|---|
|**الإطار**|Next.js 16 (جهاز توجيه التطبيقات)|عرض الخادم والعميل والتوجيه وطرق واجهة برمجة التطبيقات|
|** واجهة المستخدم **|رد الفعل 19، HeroUI، Radix UI، Tailwind CSS 4|مكتبة المكونات، البدائيات، التصميم|
|**قاعدة البيانات**|Drizzle ORM + PostgreSQL (أو SQLite محليًا)|إدارة المخطط والترحيل والاستعلامات|
|**المصادقة**|NextAuth.js v5 (تجريبي)|مصادقة متعددة الموفرين مع التخزين المؤقت للجلسة|
|**التدويل**|التالي الدولي|التوجيه المدرك للإعدادات المحلية وحزم الرسائل|
|**المدفوعات**|الشريط، القطبي، LemonSqueezy، Solidgate|تدفقات الاشتراك والدفع لمرة واحدة|
|**المحتوى**|نظام إدارة المحتوى المستند إلى Git (دليل `.content/`)|محتوى Markdown/YAML المستنسخ من مستودع البيانات|
|**الرصد**|سنتري، بوست هوج، تحليلات فيرسيل|تتبع الأخطاء وتحليلات المنتج والأداء|
|**البريد الإلكتروني**|إعادة الإرسال|تسليم البريد الإلكتروني للمعاملات|
|** نص غني **|Tiptap|محرر WYSIWYG للمحتوى الإداري|

## هيكل المشروع

يتبع القالب تنظيمًا متعدد الطبقات قائمًا على الميزات. فيما يلي أدلة المستوى الأعلى ومسؤولياتها:

```text
template/
  app/              # Next.js App Router -- routes and layouts
    [locale]/       # Locale-prefixed pages (i18n)
      admin/        # Admin dashboard pages
      auth/         # Authentication flows
      dashboard/    # Client dashboard
      items/        # Item detail pages
      categories/   # Category browsing
      ...
    api/            # API route handlers
  components/       # Shared React components (UI, layout, features)
  lib/              # Core logic -- the heart of the application
    auth/           # Authentication providers, guards, session caching
    db/             # Drizzle schema, migrations, seed, queries
    middleware/     # Permission checks and middleware utilities
    repositories/  # Data-access layer (database queries)
    services/      # Business logic services
    payment/       # Payment provider integrations
    mail/           # Email templates and sending
    analytics/     # Analytics tracking layer
    config/        # Centralized configuration service
    validations/   # Zod schemas for input validation
    utils/         # General utility functions
    ...
  hooks/            # Custom React hooks (React Query wrappers, UI logic)
  constants/        # Application-wide constants
  types/            # Shared TypeScript type definitions
  i18n/             # Internationalization setup and locale request config
  messages/         # Translation message files (JSON per locale)
  e2e/              # Playwright end-to-end tests
  scripts/          # Build, seed, migration, and utility scripts
  public/           # Static assets
```

للحصول على دليل تفصيلي كامل، راجع صفحة [بنية المشروع](/architecture/project-structure).

## العمارة الطبقات

تفرض قاعدة التعليمات البرمجية فصلًا واضحًا بين الاهتمامات عبر ثلاث طبقات:

### طبقة العرض

تتعامل مكونات التفاعل في `components/` وملفات الصفحات في `app/[locale]/` مع العرض وتفاعل المستخدم. تقوم مكونات الخادم بجلب البيانات مباشرة؛ تستخدم مكونات العميل خطافات React Query من `hooks/` للحالة من جانب العميل.

### طبقة منطق الأعمال

تحتوي الخدمات الموجودة في `lib/services/` على قواعد العمل الأساسية. يأتي القالب مزودًا بأكثر من 30 ملف خدمة يغطي التحليلات والاشتراكات والإشراف ومزامنة CRM والترميز الجغرافي والإشعارات والمزيد. يتم استدعاء الخدمات بواسطة معالجات مسار واجهة برمجة التطبيقات (API) ومكونات الخادم، ولكن لا يتم استدعاؤها مباشرةً عن طريق رمز واجهة المستخدم في المتصفح.

### طبقة الوصول إلى البيانات

تقوم المستودعات الموجودة في `lib/repositories/` بتغليف جميع استعلامات قاعدة البيانات باستخدام Drizzle ORM. كل كيان مجال (عناصر، فئات، مجموعات، مستخدمين، أدوار، علامات، إعلانات راعية) له ملف مستودع خاص به. يؤدي هذا إلى إبقاء التفاصيل على مستوى SQL خارج طبقة الخدمة.

لإلقاء نظرة أعمق على تدفق البيانات بين هذه الطبقات، راجع [تدفق البيانات](/architecture/data-flow).

## جهاز التوجيه والتوجيه لتطبيق Next.js

جميع المسارات التي تواجه المستخدم موجودة ضمن `app/[locale]/`، مما يتيح عناوين URL ذات البادئات المحلية خارج الصندوق عبر `next-intl`. يستخدم التطبيق العديد من ميزات App Router:

- **التخطيطات** - ملفات `layout.tsx` المتداخلة للمسؤول ولوحة تحكم العميل والمناطق العامة.
- **مجموعات المسار** - تتعامل المجموعة `(listing)` مع قائمة الدليل الرئيسي وتصفح العلامات دون التأثير على بنية عنوان URL.
- ** المسارات الديناميكية ** - `[page]`، `[...tag]`، والمقاطع المسماة للعناصر والفئات والمجموعات.
- **إعادة الكتابة** - تم تعريفها في `next.config.ts` لإعادة توجيه مسارات الفئات العارية إلى عرض الاكتشاف المرقّم.

راجع [التوجيه](/architecture/routing) للحصول على خريطة الطريق الكاملة.

## نظام المصادقة

تم إنشاء المصادقة على **NextAuth.js v5** مع نظام تكوين الموفر في `lib/auth/`. ينسق الملف `auth.config.ts` في جذر المشروع:

- **موفرو OAuth** - Google وGitHub، الذين يتم تكوينهم من خلال متغيرات البيئة ويتم تمكينهم/تعطيلهم ديناميكيًا.
- **موفر بيانات الاعتماد** - مصادقة البريد الإلكتروني/كلمة المرور باستخدام تجزئة bcrypt.
- **محول Supabase** - تخزين جلسة اختياري مدعوم من Supabase.
- **التخزين المؤقت للجلسة** - `lib/auth/cached-session.ts` يقلل عمليات البحث عن الجلسة المتكررة.
- ** نظام الحراسة ** - `lib/auth/guards.ts` و`lib/guards/` يفرض الوصول المستند إلى الدور على مستوى المسار.

للحصول على تفاصيل حول نظام الحراسة والأذونات المستندة إلى الأدوار، راجع [Guards System](/architecture/guards-system) و[Permissions System](/architecture/permissions-system).

## Drizzle ORM وقاعدة البيانات

تستخدم طبقة قاعدة البيانات **Drizzle ORM** مع المخطط المحدد في `lib/db/schema.ts`. الجوانب الرئيسية:

- **الترحيلات** يتم إنشاؤها باستخدام `drizzle-kit generate` ويتم تطبيقها باستخدام `drizzle-kit migrate`.
- تقوم البرامج النصية **البذرية في `lib/db/seed.ts` و`scripts/cli-seed.ts` بملء البيانات الأولية بما في ذلك الأدوار.
- **التكوين** موجود في `drizzle.config.ts` في جذر المشروع.
- PostgreSQL مطلوب للإنتاج؛ يتم دعم SQLite للتنمية المحلية.

راجع [أنماط المستودع](/architecture/repository-patterns) لمعرفة كيفية تنظيم طبقة الوصول إلى البيانات.

## سلسلة الوسيطة

يستخدم القالب البرنامج الوسيط Next.js (عبر البرنامج الإضافي `next-intl` المطبق في `next.config.ts`) مع عمليات التحقق من الأذونات المخصصة في `lib/middleware/permission-check.ts`. يتعامل خط أنابيب البرامج الوسيطة مع:

- كشف اللغة والتوجيه
- التحقق من حالة المصادقة
- حماية المسار على أساس الدور
- رؤوس الأمان (HSTS، وCSP، وX-Frame-Options، والمزيد - تم تكوينها في `next.config.ts`)

للحصول على تفاصيل تفصيلية، راجع [البرامج الوسيطة](/architecture/middleware) و[Middleware Deep Dive](/architecture/middleware-deep-dive).

## التكوين والأمن

يقوم الملف `next.config.ts` بتعيين العديد من الإعدادات الافتراضية للأمان والأداء:

- **إخراج مستقل** لعمليات النشر المتوافقة مع Docker.
- **رؤوس الأمان** بما في ذلك سياسة أمان المحتوى وHSTS وخيارات نوع المحتوى X وخيارات الإطار X.
- **تحسين الصور** من خلال دعم النمط عن بعد وسياسات أمان SVG.
- **تكامل الحراسة** يتم تطبيقه باعتباره غلاف التكوين الخارجي لتتبع الأخطاء.
- **تحسين الحزمة** لـ HeroUI وLucide React لتقليل حجم الحزمة.

## صفحات الهندسة المعمارية التفصيلية

استكشف هذه الصفحات للحصول على تغطية أعمق للأنظمة الفردية:

|الصفحة|ما يغطيه|
|---|---|
|[مكدس التكنولوجيا](/architecture/tech-stack)|مخزون التبعية الكامل وتفاصيل الإصدار|
|[هيكل المشروع](/architecture/project-structure)|الدليل التفصيلي لكل دليل|
|[تدفق البيانات](/architecture/data-flow)|دورة حياة الطلب من المتصفح إلى قاعدة البيانات|
|[التوجيه](/الهندسة المعمارية/التوجيه)|بنية جهاز توجيه التطبيق وأنماط عنوان URL|
|[أنماط المكونات](/architecture/component-patterns)|مكونات الخادم مقابل مكونات العميل وأنماط التكوين|
|[إدارة الدولة](/architecture/state-management)|رد الفعل الاستعلام، Zustand، وحالة الخادم|
|[طبقة واجهة برمجة التطبيقات](/architecture/api-layer)|تصميم REST API وأنماط معالج المسار|
|[البرمجيات الوسيطة](/الهندسة المعمارية/البرمجيات الوسيطة)|خط أنابيب الوسيطة ومعالجة الطلب|
|[نظام الحراسة](/architecture/guards-system)|التحكم في الوصول المستند إلى الدور على مستوى المسار|
|[نظام الأذونات](/architecture/permissions-system)|تعريفات الأذونات الدقيقة|
|[أنماط المستودع](/architecture/repository-patterns)|اتفاقيات طبقة الوصول إلى البيانات|
|[أنماط التحقق](/architecture/validation-patterns)|مخططات Zod والتحقق من صحة الإدخال|
|[نظام السمات](/architecture/theme-system)|تصميم السمات وإدارة الألوان|
|[نظام الألوان](/architecture/color-system)|خط أنابيب توليد الألوان الديناميكية|
|[نظام تحسين محركات البحث](/architecture/seo-system)|البيانات الوصفية وخرائط الموقع والبيانات المنظمة|
|[مكتبة الدفع](/architecture/Payment-library)|تكامل الدفع متعدد الموفرين|
|[مكتبة المحتوى](/architecture/content-library)|خط أنابيب محتوى CMS القائم على Git|
|[نظام التحرير](/architecture/editor-system)|Tiptap التكامل مع محرر النص الغني|
|[أنماط مصمم الخرائط](/architecture/mapper-patterns)|تحويل البيانات بين الطبقات|
|[حدود الخطأ](/architecture/error-boundaries)|معالجة الأخطاء واستعادتها|
|[طبقة التحليلات](/architecture/analytics-layer)|تتبع الأحداث وخط أنابيب التحليلات|
|[نظام التبختر](/architecture/نظام التبختر)|إنشاء وثائق OpenAPI|

## إلى أين تذهب بعد ذلك

- **هل أنت جديد في المشروع؟** ابدأ بـ [Getting Started](/getting-started) لتثبيت النموذج وتشغيله.
- **هل أنت جاهز للتخصيص؟** انتقل إلى قسم [الأدلة](/guides) للحصول على برامج تعليمية خطوة بخطوة.
- **هل تريد مخزون التكنولوجيا الكامل؟** راجع [Tech Stack](/architecture/tech-stack).

---

Understanding the architecture will help you make informed decisions when extending the template. Start with the areas most relevant to your use case and explore outward from there.
