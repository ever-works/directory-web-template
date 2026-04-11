---
id: seo
title: SEO-Konfiguration
sidebar_label: SEO
sidebar_position: 8
---

# SEO-Konfiguration

Die Ever Works-Vorlage bietet umfassende SEO-Unterstützung, einschließlich strukturierter JSON-LD-Daten, Hreflang-Tags für mehrsprachige Inhalte, OpenGraph-Metadaten, automatisierte Sitemaps und robots.txt-Konfiguration.

## Strukturierte JSON-LD-Daten

Die Schema-Dienstprogramme befinden sich unter `lib/seo/schema.ts` und generieren strukturierte Schema.org-Daten für verschiedene Inhaltstypen.

### Produktschema

Wird auf Artikeldetailseiten verwendet:

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

Erzeugt:
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

### Organisationsschema

Wird für die standortweite Markenidentität auf der Startseite und auf den About-Seiten verwendet.

### Andere Schematypen

Das Modul stellt Generatoren für Folgendes bereit:
- **WebSite** – Metadaten auf Site-Ebene mit Suchaktion
- **BreadcrumbList** – Navigations-Breadcrumbs
- **FAQPage** – FAQ-Abschnitte mit Frage/Antwort-Paaren
- **ItemList** – Seiten mit Kategorie- und Sammlungslisten

## Hreflang-Tags

Das Dienstprogramm hreflang befindet sich unter `lib/seo/hreflang.ts` und generiert alternative Sprachlinks für Suchmaschinen.

### Unterstützte Gebietsschemas

Die Vorlage unterstützt mehr als 20 Gebietsschemas:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### URL-Generierung

Das hreflang-Dienstprogramm folgt dem „nach Bedarf“-Locale-Präfixmuster:
- Das Standardgebietsschema ( `en` ) verwendet den Stammpfad: `https://example.com/page` - Andere Gebietsschemas verwenden vorangestellte Pfade: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Locale-to-Hreflang-Zuordnung

Jedes Gebietsschema wird seinem ISO 639-1-Hreflang-Wert zugeordnet. Die meisten verwenden denselben Code, einige erfordern jedoch eine spezielle Behandlung für regionale Varianten.

## Metadaten auflisten

Dieses Modul befindet sich bei `lib/seo/listing-metadata.ts` und generiert Metadaten für die Auflistung von Seiten, einschließlich Kategorieseiten, Suchergebnissen und gefilterten Ansichten mit entsprechenden Titelvorlagen, Beschreibungen und kanonischen URLs.

## OpenGraph- und Twitter-Karten

Die Vorlage generiert OpenGraph- und Twitter-Card-Metadaten über die Next.js-Metadaten-API in Seitenkomponenten:

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

Die Sitemap befindet sich bei `app/sitemap.ts` und wird automatisch mithilfe der integrierten Sitemap-Unterstützung von Next.js generiert:

- **Statische Seiten** – Startseite, Info, Preise, Kontakt
- **Dynamische Seiten** – Alle veröffentlichten Artikel, Kategorien, Sammlungen
- **Lokalisierte URLs** – Jede Seite generiert Einträge für alle aktiven Gebietsschemas
- **Priorität und Häufigkeit** – Konfiguriert pro Seitentyp

## Robots.txt

Die Roboterkonfiguration befindet sich bei `app/robots.ts` :

- Erlaubt standardmäßig alle Crawler
– Verweist auf die Sitemap-URL
– Blockiert optional die Indizierung von Admin- und API-Routen
- Konfigurierbar über die Umgebung für Staging-/Produktionsunterschiede

## Best Practices

1. **Jede Seite sollte eindeutige Metadaten haben** – Verwenden Sie `generateMetadata()` in Seitenkomponenten
2. **JSON-LD auf Detailseiten einbinden** – Produktschema für Artikel, Organisation für Homepage
3. **Kanonische URLs festlegen** – Verhindern Sie doppelte Inhalte in lokalisierten Versionen
4. **Verwenden Sie das hreflang-Dienstprogramm** – Stellt sicher, dass Suchmaschinen die richtige Sprachversion bereitstellen
5. **Beschreibungen unter 160 Zeichen halten** – Optimal für Suchergebnis-Snippets
