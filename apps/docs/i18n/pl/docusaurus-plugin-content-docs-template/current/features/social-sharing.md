---
id: social-sharing
title: Udostępnianie społecznościowe
sidebar_label: Udostępnianie społecznościowe
sidebar_position: 22
---

# Udostępnianie społecznościowe

Szablon zapewnia możliwości udostępniania w mediach społecznościowych za pośrednictwem dedykowanego komponentu przycisku udostępniania, generowania obrazów Open Graph, znaczników danych strukturalnych i narzędzi do metadanych SEO. Razem te funkcje zapewniają, że udostępnione linki wyświetlają bogate podglądy na platformach społecznościowych.

## Przegląd architektury

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

## Komponent przycisku udostępniania `ShareButton` na `components/item-detail/share-button.tsx` udostępnia menu rozwijane z opcjami udostępniania dla X (Twitter), Facebooka, LinkedIn i kopii do schowka:

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

### Udostępnij formaty adresów URL

| Platforma | Wzorzec adresu URL |
|--------------|------------|
| X (Twitter) | `https://twitter.com/intent/tweet?url=...&text=...` |
| Facebooka | `https://www.facebook.com/sharer/sharer.php?u=...` |
| Linkedin | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| Kopiuj link | Używa `navigator.clipboard.writeText()` |

### Funkcje interfejsu użytkownika
- Zbudowany na **Radix UI DropdownMenu** dla dostępnej nawigacji za pomocą klawiatury
- **Kopiuj stan ładowania**: pokazuje pokrętło podczas opóźnienia zapisu w schowku
- **Powiadomienia tostowe**: informacja o powodzeniu/błędzie za pośrednictwem `sonner` - **Obsługa trybu ciemnego**: wszystkie style zawierają warianty ciemne
- **i18n**: wszystkie etykiety używają `next-intl` tłumaczeń

## Generowanie obrazu z otwartym wykresem

Plik `app/opengraph-image.tsx` generuje dynamiczne obrazy OG przy użyciu Next.js `ImageResponse` :

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

Obraz OG jest automatycznie wyświetlany w `/opengraph-image.png` i odwołuje się do metadanych Next.js.

## Generowanie metadanych SEO

Narzędzie `lib/seo/listing-metadata.ts` generuje kompletne obiekty `Metadata` Next.js, w tym tagi kart Open Graph i Twitter:

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

## Dane strukturalne (JSON-LD)

Moduł `lib/seo/schema.ts` generuje uporządkowane dane Schema.org dla bogatych wyników wyszukiwania:

### Schemat organizacyjny

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

### Schemat produktu

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

### Schemat witryny internetowej z akcją wyszukiwania

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

### Schemat bułki tartej

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

## Hreflang Zastępuje

Moduł `lib/seo/hreflang.ts` generuje linki w językach alternatywnych dla międzynarodowego SEO:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## Użycie na stronach szczegółów przedmiotu

Przycisk udostępniania jest używany na stronach ze szczegółami elementu obok wygenerowanych metadanych:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## Odniesienie do pliku

| Plik | Cel |
|------|-------------|
| `components/item-detail/share-button.tsx` | Komponent listy rozwijanej udziału społecznościowego |
| `app/opengraph-image.tsx` | Dynamiczne generowanie obrazu OG |
| `lib/seo/schema.ts` | Generatory danych strukturalnych JSON-LD |
| `lib/seo/listing-metadata.ts` | Generowanie metadanych Next.js |
| `lib/seo/hreflang.ts` | Hreflang alternatywne linki |
| `lib/config/client.ts` | Konfiguracja witryny (adresy URL społecznościowe, branding) |
