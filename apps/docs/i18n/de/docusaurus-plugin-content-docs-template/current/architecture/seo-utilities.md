---
id: seo-utilities
title: SEO-Dienstprogramme
sidebar_label: SEO-Dienstprogramme
sidebar_position: 37
---

# SEO-Dienstprogramme

Die Vorlage enthält eine Reihe von SEO-Dienstprogrammen zum Generieren strukturierter JSON-LD-Daten, Hreflang-Tags für mehrsprachige Seiten und Next.js `Metadata`-Objekte zum Auflisten von Seiten. Diese Dienstprogramme stellen sicher, dass Suchmaschinen Inhalte korrekt indizieren und anzeigen.

## Dateistruktur

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Strukturierte JSON-LD-Daten (`schema.ts`)

### Produktschema

Generieren Sie `schema.org/Product` strukturierte Daten für Artikeldetailseiten:

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

Die generierte JSON-LD-Ausgabe:

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

Alle Felder außer `name`, `description` und `url` sind optional und werden nur dann in die Ausgabe einbezogen, wenn sie bereitgestellt werden.

### Organisationsschema

Generieren Sie `schema.org/Organization` strukturierte Daten für die Site. Dies wird normalerweise auf der Startseite platziert, um im Knowledge Panel von Google zu erscheinen:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

Die Funktion liest aus `siteConfig` und generiert:

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

Das `sameAs`-Array wird von `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, Blog) aufgefüllt, wobei leere Werte herausgefiltert werden. Das `contactPoint` wird nur hinzugefügt, wenn eine E-Mail konfiguriert ist.

### Website-Schema

Generieren Sie `schema.org/WebSite` mit einem `SearchAction` für die Sitelink-Suche:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Ausgabe für das Standardgebietsschema:

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

### Breadcrumb-Schema

Generieren Sie `schema.org/BreadcrumbList` für Navigations-Breadcrumbs:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Hreflang-Tags (`hreflang.ts`)

Hreflang-Tags teilen Suchmaschinen mit, welche Sprachversionen einer Seite verfügbar sind. Die Vorlage generiert diese für alle über 20 unterstützten Gebietsschemas.

### URL-Generierung

Die Funktion `getLocalizedUrl` folgt dem „nach Bedarf“-Locale-Präfixmuster:

- Das Standardgebietsschema (`en`) hat kein Präfix: `https://example.com/about`
- Andere Gebietsschemas erhalten ein Präfix: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Generieren von Hreflang-Alternativen

Die Funktion `generateHreflangAlternates` gibt ein Objekt zurück, das mit Next.js `Metadata.alternates.languages` kompatibel ist:

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

### Verwendung in `generateMetadata`

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

### Komfortfunktionen

Für gängige dynamische Routen stehen Kurzfunktionen zur Verfügung:

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

## Metadaten auflisten (`listing-metadata.ts`)

Die Funktion `generateListingMetadata` erstellt ein vollständiges Next.js-Objekt `Metadata` für Listen- und Indexseiten:

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

Die Funktion generiert:

|Feld|Wert|
|-------|-------|
|`title`|„Entwicklertools \|Funktioniert immer“`|
|`description`|Benutzerdefiniert oder automatisch generiert mit Artikelanzahl|
|`keywords`|Durch Kommas getrennte Schlüsselwörter|
|`openGraph.type`|`"website"`|
|`openGraph.url`|Kanonische URL mit Gebietsschema-Präfix|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|Vollständige kanonische URL|
|`alternates.languages`|Hreflang-Alternativen für alle Gebietsschemas|

Das `description` wird automatisch generiert, wenn es nicht angegeben wird: `"Browse 150 developer tools. Directory of tools and services"`.

### Optionsschnittstelle

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

## Rendern von JSON-LD in Seiten

Fügen Sie die generierten Schemata mithilfe eines `script`-Tags zu Ihrer Seite hinzu:

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

## Verwandte Dateien

- `lib/seo/schema.ts` – JSON-LD-Schemageneratoren
- `lib/seo/hreflang.ts` – Hreflang-Tag-Dienstprogramme
- `lib/seo/listing-metadata.ts` – Metadatengenerator für die Auflistungsseite
- `lib/config/client.ts` - `siteConfig` wird von Schemageneratoren verwendet
- `lib/constants.ts` - `LOCALES` und `DEFAULT_LOCALE` werden von hreflang verwendet
