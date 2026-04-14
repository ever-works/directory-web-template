---
id: seo-utilities
title: SEO-hulpprogramma's
sidebar_label: SEO-hulpprogramma's
sidebar_position: 37
---

# SEO-hulpprogramma's

De sjabloon bevat een reeks SEO-hulpprogramma's voor het genereren van gestructureerde JSON-LD-gegevens, hreflang-tags voor meertalige pagina's en Next.js `Metadata`-objecten voor het weergeven van pagina's. Deze hulpprogramma's zorgen ervoor dat zoekmachines de inhoud correct indexeren en weergeven.

## Bestandsstructuur

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## JSON-LD gestructureerde gegevens (`schema.ts`)

### Productschema

Genereer `schema.org/Product` gestructureerde gegevens voor artikeldetailpagina's:

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

De gegenereerde JSON-LD-uitvoer:

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

Alle velden behalve `name`, `description` en `url` zijn optioneel en worden alleen in de uitvoer opgenomen als ze zijn opgegeven.

### Organisatieschema

Genereer `schema.org/Organization` gestructureerde gegevens voor de site. Dit wordt doorgaans op de startpagina geplaatst en weergegeven in het Kennispaneel van Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

De functie leest van `siteConfig` en genereert:

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

De array `sameAs` wordt gevuld vanuit `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), waarbij lege waarden worden uitgefilterd. De `contactPoint` wordt alleen toegevoegd als er een e-mail is geconfigureerd.

### Websiteschema

Genereer `schema.org/WebSite` met een `SearchAction` voor het zoeken naar sitelinks:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Uitvoer voor de standaardlandinstelling:

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

### Broodkruimelschema

Genereer `schema.org/BreadcrumbList` voor navigatiebroodkruimels:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Hreflang-tags (`hreflang.ts`)

Hreflang-tags vertellen zoekmachines welke taalversies van een pagina beschikbaar zijn. De sjabloon genereert deze voor alle 20+ ondersteunde landinstellingen.

### URL-generatie

De functie `getLocalizedUrl` volgt het "indien nodig" locale-voorvoegselpatroon:

- Standaardlandinstelling (`en`) heeft geen voorvoegsel: `https://example.com/about`
- Andere landinstellingen krijgen een voorvoegsel: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Hreflang-alternatieven genereren

De functie `generateHreflangAlternates` retourneert een object dat compatibel is met Next.js `Metadata.alternates.languages`:

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

### Gebruik in `generateMetadata`

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

### Gemaksfuncties

Voor veel voorkomende dynamische routes zijn stenofuncties beschikbaar:

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

## Metagegevens vermelden (`listing-metadata.ts`)

De functie `generateListingMetadata` maakt een compleet Next.js `Metadata`-object voor lijst- en indexpagina's:

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

De functie genereert:

|Veld|Waarde|
|-------|-------|
|`title`|`"Hulpprogramma's voor ontwikkelaars \|Werkt ooit"`|
|`description`|Aangepast of automatisch gegenereerd met aantal artikelen|
|`keywords`|Door komma's gescheiden trefwoorden|
|`openGraph.type`|`"website"`|
|`openGraph.url`|Canonieke URL met landinstellingsvoorvoegsel|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|Volledige canonieke URL|
|`alternates.languages`|Hreflang is een alternatief voor alle landinstellingen|

De `description` wordt automatisch gegenereerd als deze niet is opgegeven: `"Browse 150 developer tools. Directory of tools and services"`.

### Opties-interface

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

## JSON-LD weergeven in Pages

Voeg de gegenereerde schema's toe aan uw pagina met behulp van een `script` tag:

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

## Gerelateerde bestanden

- `lib/seo/schema.ts` - JSON-LD-schemageneratoren
- `lib/seo/hreflang.ts` - Hreflang-taghulpprogramma's
- `lib/seo/listing-metadata.ts` - Metagegevensgenerator voor vermeldingspagina's
- `lib/config/client.ts` - `siteConfig` gebruikt door schemageneratoren
- `lib/constants.ts` - `LOCALES` en `DEFAULT_LOCALE` gebruikt door hreflang
