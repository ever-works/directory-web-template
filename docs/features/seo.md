---
id: seo
title: SEO Configuration
sidebar_label: SEO
sidebar_position: 8
---

# SEO Configuration

The Ever Works template provides comprehensive SEO support including JSON-LD structured data, hreflang tags for multilingual content, OpenGraph metadata, automated sitemaps, and robots.txt configuration.

## JSON-LD Structured Data

Located at `lib/seo/schema.ts`, the schema utilities generate Schema.org structured data for various content types.

### Product Schema

Used on item detail pages:

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

Generates:
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

### Organization Schema

Used for site-wide brand identity on the homepage and about pages.

### Other Schema Types

The module provides generators for:
- **WebSite** -- Site-level metadata with search action
- **BreadcrumbList** -- Navigation breadcrumbs
- **FAQPage** -- FAQ sections with question/answer pairs
- **ItemList** -- Category and collection listing pages

## Hreflang Tags

Located at `lib/seo/hreflang.ts`, the hreflang utility generates language alternate links for search engines.

### Supported Locales

The template supports 20+ locales:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### URL Generation

The hreflang utility follows the "as-needed" locale prefix pattern:
- Default locale (`en`) uses the root path: `https://example.com/page`
- Other locales use prefixed paths: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Locale-to-Hreflang Mapping

Each locale maps to its ISO 639-1 hreflang value. Most use the same code, but some require special handling for regional variants.

## Listing Metadata

Located at `lib/seo/listing-metadata.ts`, this module generates metadata for listing pages including category pages, search results, and filtered views with appropriate title templates, descriptions, and canonical URLs.

## OpenGraph & Twitter Cards

The template generates OpenGraph and Twitter Card metadata through Next.js Metadata API in page components:

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

## Sitemap

Located at `app/sitemap.ts`, the sitemap is automatically generated using Next.js built-in sitemap support:

- **Static pages** -- Home, about, pricing, contact
- **Dynamic pages** -- All published items, categories, collections
- **Localized URLs** -- Each page generates entries for all active locales
- **Priority and frequency** -- Configured per page type

## Robots.txt

Located at `app/robots.ts`, the robots configuration:

- Allows all crawlers by default
- Points to the sitemap URL
- Optionally blocks admin and API routes from indexing
- Configurable via environment for staging/production differences

## Best Practices

1. **Every page should have unique metadata** -- Use `generateMetadata()` in page components
2. **Include JSON-LD on detail pages** -- Product schema for items, Organization for homepage
3. **Set canonical URLs** -- Prevent duplicate content across localized versions
4. **Use the hreflang utility** -- Ensures search engines serve the correct language version
5. **Keep descriptions under 160 characters** -- Optimal for search result snippets
