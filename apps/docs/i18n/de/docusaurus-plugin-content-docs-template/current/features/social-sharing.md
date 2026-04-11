---
id: social-sharing
title: Soziales Teilen
sidebar_label: Soziales Teilen
sidebar_position: 22
---

# Social Sharing

Die Vorlage bietet Social-Sharing-Funktionen über eine spezielle Share-Button-Komponente, Open Graph-Bildgenerierung, strukturiertes Daten-Markup und SEO-Metadaten-Dienstprogramme. Zusammen stellen diese Funktionen sicher, dass freigegebene Links auf allen sozialen Plattformen umfassende Vorschauen liefern.

## Architekturübersicht

```
components/item-detail/
  share-button.tsx              -- Share dropdown component

app/
  opengraph-image.tsx           -- Dynamic OG image generation

lib/seo/
  schema.ts                     -- JSON-LD structured data
  listing-metadata.ts           -- Next.js Metadata generation
  hreflang.ts                   -- Hreflang alternate links
```

## Share-Button-Komponente

Das `ShareButton` bei `components/item-detail/share-button.tsx` bietet ein Dropdown-Menü mit Freigabeoptionen für X (Twitter), Facebook, LinkedIn und Kopie in der Zwischenablage:

```tsx
// components/item-detail/share-button.tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

export const ShareButton = ({ url, title }: { url: string; title: string }) => {
  const [isCopying, setIsCopying] = useState(false);
  const t = useTranslations("common");

  const handleShare = async (type: string) => {
    try {
      switch (type) {
        case "copy":
          setIsCopying(true);
          await navigator.clipboard.writeText(url);
          await new Promise(resolve => setTimeout(resolve, 500));
          toast.success(t("LINK_COPIED"));
          setIsCopying(false);
          break;
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            "_blank"
          );
          break;
        case "facebook":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
        case "linkedin":
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
      }
    } catch (error) {
      toast.error(t("SHARE_ERROR"));
      setIsCopying(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="...">
          {/* Share icon */}
          <span>{t("SHARE")}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => handleShare("copy")}>
            Copy Link
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("twitter")}>
            X
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("facebook")}>
            Facebook
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("linkedin")}>
            LinkedIn
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
```

### Teilen Sie URL-Formate

| Plattform | URL-Muster |
|----------|-------------|
| X (Twitter) | `https://twitter.com/intent/tweet?url=...&text=...` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=...` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| Link kopieren | Verbraucht `navigator.clipboard.writeText()` |

### UI-Funktionen
- Basierend auf **Radix UI DropdownMenu** für barrierefreie Tastaturnavigation
- **Ladestatus kopieren**: Zeigt während der Schreibverzögerung in der Zwischenablage einen Spinner an
- **Toast-Benachrichtigungen**: Erfolgs-/Fehlerrückmeldung über `sonner` - **Unterstützung für den dunklen Modus**: Alle Stile umfassen dunkle Varianten
- **i18n**: Alle Labels verwenden `next-intl` Übersetzungen

## Öffnen Sie die Diagrammbildgenerierung

Die `app/opengraph-image.tsx` -Datei generiert dynamische OG-Bilder mit Next.js `ImageResponse` :

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const alt = `${siteConfig.name} - ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const gradient = `linear-gradient(135deg, ${siteConfig.ogImage.gradientStart} 0%, ${siteConfig.ogImage.gradientEnd} 100%)`;

  return new ImageResponse(
    (
      <div style={{ background: gradient, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '80px' }}>
        <div style={{ fontSize: 96, fontWeight: 'bold', color: 'white' }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 36, color: '#e0e0e0', textAlign: 'center' }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

Das OG-Image wird automatisch bei `/opengraph-image.png` bereitgestellt und durch Next.js-Metadaten referenziert.

## SEO-Metadatengenerierung

Das Dienstprogramm `lib/seo/listing-metadata.ts` generiert vollständige Next.js `Metadata` -Objekte, einschließlich Open Graph- und Twitter-Karten-Tags:

```tsx
// lib/seo/listing-metadata.ts
export function generateListingMetadata({
  title,
  description,
  path,
  locale,
  itemCount,
  keywords,
  imageUrl,
}: ListingMetadataOptions): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`;
  const canonicalUrl = `${appUrl}${localePath}${path}`;

  return {
    title: fullTitle,
    description: metaDescription,
    keywords: keywords?.join(', '),
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      type: 'website',
      siteName: siteConfig.name,
      url: canonicalUrl,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: metaDescription,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: generateHreflangAlternates(path),
    },
  };
}
```

## Strukturierte Daten (JSON-LD)

Das `lib/seo/schema.ts` -Modul generiert Schema.org-strukturierte Daten für umfangreiche Suchergebnisse:

### Organisationsschema

```tsx
export function generateOrganizationSchema() {
  const sameAs = [
    siteConfig.social.github,
    siteConfig.social.x,
    siteConfig.social.linkedin,
    siteConfig.social.facebook,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.brandName,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo}`,
    sameAs,
  };
}
```

### Produktschema

```tsx
export function generateProductSchema(input: ProductSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    category: input.category,
    brand: input.brandName
      ? { '@type': 'Brand', name: input.brandName }
      : undefined,
  };
}
```

### Website-Schema mit Suchaktion

```tsx
export function generateWebSiteSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: `${siteConfig.url}${localePrefix}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}${localePrefix}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

### Breadcrumb-Schema

```tsx
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

## Hreflang-Alternativen

Das `lib/seo/hreflang.ts` -Modul generiert alternative Sprachlinks für internationales SEO:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## Verwendung in Artikeldetailseiten

Die Schaltfläche „Teilen“ wird auf Artikeldetailseiten zusammen mit den generierten Metadaten verwendet:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## Dateireferenz

| Datei | Zweck |
|------|---------|
| `components/item-detail/share-button.tsx` | Dropdown-Komponente „Social Share“ |
| `app/opengraph-image.tsx` | Dynamische OG-Bildgenerierung |
| `lib/seo/schema.ts` | Generatoren für strukturierte JSON-LD-Daten |
| `lib/seo/listing-metadata.ts` | Next.js-Metadatengenerierung |
| `lib/seo/hreflang.ts` | Alternative Hreflang-Links |
| `lib/config/client.ts` | Site-Konfiguration (soziale URLs, Branding) |
