---
id: seo-utilities
title: SEO Utilities
sidebar_label: SEO Utilities
sidebar_position: 37
---

# SEO Utilities

يتضمن القالب مجموعة من أدوات تحسين محركات البحث (SEO) لإنشاء بيانات منظمة JSON-LD، وعلامات hreflang للصفحات متعددة اللغات، وكائنات Next.js `Metadata` لإدراج الصفحات. تضمن هذه الأدوات المساعدة قيام محركات البحث بفهرسة المحتوى وعرضه بشكل صحيح.

## هيكل الملف

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## البيانات المنظمة JSON-LD (`schema.ts`)

### مخطط المنتج

إنشاء `schema.org/Product` بيانات منظمة لصفحات تفاصيل العنصر:

```ts
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Awesome Tool',
  description: 'A great tool for developers',
  image: 'https://example.com/tool.png',
  url: 'https://example.com/items/awesome-tool',
  category: 'Developer Tools',
  sourceUrl: 'https://awesome-tool.dev',
  brandName: 'ToolCorp',
});
```

مخرجات JSON-LD التي تم إنشاؤها:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Awesome Tool",
  "description": "A great tool for developers",
  "image": "https://example.com/tool.png",
  "url": "https://example.com/items/awesome-tool",
  "category": "Developer Tools",
  "brand": {
    "@type": "Brand",
    "name": "ToolCorp"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://awesome-tool.dev",
    "availability": "https://schema.org/InStock"
  }
}
```

جميع الحقول باستثناء `name` و`description` و`url` اختيارية ويتم تضمينها فقط في المخرجات عند توفرها.

### مخطط المنظمة

قم بإنشاء `schema.org/Organization` بيانات منظمة للموقع. يتم وضع هذا عادةً على الصفحة الرئيسية ليظهر في لوحة المعرفة الخاصة بـ Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

تقرأ الدالة من `siteConfig` وتقوم بإنشاء:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Ever Works",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "description": "Directory of tools and services",
  "sameAs": [
    "https://github.com/ever-works",
    "https://twitter.com/everworks"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "info@ever.works",
    "contactType": "customer service"
  }
}
```

تتم تعبئة المصفوفة `sameAs` من `siteConfig.social` (GitHub، X/Twitter، LinkedIn، Facebook، blog)، مع تصفية القيم الفارغة. تتم إضافة `contactPoint` فقط عند تكوين البريد الإلكتروني.

### WebSite Schema

أنشئ `schema.org/WebSite` باستخدام `SearchAction` للبحث في روابط أقسام الموقع:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

الإخراج للغة الافتراضية:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Ever Works Directory",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### مخطط التنقل

قم بإنشاء `schema.org/BreadcrumbList` لفتات التنقل:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## علامات Hreflang (`hreflang.ts`)

تخبر علامات Hreflang محركات البحث بإصدارات اللغة المتوفرة للصفحة. يقوم القالب بإنشاء هذه الإعدادات لجميع اللغات المدعومة التي يزيد عددها عن 20 لغة.

### إنشاء عنوان URL

تتبع الدالة `getLocalizedUrl` نمط البادئة المحلية "حسب الحاجة":

- اللغة الافتراضية (`en`) ليس لها بادئة: `https://example.com/about`
- تحصل اللغات الأخرى على بادئة: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### توليد بدائل Hreflang

تقوم الدالة `generateHreflangAlternates` بإرجاع كائن متوافق مع Next.js `Metadata.alternates.languages`:

```ts
import { generateHreflangAlternates } from '@/lib/seo/hreflang';

const languages = generateHreflangAlternates('/about');
// => {
//   'en': 'https://example.com/about',
//   'fr': 'https://example.com/fr/about',
//   'es': 'https://example.com/es/about',
//   'de': 'https://example.com/de/about',
//   ...all other locales...
//   'x-default': 'https://example.com/about',
// }
```

### الاستخدام في `generateMetadata`

```ts
// app/[locale]/about/page.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: 'About Us',
    alternates: {
      canonical: `/${locale}/about`,
      languages: generateHreflangAlternates('/about'),
    },
  };
}
```

### وظائف الراحة

بالنسبة للمسارات الديناميكية الشائعة، تتوفر وظائف مختصرة:

```ts
import {
  generateItemHreflangAlternates,
  generatePageHreflangAlternates,
} from '@/lib/seo/hreflang';

// For item detail pages: /items/[slug]
const itemAlternates = generateItemHreflangAlternates('awesome-tool');

// For CMS pages: /pages/[slug]
const pageAlternates = generatePageHreflangAlternates('privacy-policy');
```

## البيانات الوصفية للقائمة (`listing-metadata.ts`)

تقوم الدالة `generateListingMetadata` بإنشاء كائن Next.js `Metadata` كامل لإدراج الصفحات وفهرستها:

```ts
import { generateListingMetadata } from '@/lib/seo/listing-metadata';

export async function generateMetadata({ params }) {
  const { locale } = await params;

  return generateListingMetadata({
    title: 'Developer Tools',
    description: 'Browse the best developer tools and services',
    path: '/categories/developer-tools',
    locale,
    itemCount: 150,
    keywords: ['developer tools', 'programming', 'software'],
    imageUrl: 'https://example.com/og/dev-tools.png',
  });
}
```

تولد الدالة:

|الميدان|القيمة|
|-------|-------|
|`title`|`"أدوات المطور \"|يعمل من أي وقت مضى "".|
|`description`|مخصص أو تم إنشاؤه تلقائيًا مع عدد العناصر|
|`keywords`|كلمات رئيسية مفصولة بفواصل|
|`openGraph.type`|`"website"`|
|`openGraph.url`|عنوان URL الأساسي مع البادئة المحلية|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|عنوان URL الأساسي الكامل|
|`alternates.languages`|Hreflang بدائل لجميع اللغات|

يتم إنشاء `description` تلقائيًا عند عدم توفيره: `"Browse 150 developer tools. Directory of tools and services"`.

### واجهة الخيارات

```ts
interface ListingMetadataOptions {
  title: string;           // Page title (will be appended with site name)
  description?: string;    // Custom meta description (auto-generated if omitted)
  path: string;            // URL path without locale prefix
  locale: string;          // Current locale
  itemCount?: number;      // Number of items (used in auto-description)
  keywords?: string[];     // SEO keywords
  imageUrl?: string;       // Open Graph image URL
}
```

## تقديم JSON-LD في الصفحات

أضف المخططات التي تم إنشاؤها إلى صفحتك باستخدام علامة `script`:

```tsx
// app/[locale]/items/[slug]/page.tsx
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo/schema';

export default async function ItemPage({ params }) {
  const item = await getItem(params.slug);

  const productSchema = generateProductSchema({
    name: item.name,
    description: item.description,
    url: `https://example.com/items/${item.slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {/* Page content */}
    </>
  );
}
```

## الملفات ذات الصلة

- `lib/seo/schema.ts` - مولدات مخطط JSON-LD
- `lib/seo/hreflang.ts` - أدوات مساعدة لعلامات Hreflang
- `lib/seo/listing-metadata.ts` - منشئ البيانات الوصفية لصفحة القائمة
- `lib/config/client.ts` - `siteConfig` يستخدم بواسطة مولدات المخطط
- `lib/constants.ts` - `LOCALES` و`DEFAULT_LOCALE` يستخدم بواسطة hreflang
