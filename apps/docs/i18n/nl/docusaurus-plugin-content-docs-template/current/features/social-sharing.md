---
id: social-sharing
title: Sociaal delen
sidebar_label: Sociaal delen
sidebar_position: 22
---

# Sociaal delen

De sjabloon biedt mogelijkheden voor sociaal delen via een speciale deelknopcomponent, het genereren van Open Graph-afbeeldingen, gestructureerde gegevensopmaak en hulpprogramma's voor SEO-metagegevens. Samen zorgen deze functies ervoor dat gedeelde links rijke voorbeelden opleveren op sociale platforms.

## Architectuuroverzicht

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

## Deelknopcomponent

De `ShareButton` bij `components/item-detail/share-button.tsx` biedt een vervolgkeuzemenu met deelopties voor X (Twitter), Facebook, LinkedIn en kopiëren naar het klembord:

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

### Deel URL-formaten

| Platform | URL-patroon |
|----------|------------|
| X (Twitter) | `https://twitter.com/intent/tweet?url=...&text=...` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=...` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| Kopieer link | Gebruikt `navigator.clipboard.writeText()` |

### UI-functies
- Gebouwd op **Radix UI DropdownMenu** voor toegankelijke toetsenbordnavigatie
- **Kopie laadstatus**: toont een spinner tijdens de schrijfvertraging naar het klembord
- **Toastmeldingen**: feedback over succes/fout via `sonner` - **Ondersteuning voor donkere modus**: alle stijlen bevatten donkere varianten
- **i18n**: alle labels gebruiken `next-intl` vertalingen

## Open grafiekafbeelding genereren

Het `app/opengraph-image.tsx` -bestand genereert dynamische OG-afbeeldingen met behulp van Next.js `ImageResponse` :

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

De OG-afbeelding wordt automatisch weergegeven op `/opengraph-image.png` en er wordt verwezen naar de metadata van Next.js.

## Genereren van SEO-metagegevens

Het hulpprogramma `lib/seo/listing-metadata.ts` genereert volledige Next.js `Metadata` -objecten, inclusief Open Graph- en Twitter-kaarttags:

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

## Gestructureerde gegevens (JSON-LD)

De `lib/seo/schema.ts` -module genereert gestructureerde gegevens van Schema.org voor rijke zoekresultaten:

### Organisatieschema

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

### Productschema

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

### Websiteschema met zoekactie

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

### Broodkruimelschema

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

## Hreflang-alternatieven

De `lib/seo/hreflang.ts` -module genereert links in alternatieve talen voor internationale SEO:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## Gebruik op itemdetailpagina's

De deelknop wordt gebruikt op itemdetailpagina's naast de gegenereerde metadata:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## Bestandsreferentie

| Bestand | Doel |
|------|---------|
| `components/item-detail/share-button.tsx` | Dropdown-component voor sociaal delen |
| `app/opengraph-image.tsx` | Dynamische generatie van OG-afbeeldingen |
| `lib/seo/schema.ts` | JSON-LD gestructureerde datageneratoren |
| `lib/seo/listing-metadata.ts` | Next.js Generatie van metagegevens |
| `lib/seo/hreflang.ts` | Hreflang alternatieve links |
| `lib/config/client.ts` | Siteconfiguratie (sociale URL's, branding) |
