---
id: seo
title: SEO-configuratie
sidebar_label: SEO
sidebar_position: 8
---

# SEO-configuratie

De Ever Works-sjabloon biedt uitgebreide SEO-ondersteuning, waaronder gestructureerde JSON-LD-gegevens, hreflang-tags voor meertalige inhoud, OpenGraph-metagegevens, geautomatiseerde sitemaps en robots.txt-configuratie.

## JSON-LD gestructureerde gegevens

De schemahulpprogramma's, gelegen op `lib/seo/schema.ts` , genereren gestructureerde gegevens van Schema.org voor verschillende inhoudstypen.

### Productschema

Gebruikt op itemdetailpagina's:

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

Genereert:
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

### Organisatieschema

Gebruikt voor merkidentiteit voor de hele site op de startpagina en over-pagina's.

### Andere schematypen

De module biedt generatoren voor:
- **WebSite** -- Metagegevens op siteniveau met zoekactie
- **Broodkruimellijst** -- Navigatie-broodkruimels
- **FAQPagina** -- FAQ-secties met vraag/antwoord-paren
- **ItemList** -- Pagina's met categorie- en collectieoverzichten

## Hreflang-tags

Het hreflang-hulpprogramma bevindt zich op `lib/seo/hreflang.ts` en genereert alternatieve taallinks voor zoekmachines.

### Ondersteunde landinstellingen

De sjabloon ondersteunt meer dan 20 landinstellingen:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### URL-generatie

Het hreflang-hulpprogramma volgt het "indien nodig" locale-voorvoegselpatroon:
- Standaardlandinstelling ( `en` ) gebruikt het hoofdpad: `https://example.com/page` - Andere landinstellingen gebruiken vooraf ingestelde paden: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Locale-naar-Hreflang-toewijzing

Elke landinstelling wordt toegewezen aan de ISO 639-1 hreflang-waarde. De meeste gebruiken dezelfde code, maar sommige vereisen een speciale behandeling voor regionale varianten.

## Metagegevens vermelden

Deze module bevindt zich op `lib/seo/listing-metadata.ts` en genereert metagegevens voor vermeldingspagina's, waaronder categoriepagina's, zoekresultaten en gefilterde weergaven met de juiste titelsjablonen, beschrijvingen en canonieke URL's.

## OpenGraph- en Twitter-kaarten

De sjabloon genereert OpenGraph- en Twitter Card-metagegevens via de Next.js Metadata API in paginacomponenten:

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

De sitemap bevindt zich op `app/sitemap.ts` en wordt automatisch gegenereerd met behulp van de ingebouwde sitemapondersteuning van Next.js:

- **Statische pagina's** -- Home, over, prijzen, contact
- **Dynamische pagina's** -- Alle gepubliceerde items, categorieën, collecties
- **Gelokaliseerde URL's** -- Elke pagina genereert vermeldingen voor alle actieve landinstellingen
- **Prioriteit en frequentie** -- Geconfigureerd per paginatype

## Robots.txt

Gelegen op `app/robots.ts` , de robots-configuratie:

- Staat standaard alle crawlers toe
- Verwijst naar de sitemap-URL
- Blokkeert optioneel beheerders- en API-routes van indexering
- Configureerbaar via omgeving voor staging/productieverschillen

## Beste praktijken

1. **Elke pagina moet unieke metadata hebben** -- Gebruik `generateMetadata()` in paginacomponenten
2. **Neem JSON-LD op op detailpagina's** -- Productschema voor artikelen, Organisatie voor startpagina
3. **Stel canonieke URL's in** - Voorkom dubbele inhoud in gelokaliseerde versies
4. **Gebruik het hreflang-hulpprogramma** - Zorgt ervoor dat zoekmachines de juiste taalversie aanbieden
5. **Houd beschrijvingen onder de 160 tekens** -- Optimaal voor fragmenten van zoekresultaten
