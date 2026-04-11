---
id: breadcrumbs
title: التنقل التفصيلي
sidebar_label: فتات الخبز
sidebar_position: 26
---

# التنقل التفصيلي

يوفر القالب نظام تنقل تفصيلي مع مكونات واجهة مستخدم قابلة لإعادة الاستخدام، ومسارات تنقل خاصة بالصفحة، ودعم التدويل. تعمل مسارات التنقل على تحسين تنقل المستخدم وتحسين محركات البحث من خلال عرض التسلسل الهرمي للصفحة الحالية.

## نظرة عامة على الهندسة المعمارية

يتم تنفيذ فتات الخبز على ثلاثة مستويات:

| طبقة | ملف | الغرض |
|-------|------|---------|
| ** واجهة مستخدم قابلة لإعادة الاستخدام ** | `components/ui/breadcrumb.tsx` | مكون مسار التنقل العام يقبل مجموعة من العناصر |
| ** تفاصيل السلعة ** | `components/item-detail/breadcrumb.tsx` | مسار التنقل الخاص بالعنصر مع الوعي بالفئة |
| **المجموعات** | `app/[locale]/collections/components/collections-breadcrumb.tsx` | مسارات التنقل لصفحة المجموعات مع i18n |

## مكون التنقل القابل لإعادة الاستخدام

يعيش مكون مسار التنقل الأساسي عند 3 ويقبل مجموعة مكتوبة من عناصر مسار التنقل.

### واجهة عنصر التنقل

```ts
export interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

يحتوي كل عنصر على علامة `label` للعرض وعلامة `href` اختيارية للربط. يتم عرض العنصر الأخير في المصفوفة تلقائيًا كنص عادي (الصفحة الحالية) بدلاً من رابط.

### الدعائم فتات الخبز

```ts
interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  className?: string;
}
```

- **العناصر** -- مصفوفة من مقاطع التنقل التي سيتم عرضها بعد رابط الصفحة الرئيسية
- **homeLabel** - تسمية الرابط الرئيسي (القيمة الافتراضية هي `'Home'` )
- **className** - فئات CSS إضافية لتطبيقها على عنصر التنقل

### الاستخدام الأساسي

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

function MyPage() {
  return (
    <Breadcrumb
      items={[
        { label: 'Categories', href: '/categories' },
        { label: 'Productivity', href: '/categories/productivity' },
        { label: 'Current Tool' },
      ]}
    />
  );
}
```

### سلوك العرض

يعرض المكون عنصرًا يمكن الوصول إليه بقائمة مرتبة:

1. **رابط الصفحة الرئيسية** - يتم عرضه دائمًا أولاً مع رمز المنزل SVG والنص `homeLabel` 2. **العناصر المتوسطة** - يتم تقديمها كعناصر قابلة للنقر عليها `Link` (من `next/link` ) مع فواصل على شكل رتبة رتبة عسكرية
3. **العنصر الأخير** - تم تقديمه بتنسيق عادي 4 مع 5 لتسهيل الوصول إليه

```tsx
<nav className={cn('flex mb-8', className)} aria-label="Breadcrumb">
  <ol className="inline-flex items-center space-x-1 md:space-x-3">
    {/* Home link with icon */}
    <li className="inline-flex items-center text-black dark:text-white">
      <Link href="/">
        <HomeIcon />
        {homeLabel}
      </Link>
    </li>
    {/* Dynamic breadcrumb items with chevron separators */}
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <li key={index} aria-current={isLast ? 'page' : undefined}>
          <div className="flex items-center">
            <ChevronIcon />
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
</nav>
```

## تفاصيل البند التفصيلي

تم تصميم المكون "0" الموجود في "1" خصيصًا لصفحات تفاصيل العنصر. يتكامل تلقائيًا مع نظام الفئات.

### الدعائم

```ts
interface BreadcrumbProps {
  name: string;
  category: string | { id?: string } | null | undefined;
  categoryName: string | null | undefined;
}
```

### التنقل حسب الفئة

يستخدم مسار تنقل العنصر الخطاف `useCategoriesEnabled` لعرض مقطع الفئة بشكل مشروط. عند تمكين الفئات، يظهر شريط التنقل:

**الصفحة الرئيسية** > **اسم الفئة** > **اسم العنصر**

عند تعطيل الفئات، يتم تبسيط الأمر إلى:

**الصفحة الرئيسية** > **اسم العنصر**

```tsx
import { ItemBreadcrumb } from '@/components/item-detail/breadcrumb';

function ItemDetailPage({ item }) {
  return (
    <ItemBreadcrumb
      name={item.name}
      category={item.category}
      categoryName={item.categoryName}
    />
  );
}
```

### جيل سبيكة

يقوم المكون بمعالجة معرفات الفئة من خلال الأداة المساعدة 0 لإنشاء مسارات آمنة لعنوان URL:

```ts
const rawCategoryId =
  typeof firstCategory === 'string'
    ? firstCategory
    : (firstCategory as { id?: string })?.id || String(firstCategory);
const encodedCategory = encodeURIComponent(slugify(rawCategoryId));
```

تتبع روابط الفئات النمط `/categories/{encoded-slug}` .

### اقتطاع النص

يتم اقتطاع اسم العنصر إلى أقصى عرض يبلغ 200 بكسل باستخدام فئات Tailwind، مما يمنع أسماء العناصر الطويلة من كسر التخطيط.

## مجموعات التنقل

يوضح المكون 2 في 3 النمط المدرك لـ i18n.

### التدويل

يستخدم هذا المكون `next-intl` لترجمة تسميات مسارات التنقل:

```tsx
import { useTranslations } from 'next-intl';

export function CollectionsBreadcrumb() {
  const t = useTranslations('common');

  return (
    <nav className="flex mb-8 justify-center" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li>
          <Link href="/">{t('HOME')}</Link>
        </li>
        <li>
          <span>{t('COLLECTION')}</span>
        </li>
      </ol>
    </nav>
  );
}
```

يتم تعريف مفاتيح الترجمة في الدليل `messages/` لكل لغة مدعومة.

## التصميم والوضع الداكن

تدعم جميع مكونات مسار التنقل الوضع المظلم من خلال فئات البادئة 1 في Tailwind:

| العنصر | وضع الضوء | الوضع المظلم |
|---------|----------|-----------|
| نص | `text-black` | `dark:text-white` |
| روابط | 4ـ | 5 ــ |
| أيقونات شيفرون | 6ـ | `dark:text-white/50` |
| حالة التمرير | 8ـ | `dark:hover:text-white` |

يتم تطبيق التحولات باستخدام `transition-colors duration-300` للحصول على تأثيرات تمرير سلسة.

## إمكانية الوصول

تتبع مكونات مسار التنقل أفضل ممارسات التنقل التفصيلي لـ WAI-ARIA:

- ** `aria-label="Breadcrumb"` ** على العنصر `nav` يحدد المعلم
- ** `aria-current="page"` ** في عنصر التنقل الأخير، يتم تحديد الصفحة الحالية
- **14**** على أيقونات SVG المزخرفة (الرئيسية والشيفرون) لإخفائها عن قارئات الشاشة
- **HTML الدلالي** يستخدم بنية 15 للمخطط التفصيلي المناسب للمستند

## إضافة فتات الخبز المخصصة

لإنشاء مسار تنقل جديد لصفحة معينة، استخدم المكون القابل لإعادة الاستخدام `Breadcrumb` :

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';

export function SettingsBreadcrumb() {
  return (
    <Breadcrumb
      items={[
        { label: 'Dashboard', href: '/client/dashboard' },
        { label: 'Settings' },
      ]}
      homeLabel="Home"
      className="mb-6"
    />
  );
}
```

بالنسبة للصفحات التي تحتاج إلى تسميات مترجمة، قم بلف المكون وتمرير السلاسل المترجمة:

```tsx
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { useTranslations } from 'next-intl';

export function LocalizedBreadcrumb() {
  const t = useTranslations('common');
  return (
    <Breadcrumb
      items={[
        { label: t('DASHBOARD'), href: '/client/dashboard' },
        { label: t('SETTINGS') },
      ]}
      homeLabel={t('HOME')}
    />
  );
}
```

## الملفات ذات الصلة

| ملف | الوصف |
|------|------------|
| `components/ui/breadcrumb.tsx` | مكون التنقل العام القابل لإعادة الاستخدام |
| `components/item-detail/breadcrumb.tsx` | صفحة تفاصيل العنصر |
| `app/[locale]/collections/components/collections-breadcrumb.tsx` | المجموعات التفصيلية لصفحة |
| `hooks/use-categories-enabled.ts` | ربط للتحقق مما إذا كانت ميزة الفئات نشطة |
| 4ـ | المرافق لتوليد سبيكة ( `slugify` , `deslugify` ) |
