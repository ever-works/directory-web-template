---
id: feature-config
title: "تكوين الميزات"
sidebar_label: "تكوين الميزات"
sidebar_position: 3
---

# تكوين الميزات

يستخدم القالب نظام علامات الميزات لتفعيل أو تعطيل الوظائف بشكل أنيق بناءً على تهيئة النظام. يتيح ذلك للتطبيق العمل بدون قاعدة بيانات (خدمة المحتوى الثابت فقط) مع تمكين الميزات تدريجيًا عند توفر البنية التحتية.

## وحدة علامات الميزات

تُعرَّف علامات الميزات في `lib/config/feature-flags.ts`.

### واجهة FeatureFlags

```ts
interface FeatureFlags {
  /** وظيفة تقييمات ومراجعات المستخدمين */
  ratings: boolean;
  /** تعليقات المستخدمين على العناصر */
  comments: boolean;
  /** مجموعة العناصر المفضلة للمستخدم */
  favorites: boolean;
  /** عرض العناصر المميزة التي يديرها المسؤول */
  featuredItems: boolean;
  /** استطلاعات المستخدمين وجمع الملاحظات */
  surveys: boolean;
}
```

### كيفية تحديد العلامات

تعتمد جميع الميزات الحالية على توفر قاعدة البيانات. تُفعَّل الميزة عندما يكون `DATABASE_URL` مُهيَّأً:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

يسمح هذا التصميم للقالب بخدمة المحتوى من نظام إدارة المحتوى المعتمد على Git دون أي قاعدة بيانات، بينما تُعطَّل الميزات التفاعلية المعتمدة على قاعدة البيانات (التقييمات، التعليقات، المفضلات) تلقائيًا.

### الدوال المساعدة

توفر الوحدة عدة دوال مساعدة:

```ts
// التحقق من ميزة واحدة
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // رسم مكوّن التعليقات
}

// الحصول على جميع الميزات المفعّلة
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();

// الحصول على جميع الميزات المعطّلة (مفيد للتصحيح)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// التحقق من جاهزية كل شيء
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('المنصة الكاملة تعمل');
}
```

### مرجع API الكامل

| الدالة | تُرجع | الوصف |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | جميع العلامات كـ كائن منطقي |
| `isFeatureEnabled(name)` | `boolean` | التحقق من ميزة واحدة بالاسم |
| `getEnabledFeatures()` | `string[]` | مصفوفة أسماء الميزات المفعّلة |
| `getDisabledFeatures()` | `string[]` | مصفوفة أسماء الميزات المعطّلة |
| `areAllFeaturesEnabled()` | `boolean` | صحيح إذا كانت كل ميزة مفعّلة |

## التصيير المعتمد على الميزات

### في مكوّنات الخادم

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### في مسارات API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'ميزة التعليقات غير متاحة' },
      { status: 503 }
    );
  }
  // معالجة إنشاء التعليق...
}
```

## تهيئة الموقع (siteConfig)

بالإضافة إلى علامات الميزات، يوفر القالب كائن `siteConfig` في `lib/config.ts` لتخصيص العلامة التجارية والبيانات الوصفية. يمكن تجاوز كل قيمة عبر متغيرات البيئة:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  // ...
} as const;
```

### التخصيص عبر متغيرات البيئة

| المتغير | الافتراضي | الغرض |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | اسم الموقع في البيانات الوصفية وصور OG |
| `NEXT_PUBLIC_SITE_TAGLINE` | الافتراضي في القالب | شعار الصفحة الرئيسية |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | عنوان URL الكامل للموقع (بدون شرطة مائلة في النهاية) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | مسار الشعار بالنسبة إلى `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | اسم منظمة Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | الافتراضي في القالب | وصف SEO التعريفي |
| `NEXT_PUBLIC_SITE_KEYWORDS` | الافتراضي في القالب | كلمات مفتاحية لـ SEO مفصولة بفواصل |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | رابط "مُنشأ بـ" في التذييل |

### التحقق

تتحقق الدالة `validateSiteConfig()` من المتغيرات الحرجة في الإنتاج المفقودة:

```ts
import { validateSiteConfig } from '@/lib/config';

// تُرجع true إذا كانت جميع المتغيرات المطلوبة مضبوطة، وإلا false مع تحذيرات
const isValid = validateSiteConfig();
```

## ConfigManager (تهيئة YAML)

تدير فئة `ConfigManager` في `lib/config-manager.ts` ملف `config.yml` من مستودع نظام إدارة المحتوى المعتمد على Git. تتعامل مع القراءة والكتابة وتأكيد تغييرات التهيئة.

### قراءة التهيئة

```ts
import { configManager } from '@/lib/config-manager';

// الحصول على التهيئة الكاملة
const config = configManager.getConfig();
```

### كتابة التهيئة

جميع عمليات الكتابة تُودَع وتُدفَع تلقائيًا إلى مستودع Git:

```ts
// تحديث ترقيم الصفحات
await configManager.updatePagination('infinite', 24);

// تحديث أي مفتاح رئيسي
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });
```

### الأمان

يتضمن ConfigManager حماية من تلوث النموذج الأولي:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

## الملفات ذات الصلة

| المسار | الوصف |
|------|-------------|
| `lib/config/feature-flags.ts` | تعريفات علامات الميزات والدوال المساعدة |
| `lib/config.ts` | siteConfig آمن للعميل وإعادة تصدير الأنواع |
| `lib/config-manager.ts` | قارئ/كاتب تهيئة YAML مع تكامل Git |
| `lib/config/index.ts` | تصدير برميل لوحدة التهيئة |
| `lib/config/config-service.ts` | كائن منفرد ConfigService من جانب الخادم |
| `lib/config/types.ts` | تعريفات أنواع TypeScript للتهيئة |
| `.env.example` | قائمة كاملة بخيارات متغيرات البيئة |
