---
id: social-sharing
title: Социално споделяне
sidebar_label: Социално споделяне
sidebar_position: 22
---

# Социално споделяне

Шаблонът предоставя възможности за социално споделяне чрез специален компонент на бутона за споделяне, генериране на изображения на Open Graph, маркиране на структурирани данни и помощни програми за метаданни за SEO. Заедно тези функции гарантират, че споделените връзки изобразяват богати визуализации в социалните платформи.

## Преглед на архитектурата

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

## Компонент на бутон за споделяне `ShareButton` на `components/item-detail/share-button.tsx` предоставя падащо меню с опции за споделяне за X (Twitter), Facebook, LinkedIn и копие на клипборда:

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

### Споделяне на URL формати

| Платформа | URL модел |
|----------|-------------|
| X (Twitter) | `https://twitter.com/intent/tweet?url=...&text=...` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=...` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| Копиране на връзка | Използва `navigator.clipboard.writeText()` |

### Функции на потребителския интерфейс
- Изграден върху **Radix UI DropdownMenu** за достъпна навигация с клавиатура
- **Състояние на зареждане на копието**: показва въртящ се бутон по време на забавяне на записа в клипборда
- **Toast notifications**: обратна връзка за успех/грешка чрез `sonner` - **Поддръжка на тъмен режим**: всички стилове включват тъмни варианти
- **i18n**: всички етикети използват `next-intl` превода

## Отворено генериране на графично изображение

Файлът `app/opengraph-image.tsx` генерира динамични OG изображения с помощта на Next.js `ImageResponse` :

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

Изображението на OG автоматично се сервира на `/opengraph-image.png` и се посочва от метаданните на Next.js.

## Генериране на SEO метаданни

Помощната програма `lib/seo/listing-metadata.ts` генерира пълни Next.js `Metadata` обекти, включително маркери на Open Graph и Twitter card:

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

## Структурирани данни (JSON-LD)

Модулът `lib/seo/schema.ts` генерира структурирани данни на Schema.org за богати резултати от търсенето:

### Организационна схема

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

### Продуктова схема

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

### Схема на уеб сайт с действие при търсене

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

### Схема на навигационен път

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

## Алтернативи на Hreflang

Модулът `lib/seo/hreflang.ts` генерира алтернативни езикови връзки за международно SEO:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## Използване в страниците с подробности за артикулите

Бутонът за споделяне се използва на страниците с подробности за артикула заедно с генерираните метаданни:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## Референтен файл

| Файл | Цел |
|------|---------|
| `components/item-detail/share-button.tsx` | Компонент за падащо меню за социални споделяния |
| `app/opengraph-image.tsx` | Генериране на динамично OG изображение |
| `lib/seo/schema.ts` | Генератори на структурирани данни JSON-LD |
| `lib/seo/listing-metadata.ts` | Next.js Генериране на метаданни |
| `lib/seo/hreflang.ts` | Hreflang алтернативни връзки |
| `lib/config/client.ts` | Конфигурация на сайта (социални URL адреси, брандиране) |
