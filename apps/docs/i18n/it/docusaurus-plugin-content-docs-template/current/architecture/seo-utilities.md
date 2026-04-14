---
id: seo-utilities
title: Utilità SEO
sidebar_label: Utilità SEO
sidebar_position: 37
---

# Utilità SEO

Il modello include una serie di utilità SEO per generare dati strutturati JSON-LD, tag hreflang per pagine multilingue e oggetti Next.js `Metadata` per elencare le pagine. Queste utilità garantiscono che i motori di ricerca indicizzino e visualizzino correttamente i contenuti.

## Struttura dei file

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Dati strutturati JSON-LD (`schema.ts`)

### Schema del prodotto

Genera dati strutturati `schema.org/Product` per le pagine dei dettagli dell'articolo:

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

L'output JSON-LD generato:

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

Tutti i campi tranne `name`, `description` e `url` sono facoltativi e sono inclusi nell'output solo quando forniti.

### Schema organizzativo

Genera `schema.org/Organization` dati strutturati per il sito. Questo viene generalmente inserito nella home page per apparire nel pannello di conoscenza di Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

La funzione legge da `siteConfig` e genera:

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

L'array `sameAs` è popolato da `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), con i valori vuoti filtrati. `contactPoint` viene aggiunto solo quando viene configurata un'e-mail.

### Schema del sito Web

Genera `schema.org/WebSite` con un `SearchAction` per la ricerca dei sitelink:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Output per la locale predefinita:

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

### Schema del pangrattato

Genera `schema.org/BreadcrumbList` per i breadcrumb di navigazione:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Tag hreflang (`hreflang.ts`)

I tag hreflang indicano ai motori di ricerca quali versioni linguistiche di una pagina sono disponibili. Il modello li genera per tutte le oltre 20 lingue supportate.

### Generazione dell'URL

La funzione `getLocalizedUrl` segue lo schema del prefisso locale "secondo necessità":

- La locale predefinita (`en`) non ha prefisso: `https://example.com/about`
- Altre impostazioni locali ricevono un prefisso: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Generazione di alternative Hreflang

La funzione `generateHreflangAlternates` restituisce un oggetto compatibile con Next.js `Metadata.alternates.languages`:

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

### Utilizzo in `generateMetadata`

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

### Funzioni di convenienza

Per i percorsi dinamici comuni sono disponibili funzioni abbreviate:

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

## Metadati dell'elenco (`listing-metadata.ts`)

La funzione `generateListingMetadata` crea un oggetto Next.js completo `Metadata` per l'elenco e l'indice delle pagine:

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

La funzione genera:

|Campo|Valore|
|-------|-------|
|`title`|`"Strumenti per sviluppatori \|Funziona sempre"`|
|`description`|Personalizzato o generato automaticamente con il conteggio degli articoli|
|`keywords`|Parole chiave separate da virgole|
|`openGraph.type`|`"website"`|
|`openGraph.url`|URL canonico con prefisso locale|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|URL canonico completo|
|`alternates.languages`|L'hreflang si alterna per tutte le localizzazioni|

`description` viene generato automaticamente quando non fornito: `"Browse 150 developer tools. Directory of tools and services"`.

### Interfaccia delle opzioni

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

## Rendering JSON-LD in pagine

Aggiungi gli schemi generati alla tua pagina utilizzando un tag `script`:

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

## File correlati

- `lib/seo/schema.ts` - Generatori di schemi JSON-LD
- `lib/seo/hreflang.ts` - Utilità tag Hreflang
- `lib/seo/listing-metadata.ts` - Generatore di metadati della pagina di elenco
- `lib/config/client.ts` - `siteConfig` utilizzato dai generatori di schemi
- `lib/constants.ts` - `LOCALES` e `DEFAULT_LOCALE` utilizzati da hreflang
