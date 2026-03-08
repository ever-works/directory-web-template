---
id: seo-utilities
title: SEO Utilities
sidebar_label: SEO Utilities
sidebar_position: 37
---

# SEO Utilities

The template includes a set of SEO utilities for generating JSON-LD structured data, hreflang tags for multilingual pages, and Next.js `Metadata` objects for listing pages. These utilities ensure search engines correctly index and display content.

## File Structure

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## JSON-LD Structured Data (`schema.ts`)

### Product Schema

Generate `schema.org/Product` structured data for item detail pages:

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

The generated JSON-LD output:

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

All fields except `name`, `description`, and `url` are optional and are only included in the output when provided.

### Organization Schema

Generate `schema.org/Organization` structured data for the site. This is typically placed on the homepage to appear in Google's Knowledge Panel:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

The function reads from `siteConfig` and generates:

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

The `sameAs` array is populated from `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), with empty values filtered out. The `contactPoint` is only added when an email is configured.

### WebSite Schema

Generate `schema.org/WebSite` with a `SearchAction` for sitelinks search:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Output for the default locale:

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

### Breadcrumb Schema

Generate `schema.org/BreadcrumbList` for navigation breadcrumbs:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Hreflang Tags (`hreflang.ts`)

Hreflang tags tell search engines which language versions of a page are available. The template generates these for all 20+ supported locales.

### URL Generation

The `getLocalizedUrl` function follows the "as-needed" locale prefix pattern:

- Default locale (`en`) has no prefix: `https://example.com/about`
- Other locales get a prefix: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Generating Hreflang Alternates

The `generateHreflangAlternates` function returns an object compatible with Next.js `Metadata.alternates.languages`:

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

### Usage in `generateMetadata`

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

### Convenience Functions

For common dynamic routes, shorthand functions are available:

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

## Listing Metadata (`listing-metadata.ts`)

The `generateListingMetadata` function creates a complete Next.js `Metadata` object for listing and index pages:

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

The function generates:

| Field | Value |
|-------|-------|
| `title` | `"Developer Tools \| Ever Works"` |
| `description` | Custom or auto-generated with item count |
| `keywords` | Comma-separated keywords |
| `openGraph.type` | `"website"` |
| `openGraph.url` | Canonical URL with locale prefix |
| `twitter.card` | `"summary_large_image"` |
| `alternates.canonical` | Full canonical URL |
| `alternates.languages` | Hreflang alternates for all locales |

The `description` is auto-generated when not provided: `"Browse 150 developer tools. Directory of tools and services"`.

### Options Interface

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

## Rendering JSON-LD in Pages

Add the generated schemas to your page using a `script` tag:

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

## Related Files

- `lib/seo/schema.ts` - JSON-LD schema generators
- `lib/seo/hreflang.ts` - Hreflang tag utilities
- `lib/seo/listing-metadata.ts` - Listing page metadata generator
- `lib/config/client.ts` - `siteConfig` used by schema generators
- `lib/constants.ts` - `LOCALES` and `DEFAULT_LOCALE` used by hreflang
