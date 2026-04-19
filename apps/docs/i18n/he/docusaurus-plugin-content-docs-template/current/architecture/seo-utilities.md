---
id: seo-utilities
title: כלי עזר לקידום אתרים
sidebar_label: כלי עזר לקידום אתרים
sidebar_position: 37
---

# כלי עזר לקידום אתרים

התבנית כוללת קבוצה של כלי עזר לקידום אתרים להפקת נתונים מובנים JSON-LD, תגיות hreflang עבור דפים רב לשוניים ואובייקטים Next.js `Metadata` לרישום דפים. כלי עזר אלה מבטיחים שמנועי חיפוש יכנסו ויציגו תוכן בצורה נכונה.

## מבנה הקובץ

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## נתונים מובנים של JSON-LD (`schema.ts`)

### סכימת מוצר

צור `schema.org/Product` נתונים מובנים עבור דפי פרטי פריט:

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

הפלט של JSON-LD שנוצר:

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

כל השדות מלבד `name`, `description` ו-`url` הם אופציונליים ונכללים בפלט רק כאשר הם מסופקים.

### סכימת ארגון

צור `schema.org/Organization` נתונים מובנים עבור האתר. זה בדרך כלל ממוקם בדף הבית כדי להופיע בלוח הידע של Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

הפונקציה קוראת מ-`siteConfig` ויוצרת:

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

מערך `sameAs` מאוכלס מ-`siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, בלוג), עם ערכים ריקים מסוננים. ה-`contactPoint` מתווסף רק כאשר הוגדר דוא"ל.

### סכימת אתר אינטרנט

צור `schema.org/WebSite` עם `SearchAction` לחיפוש קישורי sitelink:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

פלט עבור אזור ברירת המחדל:

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

### סכימת פירורי לחם

צור `schema.org/BreadcrumbList` עבור פירורי לחם ניווט:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## תגי Hreflang (`hreflang.ts`)

תגי Hreflang מספרים למנועי החיפוש אילו גרסאות שפה של דף זמינות. התבנית יוצרת אלה עבור כל 20+ המקומות הנתמכים.

### יצירת כתובות אתרים

הפונקציה `getLocalizedUrl` עוקבת אחר תבנית קידומת המקום "לפי הצורך":

- למיקום ברירת המחדל (`en`) אין קידומת: `https://example.com/about`
- מקומות אחרים מקבלים קידומת: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### יצירת חלופות הרפלנג

הפונקציה `generateHreflangAlternates` מחזירה אובייקט תואם ל-Next.js `Metadata.alternates.languages`:

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

### שימוש ב-`generateMetadata`

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

### פונקציות נוחות

עבור מסלולים דינמיים נפוצים, פונקציות קיצור זמינות:

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

## מטא נתונים של רישום (`listing-metadata.ts`)

הפונקציה `generateListingMetadata` יוצרת אובייקט Next.js `Metadata` שלם עבור דפי רישום ואינדקס:

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

הפונקציה יוצרת:

|שדה|ערך|
|-------|-------|
|`title`|`"כלים למפתחים \|עובד תמיד"`|
|`description`|מותאם אישית או שנוצר אוטומטית עם ספירת פריטים|
|`keywords`|מילות מפתח מופרדות בפסיקים|
|`openGraph.type`|`"website"`|
|`openGraph.url`|כתובת אתר קנונית עם קידומת מקומית|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|כתובת URL קנונית מלאה|
|`alternates.languages`|Hreflang חלופי עבור כל האזורים|

ה-`description` נוצר אוטומטית כאשר אינו מסופק: `"Browse 150 developer tools. Directory of tools and services"`.

### ממשק אפשרויות

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

## עיבוד JSON-LD ב-Pages

הוסף את הסכימות שנוצרו לדף שלך באמצעות תג `script`:

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

## קבצים קשורים

- `lib/seo/schema.ts` - מחוללי סכימות JSON-LD
- `lib/seo/hreflang.ts` - כלי עזר לתג Hreflang
- `lib/seo/listing-metadata.ts` - מחולל מטא נתונים של דפי רישום
- `lib/config/client.ts` - `siteConfig` בשימוש על ידי מחוללי סכמות
- `lib/constants.ts` - `LOCALES` ו-`DEFAULT_LOCALE` בשימוש על ידי hreflang
