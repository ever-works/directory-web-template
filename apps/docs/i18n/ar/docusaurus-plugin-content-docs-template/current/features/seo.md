---
id: seo
title: تكوين كبار المسئولين الاقتصاديين
sidebar_label: تحسين محركات البحث
sidebar_position: 8
---

# تكوين كبار المسئولين الاقتصاديين

يوفر قالب Ever Works دعمًا شاملاً لتحسين محركات البحث، بما في ذلك البيانات المنظمة JSON-LD، وعلامات hreflang للمحتوى متعدد اللغات، وبيانات تعريف OpenGraph، وخرائط الموقع الآلية، وتكوين ملف robots.txt.

## البيانات المنظمة JSON-LD

تقع الأدوات المساعدة للمخطط في `lib/seo/schema.ts` ، وتقوم بإنشاء بيانات Schema.org المنظمة لأنواع المحتوى المختلفة.

### مخطط المنتج

المستخدمة في صفحات تفاصيل العنصر:

```typescript
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Product Name',
  description: 'Product description',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/product',
  category: 'Software',
  sourceUrl: 'https://product-website.com',
  brandName: 'Brand Name',
});
```

يولد:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product",
  "category": "Software",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://product-website.com",
    "availability": "https://schema.org/InStock"
  }
}
```

### مخطط المنظمة

يتم استخدامه لهوية العلامة التجارية على مستوى الموقع على الصفحة الرئيسية والصفحات الخاصة به.

### أنواع المخططات الأخرى

توفر الوحدة مولدات لـ:
- **موقع الويب** - بيانات التعريف على مستوى الموقع مع إجراء البحث
- **قائمة مسارات التنقل** - مسارات التنقل
- **FAQPage** - أقسام الأسئلة الشائعة مع أزواج الأسئلة والأجوبة
- **ItemList** - صفحات قائمة الفئات والمجموعات

## علامات Hreflang

تقع الأداة المساعدة hreflang على `lib/seo/hreflang.ts` ، وتقوم بإنشاء روابط بديلة للغة لمحركات البحث.

### اللغات المدعومة

يدعم القالب أكثر من 20 لغة:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### إنشاء عنوان URL

تتبع الأداة المساعدة hreflang نمط البادئة المحلية "حسب الحاجة":
- تستخدم اللغة الافتراضية ( `en` ) المسار الجذر: `https://example.com/page` - تستخدم اللغات الأخرى مسارات مسبوقة: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### رسم الخرائط من المنطقة إلى Hreflang

ترتبط كل لغة بقيمتها الخاصة بمعيار ISO 639-1 hreflang. يستخدم معظمها نفس الرمز، لكن بعضها يتطلب معالجة خاصة للمتغيرات الإقليمية.

## قائمة البيانات الوصفية

تقع هذه الوحدة في `lib/seo/listing-metadata.ts` ، وتقوم بإنشاء بيانات تعريف لصفحات القائمة بما في ذلك صفحات الفئات ونتائج البحث وطرق العرض المصفاة مع قوالب العناوين والأوصاف وعناوين URL الأساسية المناسبة.

## بطاقات OpenGraph وتويتر

يقوم القالب بإنشاء بيانات تعريف OpenGraph وTwitter Card من خلال Next.js Metadata API في مكونات الصفحة:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title',
    description: 'Page description',
    openGraph: {
      title: 'Page Title',
      description: 'Page description',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Page Title',
      description: 'Page description',
    },
    alternates: {
      languages: generateHreflangTags('/current-path'),
    },
  };
}
```

## خريطة الموقع

يقع في `app/sitemap.ts` ، ويتم إنشاء خريطة الموقع تلقائيًا باستخدام دعم خريطة الموقع المضمنة في Next.js:

- **الصفحات الثابتة** - الصفحة الرئيسية، نبذة، الأسعار، جهة الاتصال
- **الصفحات الديناميكية** - جميع العناصر والفئات والمجموعات المنشورة
- **عناوين URL المترجمة** - تنشئ كل صفحة إدخالات لجميع اللغات النشطة
- **الأولوية والتكرار** - يتم تكوينها حسب نوع الصفحة

## ملف الروبوتات.txt

يقع في `app/robots.ts` ، تكوين الروبوتات:

- يسمح لجميع برامج الزحف بشكل افتراضي
- يشير إلى عنوان URL لخريطة الموقع
- يمنع بشكل اختياري مسارات الإدارة وواجهة برمجة التطبيقات من الفهرسة
- قابل للتكوين عبر البيئة لاختلافات التدريج/الإنتاج

## أفضل الممارسات

1. **يجب أن تحتوي كل صفحة على بيانات تعريف فريدة** - استخدم `generateMetadata()` في مكونات الصفحة
2. **قم بتضمين JSON-LD في صفحات التفاصيل** - مخطط المنتج للعناصر، وتنظيم الصفحة الرئيسية
3. **تعيين عناوين URL الأساسية** - منع المحتوى المكرر عبر الإصدارات المترجمة
4. **استخدم الأداة المساعدة hreflang** -- يضمن أن محركات البحث تقدم إصدار اللغة الصحيح
5. **احتفظ بالأوصاف أقل من 160 حرفًا** -- مثالي لمقتطفات نتائج البحث
