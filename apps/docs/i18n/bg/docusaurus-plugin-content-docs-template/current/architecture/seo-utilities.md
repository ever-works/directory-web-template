---
id: seo-utilities
title: SEO помощни програми
sidebar_label: SEO помощни програми
sidebar_position: 37
---

# SEO помощни програми

Шаблонът включва набор от помощни програми за SEO за генериране на JSON-LD структурирани данни, тагове hreflang за многоезични страници и обекти Next.js `Metadata` за изброяване на страници. Тези помощни програми гарантират, че търсачките правилно индексират и показват съдържание.

## Файлова структура

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## JSON-LD структурирани данни (`schema.ts`)

### Продуктова схема

Генерирайте `schema.org/Product` структурирани данни за страници с подробности за артикулите:

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

Генерираният JSON-LD изход:

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

Всички полета с изключение на `name`, `description` и `url` са незадължителни и се включват в изхода само когато са предоставени.

### Организационна схема

Генерирайте `schema.org/Organization` структурирани данни за сайта. Това обикновено се поставя на началната страница, за да се покаже в панела със знания на Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

Функцията чете от `siteConfig` и генерира:

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

Масивът `sameAs` се попълва от `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, блог), като празните стойности са филтрирани. `contactPoint` се добавя само когато е конфигуриран имейл.

### Схема на уеб сайта

Генерирайте `schema.org/WebSite` с `SearchAction` за търсене на връзки към сайта:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Изход за локала по подразбиране:

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

### Навигационна схема

Генерирайте `schema.org/BreadcrumbList` за пътеки за навигация:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Етикети Hreflang (`hreflang.ts`)

Hreflang таговете казват на търсачките кои езикови версии на дадена страница са налични. Шаблонът ги генерира за всички 20+ поддържани локали.

### Генериране на URL

Функцията `getLocalizedUrl` следва модела на префикса на локала "както е необходимо":

- Локал по подразбиране (`en`) няма префикс: `https://example.com/about`
- Други локали получават префикс: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Генериране на Hreflang алтернативи

Функцията `generateHreflangAlternates` връща обект, съвместим с Next.js `Metadata.alternates.languages`:

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

### Използване в `generateMetadata`

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

### Функции за удобство

За общи динамични маршрути са налични съкратени функции:

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

## Метаданни за списък (`listing-metadata.ts`)

Функцията `generateListingMetadata` създава пълен Next.js `Metadata` обект за списък и индексни страници:

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

Функцията генерира:

|Поле|Стойност|
|-------|-------|
|`title`|`"Инструменти за разработчици \|Винаги работи"`|
|`description`|Персонализирано или автоматично генерирано с брой елементи|
|`keywords`|Ключови думи, разделени със запетая|
|`openGraph.type`|`"website"`|
|`openGraph.url`|Каноничен URL адрес с локален префикс|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|Пълен каноничен URL адрес|
|`alternates.languages`|Hreflang се редува за всички локали|

`description` се генерира автоматично, когато не е предоставен: `"Browse 150 developer tools. Directory of tools and services"`.

### Интерфейс с опции

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

## Изобразяване на JSON-LD в страници

Добавете генерираните схеми към страницата си с помощта на етикет `script`:

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

## Свързани файлове

- `lib/seo/schema.ts` - Генератори на JSON-LD схеми
- `lib/seo/hreflang.ts` - Помощни програми за тагове Hreflang
- `lib/seo/listing-metadata.ts` - Генератор на метаданни на страницата с обяви
- `lib/config/client.ts` - `siteConfig` използвано от генератори на схеми
- `lib/constants.ts` - `LOCALES` и `DEFAULT_LOCALE` използвани от hreflang
