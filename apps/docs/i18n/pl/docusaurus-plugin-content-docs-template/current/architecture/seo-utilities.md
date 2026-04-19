---
id: seo-utilities
title: Narzędzia SEO
sidebar_label: Narzędzia SEO
sidebar_position: 37
---

# Narzędzia SEO

Szablon zawiera zestaw narzędzi SEO do generowania danych strukturalnych JSON-LD, tagi hreflang dla stron wielojęzycznych i obiekty Next.js `Metadata` dla stron z listami. Narzędzia te zapewniają, że wyszukiwarki prawidłowo indeksują i wyświetlają treść.

## Struktura pliku

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Dane strukturalne JSON-LD (`schema.ts`)

### Schemat produktu

Generuj `schema.org/Product` dane strukturalne dla stron ze szczegółami pozycji:

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

Wygenerowane wyjście JSON-LD:

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

Wszystkie pola z wyjątkiem `name`, `description` i `url` są opcjonalne i uwzględniane w wynikach tylko wtedy, gdy są podane.

### Schemat organizacyjny

Wygeneruj `schema.org/Organization` uporządkowane dane dla witryny. Zwykle jest on umieszczany na stronie głównej i wyświetlany w Panelu wiedzy Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

Funkcja odczytuje z `siteConfig` i generuje:

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

Tablica `sameAs` jest wypełniana z `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), a puste wartości są odfiltrowywane. `contactPoint` jest dodawany tylko wtedy, gdy skonfigurowana jest poczta e-mail.

### Schemat witryny internetowej

Wygeneruj `schema.org/WebSite` z `SearchAction` do wyszukiwania linków do podstron:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Dane wyjściowe dla domyślnych ustawień regionalnych:

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

### Schemat bułki tartej

Wygeneruj `schema.org/BreadcrumbList` dla okruchów nawigacji:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Tagi Hreflang (`hreflang.ts`)

Tagi Hreflang informują wyszukiwarki, które wersje językowe strony są dostępne. Szablon generuje je dla wszystkich ponad 20 obsługiwanych ustawień regionalnych.

### Generowanie adresu URL

Funkcja `getLocalizedUrl` jest zgodna ze wzorcem prefiksu ustawień regionalnych „w razie potrzeby”:

- Domyślne ustawienia regionalne (`en`) nie mają prefiksu: `https://example.com/about`
- Inne lokalizacje otrzymują prefiks: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Generowanie alternatyw Hreflang

Funkcja `generateHreflangAlternates` zwraca obiekt zgodny z Next.js `Metadata.alternates.languages`:

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

### Użycie w `generateMetadata`

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

### Funkcje zapewniające wygodę

W przypadku typowych tras dynamicznych dostępne są funkcje skrócone:

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

## Metadane aukcji (`listing-metadata.ts`)

Funkcja `generateListingMetadata` tworzy kompletny obiekt Next.js `Metadata` dla stron z listami i indeksami:

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

Funkcja generuje:

|Pole|Wartość|
|-------|-------|
|`title`|`"Narzędzia programistyczne \|Zawsze działa”`|
|`description`|Niestandardowe lub generowane automatycznie z liczbą pozycji|
|`keywords`|Słowa kluczowe oddzielone przecinkami|
|`openGraph.type`|`"website"`|
|`openGraph.url`|Kanoniczny adres URL z prefiksem ustawień regionalnych|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|Pełny kanoniczny adres URL|
|`alternates.languages`|Hreflang jest alternatywny dla wszystkich ustawień regionalnych|

`description` jest generowany automatycznie, jeśli nie został podany: `"Browse 150 developer tools. Directory of tools and services"`.

### Opcje Interfejs

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

## Renderowanie JSON-LD na stronach

Dodaj wygenerowane schematy do swojej strony za pomocą tagu `script`:

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

## Powiązane pliki

- `lib/seo/schema.ts` - Generatory schematów JSON-LD
- `lib/seo/hreflang.ts` - Narzędzia tagów Hreflang
- `lib/seo/listing-metadata.ts` - Generator metadanych strony z listą
- `lib/config/client.ts` - `siteConfig` używane przez generatory schematów
- `lib/constants.ts` - `LOCALES` i `DEFAULT_LOCALE` używane przez hreflang
