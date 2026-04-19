---
id: component-patterns
title: بنية المكونات والأنماط
sidebar_label: أنماط المكونات
sidebar_position: 7
---

# بنية المكونات والأنماط

ينظم قالب Ever Works مكونات React الخاصة به باستخدام بنية دليل قائمة على الميزات، مع فصل واضح بين مكونات الميزات والمكونات المشتركة وبدايات واجهة المستخدم الأساسية.

## منظمة الدليل

يتبع الدليل `components/` مؤسسة الميزة الأولى حيث يكون لكل مجال رئيسي دليل فرعي خاص به، إلى جانب المكونات المشتركة وعلى مستوى واجهة المستخدم.

```
components/
├── admin/              # Admin panel feature components
├── auth/               # Authentication feature components
├── billing/            # Billing and payment components
├── collections/        # Collection display components
├── context/            # React context providers
├── dashboard/          # Dashboard feature components
├── directory/          # Directory listing components
├── favorites/          # Favorites feature components
├── featured-items/     # Featured items display
├── filters/            # Search and filter components
├── footer/             # Footer components
├── header/             # Header and navigation
├── home-two/           # Alternate homepage layout
├── icons/              # Custom icon components
├── item-detail/        # Item detail page components
├── layout/             # Layout wrapper components
├── layouts/            # Layout variant components
├── maps/               # Map integration components
├── newsletter/         # Newsletter components
├── payment/            # Payment flow components
├── pricing/            # Pricing display components
├── profile/            # User profile components
├── profile-button/     # Profile button dropdown
├── providers/          # Provider wrapper components
├── settings/           # Settings panel components
├── shared/             # Shared reusable components
├── shared-card/        # Shared card components
├── sponsor-ads/        # Sponsor ad components
├── sponsorships/       # Sponsorship management components
├── submissions/        # Submission form components
├── submit/             # Item submit components
├── surveys/            # Survey components
├── tracking/           # Analytics tracking components
├── ui/                 # Base UI primitives
└── version/            # Version display components
```

## المكونات القائمة على الميزة

يحتوي كل دليل ميزات على جميع المكونات المتعلقة بهذا المجال. يؤدي هذا إلى الحفاظ على تواجد التعليمات البرمجية ذات الصلة في موقع مشترك ويسهل العثور على مكونات لميزة معينة.

### المشرف/

يحتوي على جميع مكونات لوحة الإدارة بما في ذلك جداول البيانات والنماذج والنماذج وواجهات الإدارة. هذه هي مكونات العميل التي تستخدم خطافات خاصة بالمسؤول من `hooks/use-admin-*.ts`.

### المصادقة/

مكونات المصادقة بما في ذلك نماذج تسجيل الدخول، ونماذج التسجيل، وتدفقات إعادة تعيين كلمة المرور، وأزرار OAuth، وشاشات التحقق من البريد الإلكتروني.

### الفواتير/

مكونات إدارة الفوترة والاشتراك بما في ذلك اختيار الخطة ونماذج طرق الدفع وعرض الفاتورة ومؤشرات حالة الاشتراك.

### المرشحات/

بحث وتصفية المكونات المستخدمة عبر صفحات القائمة. تتفاعل هذه مع معلمات بحث URL وحالة مرشح Zustand لتوفير التصفية في الوقت الفعلي.

### التسعير/

مكونات صفحة التسعير بما في ذلك بطاقات مقارنة الخطط ومصفوفات الميزات وتكامل الخروج.

## المكونات المشتركة

### مشترك/

يحتوي الدليل `shared/` على مكونات قابلة لإعادة الاستخدام تُستخدم عبر ميزات متعددة. هذه هي وحدات بناء محايدة للمجال تجمع بين عناصر واجهة المستخدم الأولية في أنماط وظيفية.

### البطاقة المشتركة/

مكونات البطاقة المشتركة المستخدمة لعرض العناصر والمجموعات والمحتويات الأخرى في تخطيطات البطاقة عبر التطبيق.

## مكونات مستوى الجذر

توجد العديد من ملفات المكونات المستقلة في جذر `components/`:

|مكون|الغرض|
|-----------|---------|
|`categories-grid.tsx`|عرض الشبكة للفئات|
|`custom-hero.tsx`|قسم البطل للتخصيص|
|`error-boundary.tsx`|حدود الخطأ مع واجهة المستخدم الاحتياطية|
|`error-provider.tsx`|خطأ في موفر السياق|
|`favorite-button.tsx`|زر التبديل المفضل|
|`hero.tsx`|قسم البطل الافتراضي|
|`item.tsx`|مكون بطاقة العنصر|
|`items-categories.tsx`|العناصر التي تم تنظيمها حسب الفئات|
|`item-skeleton.tsx`|تحميل الهيكل العظمي للعناصر|
|`item-tags.tsx`|عرض العلامات للعناصر|
|`language-switcher.tsx`|مكون تبديل اللغة|
|`layout-switcher.tsx`|تبديل تخطيط الشبكة/القائمة|
|`report-button.tsx`|زر تقرير المحتوى|
|`sort-menu.tsx`|فرز الخيارات المنسدلة|
|`tags-cards.tsx`|عرض بطاقة العلامة|
|`tags-items.tsx`|عرض العناصر حسب العلامة|
|`theme-toggler.tsx`|تبديل المظهر الفاتح/الداكن|
|`universal-pagination.tsx`|مكون ترقيم الصفحات القابل لإعادة الاستخدام|
|`view-toggle.tsx`|تبديل وضع العرض|

## أساسيات واجهة المستخدم (المكونات/واجهة المستخدم/)

يحتوي الدليل `ui/` على مكونات واجهة المستخدم ذات المستوى الأساسي التي توفر أساس نظام التصميم. وهي مبنية على واجهة HeroUI (المعروفة سابقًا باسم NextUI) وTailwind CSS.

تتضمن العناصر الأولية لواجهة المستخدم الرئيسية ما يلي:

|مكون|الوصف|
|-----------|-------------|
|`button.tsx`|زر بمتغيرات (أساسي، ثانوي، شبحي، إلخ.)|
|`card.tsx`|حاوية البطاقة مع أقسام الرأس والجسم والتذييل|
|`input.tsx`|إدخال النص مع دعم التحقق من الصحة|
|`label.tsx`|مكون تسمية النموذج|
|`modal.tsx`|حوار مشروط مع تراكب|
|`select.tsx`|حدد القائمة المنسدلة مع إمكانية البحث|
|`pagination.tsx`|مكون التنقل بالصفحة|
|`badge.tsx`|مكون شارة الحالة|
|`accordion.tsx`|أقسام المحتوى القابلة للتوسيع|
|`alert.tsx`|لافتة التنبيه/الإخطار|
|`breadcrumb.tsx`|التنقل التفصيلي|
|`loading-spinner.tsx`|مؤشر التحميل|
|`password-strength.tsx`|مقياس قوة كلمة المرور|
|`rating.tsx`|عرض/إدخال تصنيف النجوم|
|`infinity-scroll.tsx`|غلاف التمرير اللانهائي|
|`searchable-select.tsx`|اختر مع تصفية البحث|
|`animations.tsx`|مكونات الرسوم المتحركة المساعدة|
|`auth-illustrations.tsx`|الرسوم التوضيحية صفحة المصادقة|

## الخادم مقابل مكونات العميل

يتبع القالب اصطلاحات Next.js للفصل بين مكونات الخادم والعميل:

### مكونات الخادم

مكونات الخادم هي المكونات الافتراضية في جهاز توجيه التطبيقات. يتم استخدامها من أجل:
- تخطيطات الصفحة والأغلفة
- جلب البيانات على مستوى الصفحة
- تقديم محتوى ثابت
- محتوى مهم لكبار المسئولين الاقتصاديين

توجد مكونات الخادم بشكل أساسي في ملفات الصفحة والتخطيط `app/[locale]/`. يمكنهم استيراد وظائف استعلام قاعدة البيانات وطرق المستودع مباشرة.

### مكونات العميل

يتم تمييز مكونات العميل بـ `'use client'` ويتم استخدامها من أجل:
- عناصر واجهة المستخدم التفاعلية (النماذج والأزرار والتبديلات)
- المكونات التي تستخدم خطافات React (useState، useEffect، الخطافات المخصصة)
- المكونات التي تستخدم واجهات برمجة تطبيقات المتصفح
- المكونات التي تعتمد على React Query أو Zustand

معظم المكونات الموجودة في الدليل `components/` هي مكونات عميل لأنها تتعامل مع تفاعل المستخدم وحالته.

## موفرو السياق

### المكونات/السياق/

رد فعل موفري السياق لمشاركة الحالة عبر أشجار المكونات:
- سياق الخطأ لحالة حدود الخطأ
- سياق علامة الميزة لبوابة ميزة وقت التشغيل

### المكونات/المقدمين/

مكونات مجمع الموفر التي تتكون من موفري خدمات متعددين:
- موفر عميل الاستعلام (TanStack Query)
- مزود الموضوع
- موفر الجلسة (NextAuth)
- مزود التوست

يشتمل غلاف موفري الجذر في `app/[locale]/providers.tsx` على جميع الموفرين الضروريين للتطبيق.

## اتفاقيات المكونات

1. **تسمية الملف**: تستخدم المكونات أسماء ملفات حالة الكباب (على سبيل المثال، `favorite-button.tsx`)
2. **نمط التصدير**: تستخدم المكونات عمليات التصدير المسماة وملفات البرميل (`index.ts`) في دلائل الميزات
3. **موقع الخطافات المشترك**: توجد الخطافات الخاصة بالميزات في دليل المستوى الأعلى `hooks/`، وليس داخل أدلة المكونات
4. **التصميم**: تستخدم المكونات فئات الأداة المساعدة Tailwind CSS؛ يستخدم البعض وحدات SCSS للتصميم المعقد
5. **الأنواع**: يتم تعريف أنواع خصائص المكونات بشكل مضمن أو في ملفات الأنواع المجاورة داخل الدليل `types/`
6. **الأيقونات**: الرموز المخصصة مركزية في `components/icons/`؛ تستخدم الرموز القياسية `lucide-react`
